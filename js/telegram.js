/**
 * TugasIn - Telegram & Deadline Reminder Service
 * Handles Telegram Bot notifications, background deadline watcher, and snooze logic
 */

class TelegramService {
  constructor(store) {
    this.store = store;
    this.sentAlerts = new Set();
    this.initWatcher();
  }

  initWatcher() {
    // Check every 30 seconds
    setInterval(() => this.checkDeadlines(), 30000);
    // Initial check after short delay
    setTimeout(() => this.checkDeadlines(), 3000);
  }

  async sendTelegramMessage(text) {
    const settings = this.store.getSettings();
    if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
      console.warn('Telegram token or chat_id is not configured');
      return { success: false, message: 'Bot Token atau Chat ID belum disetel.' };
    }

    const payload = {
      chat_id: settings.telegram_chat_id,
      text: text,
      parse_mode: 'HTML'
    };

    // First try local PHP proxy (avoids CORS if running on Apache)
    try {
      const res = await fetch('api.php?action=send_telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: settings.telegram_bot_token,
          chat_id: settings.telegram_chat_id,
          text: text
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) return { success: true };
      }
    } catch (e) {
      // PHP proxy might not be reachable if pure static, try direct Telegram API
    }

    // Direct Telegram API fallback
    try {
      const url = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`;
      const directRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await directRes.json();
      if (data.ok) {
        return { success: true };
      } else {
        return { success: false, message: data.description || 'Gagal mengirim pesan Telegram.' };
      }
    } catch (err) {
      console.error('Error sending Telegram message:', err);
      return { success: false, message: err.message };
    }
  }

  async sendTestMessage() {
    const settings = this.store.getSettings();
    if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
      return { success: false, message: 'Harap isi Bot Token dan Chat ID terlebih dahulu!' };
    }

    const message = 
      `<b>🔔 TugasIn Telegram Reminder Connected!</b>\n\n` +
      `Halo! Integrasi pengingat tugas kuliah TugasIn berhasil terhubung.\n` +
      `Anda akan menerima notifikasi otomatis sebelum deadline tiba.\n\n` +
      `<i>Waktu tes: ${new Date().toLocaleString('id-ID')}</i>`;

    return await this.sendTelegramMessage(message);
  }

  checkDeadlines() {
    const tasks = this.store.getTasks();
    const settings = this.store.getSettings();
    const now = Date.now();

    for (const task of tasks) {
      // Don't remind for completed or soft-deleted tasks
      const status = this.store.getStatus(task.status_id);
      if (status && status.apakah_selesai) continue;
      if (!task.deadline) continue;

      const deadlineTime = new Date(task.deadline).getTime();
      const diffMs = deadlineTime - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // 1. Task Overdue Alert
      if (diffMs < 0 && Math.abs(diffMs) < 24 * 3600 * 1000) {
        const alertKey = `overdue_${task.id}`;
        if (!this.sentAlerts.has(alertKey)) {
          this.sentAlerts.add(alertKey);
          this.triggerAlert(task, 'overdue', 'Tugas sudah melewati deadline!');
        }
      }

      // 2. Imminent Deadline (under 2 hours)
      else if (diffHours > 0 && diffHours <= 2) {
        const alertKey = `due_soon_${task.id}`;
        if (!this.sentAlerts.has(alertKey)) {
          this.sentAlerts.add(alertKey);
          const mins = Math.max(1, Math.round(diffMs / (60 * 1000)));
          this.triggerAlert(task, 'warning', `Deadline dalam ${mins} menit!`);
        }
      }

      // 3. Task specific reminders
      if (Array.isArray(task.reminders)) {
        for (const rem of task.reminders) {
          if (rem.sent) continue;
          const targetOffsetHours = Number(rem.offset_hours) || 2;
          if (diffHours > 0 && diffHours <= targetOffsetHours) {
            rem.sent = true;
            this.store.save();
            this.triggerAlert(task, 'reminder', `Pengingat deadline (H-${targetOffsetHours} jam)`);
          }
        }
      }
    }
  }

  triggerAlert(task, type, subtitle) {
    const course = this.store.getCourse(task.course_id);
    const courseName = course ? course.nama : 'Umum';
    const settings = this.store.getSettings();

    // 1. Show In-App Toast Alert
    this.showInAppToast(task, courseName, subtitle);

    // 2. Play subtle chime sound
    this.playChime();

    // 3. Send Telegram Bot notification if enabled
    if (settings.telegram_enabled && settings.telegram_bot_token && settings.telegram_chat_id) {
      const deadlineFormatted = new Date(task.deadline).toLocaleString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const tgMsg =
        `<b>⚠️ PENGINGAT DEADLINE TUGASIN</b>\n\n` +
        `📌 <b>Tugas:</b> ${task.judul}\n` +
        `📚 <b>Mata Kuliah:</b> ${courseName}\n` +
        `⏳ <b>Deadline:</b> ${deadlineFormatted}\n` +
        `🔥 <b>Prioritas:</b> ${task.prioritas}\n` +
        `ℹ️ <i>${subtitle}</i>\n\n` +
        `Buka aplikasi TugasIn untuk mengelola tugas Anda.`;

      this.sendTelegramMessage(tgMsg).catch(console.error);
    }
  }

  showInAppToast(task, courseName, subtitle) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-reminder';
    toast.id = `toast_${task.id}`;

    toast.innerHTML = `
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <span class="mono-label" style="color: var(--color-tertiary); font-weight: 600;">DEADLINE ALERT</span>
          <span class="mono-label">${courseName}</span>
        </div>
        <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">${this.escapeHtml(task.judul)}</div>
        <div style="font-size: 0.8rem; color: var(--color-secondary); margin-bottom: 8px;">${subtitle}</div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-sm btn-primary" onclick="window.telegramService.handleCompleteFromToast('${task.id}')">
            Selesai
          </button>
          <button class="btn btn-sm btn-secondary" onclick="window.telegramService.snoozeTask('${task.id}')">
            Tunda 15 Menit
          </button>
          <button class="btn btn-sm btn-ghost" onclick="this.closest('.toast').remove()">
            Tutup
          </button>
        </div>
      </div>
    `;

    container.appendChild(toast);

    // Auto remove after 20 seconds
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 20000);
  }

  handleCompleteFromToast(taskId) {
    this.store.toggleTaskCompletion(taskId);
    const toast = document.getElementById(`toast_${taskId}`);
    if (toast) toast.remove();
  }

  snoozeTask(taskId) {
    const task = this.store.getTask(taskId);
    if (task && task.deadline) {
      const d = new Date(task.deadline);
      d.setMinutes(d.getMinutes() + 15);
      this.store.updateTask(taskId, { deadline: d.toISOString() });
      // Reset alert for this task so it can fire again after snooze
      this.sentAlerts.delete(`due_soon_${taskId}`);
      this.sentAlerts.delete(`overdue_${taskId}`);
    }
    const toast = document.getElementById(`toast_${taskId}`);
    if (toast) toast.remove();
  }

  playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio might be blocked by browser policy until interaction
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}

window.telegramService = new TelegramService(window.store);
