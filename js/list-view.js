/**
 * TugasIn - List View Component
 * Notion-like grouped table view for tasks
 */

class ListView {
  constructor(containerId, store) {
    this.container = document.getElementById(containerId);
    this.store = store;
  }

  render(tasks, groupBy = 'status') {
    if (!this.container) return;

    if (!tasks || tasks.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✓</div>
          <div class="h2">Tidak ada tugas</div>
          <p class="mono-label">Semua tugas selesai atau tidak ada yang sesuai filter.</p>
          <button class="btn btn-primary" onclick="window.app.openQuickAddModal()">+ Buat Task Baru</button>
        </div>
      `;
      return;
    }

    let groups = {};
    if (groupBy === 'status') {
      const statuses = this.store.getStatuses();
      statuses.forEach(s => groups[s.id] = { title: s.nama, isDone: s.apakah_selesai, items: [] });
      tasks.forEach(t => {
        if (groups[t.status_id]) {
          groups[t.status_id].items.push(t);
        } else {
          if (!groups['other']) groups['other'] = { title: 'Lainnya', isDone: false, items: [] };
          groups['other'].items.push(t);
        }
      });
    } else if (groupBy === 'course') {
      const courses = this.store.getCourses();
      courses.forEach(c => groups[c.id] = { title: `${c.kode} - ${c.nama}`, items: [] });
      if (!groups['no_course']) groups['no_course'] = { title: 'Tanpa Mata Kuliah', items: [] };
      tasks.forEach(t => {
        if (groups[t.course_id]) {
          groups[t.course_id].items.push(t);
        } else {
          groups['no_course'].items.push(t);
        }
      });
    } else if (groupBy === 'priority') {
      const priorities = ['Mendesak', 'Tinggi', 'Sedang', 'Rendah'];
      priorities.forEach(p => groups[p] = { title: `Prioritas ${p}`, items: [] });
      tasks.forEach(t => {
        const p = t.prioritas || 'Sedang';
        if (!groups[p]) groups[p] = { title: `Prioritas ${p}`, items: [] };
        groups[p].items.push(t);
      });
    }

    let html = '<div class="list-view-container">';

    for (const [key, group] of Object.entries(groups)) {
      if (group.items.length === 0 && groupBy !== 'status') continue;

      html += `
        <div class="list-group">
          <div class="list-group-header">
            <div class="list-group-title">
              <span>${this.escapeHtml(group.title)}</span>
              <span class="nav-counter">${group.items.length}</span>
            </div>
          </div>
          <table class="task-table">
            <tbody>
      `;

      if (group.items.length === 0) {
        html += `
          <tr class="task-row">
            <td colspan="5" style="text-align: center; color: var(--color-muted); padding: 16px;">
              Belum ada tugas di kategori ini
            </td>
          </tr>
        `;
      } else {
        group.items.forEach(task => {
          html += this.renderTaskRow(task);
        });
      }

      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    html += '</div>';
    this.container.innerHTML = html;
  }

  renderTaskRow(task) {
    const course = this.store.getCourse(task.course_id);
    const status = this.store.getStatus(task.status_id);
    const isCompleted = status ? status.apakah_selesai : false;
    const isOverdue = this.store.isTaskOverdue(task);

    // Format deadline
    let deadlineHtml = '-';
    if (task.deadline) {
      const d = new Date(task.deadline);
      const isToday = d.toDateString() === new Date().toDateString();
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      let label = isToday ? `Hari ini, ${timeStr}` : `${dateStr}, ${timeStr}`;
      if (isOverdue) label += ' (Terlambat)';

      deadlineHtml = `
        <span class="deadline-cell ${isOverdue ? 'overdue' : ''}">
          ${label}
        </span>
      `;
    }

    // Subtasks counter
    let subtasksHtml = '';
    if (task.subtasks && task.subtasks.length > 0) {
      const total = task.subtasks.length;
      const completed = task.subtasks.filter(s => s.selesai).length;
      subtasksHtml = `
        <span class="subtask-counter-pill" title="Subtask ${completed}/${total} selesai">
          ✓ ${completed}/${total}
        </span>
      `;
    }

    // Priority class
    const prio = (task.prioritas || 'sedang').toLowerCase();
    const prioClass = `priority-${prio}`;

    // Tags
    let tagsHtml = '';
    if (task.tags && task.tags.length > 0) {
      tagsHtml = task.tags.map(t => `<span class="mono-label" style="background-color: var(--color-surface-hover); padding: 2px 6px; border-radius: 4px;">#${this.escapeHtml(t)}</span>`).join(' ');
    }

    return `
      <tr class="task-row" data-id="${task.id}">
        <td class="task-checkbox-col">
          <div class="custom-checkbox ${isCompleted ? 'checked' : ''}" 
               onclick="window.app.toggleTaskCompletion('${task.id}')"
               title="${isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}">
            ${isCompleted ? '✓' : ''}
          </div>
        </td>
        <td class="task-title-cell" onclick="window.app.openTaskDetail('${task.id}')">
          <div class="task-title-text ${isCompleted ? 'completed' : ''}">
            ${this.escapeHtml(task.judul)}
            ${subtasksHtml}
          </div>
          <div class="task-meta-preview">
            ${tagsHtml}
          </div>
        </td>
        <td style="width: 180px;">
          ${course ? `
            <span class="course-badge" style="border-left: 2px solid ${course.warna || 'var(--color-border)'}">
              ${this.escapeHtml(course.kode)} · ${this.escapeHtml(course.nama.length > 18 ? course.nama.substring(0, 16) + '...' : course.nama)}
            </span>
          ` : '<span class="mono-label" style="color: var(--color-muted);">-</span>'}
        </td>
        <td style="width: 130px;">
          <span class="priority-badge ${prioClass}">
            <span class="priority-dot"></span>
            ${task.prioritas || 'Sedang'}
          </span>
        </td>
        <td style="width: 170px;">
          ${deadlineHtml}
        </td>
        <td style="width: 80px; text-align: right;">
          <button class="btn btn-ghost btn-sm" onclick="window.app.openTaskDetail('${task.id}')" title="Edit">
            ✎
          </button>
          <button class="btn btn-ghost btn-sm" onclick="window.app.deleteTask('${task.id}')" title="Hapus ke Sampah">
            🗑
          </button>
        </td>
      </tr>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.ListView = ListView;
