/**
 * TugasIn - Calendar View Component
 * Month & Week calendar grid with deadline scheduling and drag-and-drop
 */

class CalendarView {
  constructor(containerId, store) {
    this.container = document.getElementById(containerId);
    this.store = store;
    this.currentDate = new Date();
    this.viewMode = 'month'; // 'month' or 'week'
    this.draggedTaskId = null;
    window.calendarView = this;
  }

  prev() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    }
    window.app.renderCurrentView();
  }

  next() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    }
    window.app.renderCurrentView();
  }

  today() {
    this.currentDate = new Date();
    window.app.renderCurrentView();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    window.app.renderCurrentView();
  }

  render(tasks) {
    if (!this.container) return;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const currentYear = this.currentDate.getFullYear();
    const currentMonth = this.currentDate.getMonth();
    const title = `${monthNames[currentMonth]} ${currentYear}`;

    let html = `
      <div class="calendar-view-container">
        <div class="calendar-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="calendar-month-title">${title}</div>
            <div class="calendar-nav-controls" style="display: flex; align-items: center; gap: 4px;">
              <button class="btn btn-secondary btn-icon-sm" onclick="window.calendarView.prev()" title="Bulan Sebelumnya">◀</button>
              <button class="btn btn-secondary btn-sm" onclick="window.calendarView.today()">Hari Ini</button>
              <button class="btn btn-secondary btn-icon-sm" onclick="window.calendarView.next()" title="Bulan Selanjutnya">▶</button>
            </div>
          </div>
          <div class="view-tabs">
            <button class="tab-btn ${this.viewMode === 'month' ? 'active' : ''}" onclick="window.calendarView.setViewMode('month')">Bulan</button>
            <button class="tab-btn ${this.viewMode === 'week' ? 'active' : ''}" onclick="window.calendarView.setViewMode('week')">Minggu</button>
          </div>
        </div>

        <div class="calendar-grid">
    `;

    // Weekday headers
    const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    weekdays.forEach(day => {
      html += `<div class="calendar-weekday-header">${day}</div>`;
    });

    if (this.viewMode === 'month') {
      html += this.renderMonthGrid(tasks, currentYear, currentMonth);
    } else {
      html += this.renderWeekGrid(tasks);
    }

    html += `
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  renderMonthGrid(tasks, year, month) {
    let html = '';
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    // Adjust so 0 is Monday
    const startOffset = (firstDayIndex === 0 ? 6 : firstDayIndex - 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Previous month padding days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = this.formatDateISO(prevDate);
      html += this.renderDayCell(dateStr, dayNum, true, false, tasks);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const curDate = new Date(year, month, day);
      const dateStr = this.formatDateISO(curDate);
      const isToday = dateStr === todayStr;
      html += this.renderDayCell(dateStr, day, false, isToday, tasks);
    }

    // Next month padding days to complete 35 or 42 grid cells
    const totalRendered = startOffset + daysInMonth;
    const remaining = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month + 1, day);
      const dateStr = this.formatDateISO(nextDate);
      html += this.renderDayCell(dateStr, day, true, false, tasks);
    }

    return html;
  }

  renderWeekGrid(tasks) {
    let html = '';
    const curr = new Date(this.currentDate);
    // Find Monday of current week
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 7; i++) {
      const cellDate = new Date(monday);
      cellDate.setDate(monday.getDate() + i);
      const dateStr = this.formatDateISO(cellDate);
      const isToday = dateStr === todayStr;
      html += this.renderDayCell(dateStr, cellDate.getDate(), false, isToday, tasks, true);
    }

    return html;
  }

  renderDayCell(dateStr, dayNum, isOtherMonth, isToday, tasks, isWeekView = false) {
    const dayTasks = tasks.filter(t => {
      if (!t.deadline) return false;
      return t.deadline.startsWith(dateStr);
    });

    let chipsHtml = '';
    dayTasks.forEach(task => {
      const course = this.store.getCourse(task.course_id);
      const isOverdue = this.store.isTaskOverdue(task);
      const status = this.store.getStatus(task.status_id);
      const isCompleted = status ? status.apakah_selesai : false;
      const borderCol = course ? course.warna : 'var(--color-border)';

      chipsHtml += `
        <div class="calendar-task-chip ${isOverdue ? 'overdue' : ''} ${isCompleted ? 'completed' : ''}"
             draggable="true"
             style="border-left: 3px solid ${borderCol}"
             ondragstart="window.calendarView.handleDragStart(event, '${task.id}')"
             onclick="event.stopPropagation(); window.app.openTaskDetail('${task.id}')"
             title="${this.escapeHtml(task.judul)} (${course ? course.nama : ''})">
          <span>${this.escapeHtml(task.judul)}</span>
        </div>
      `;
    });

    return `
      <div class="calendar-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''}"
           style="${isWeekView ? 'min-height: 380px;' : ''}"
           data-date="${dateStr}"
           onclick="window.app.openQuickAddModalWithDate('${dateStr}')"
           ondragover="window.calendarView.handleDragOver(event)"
           ondragleave="window.calendarView.handleDragLeave(event)"
           ondrop="window.calendarView.handleDrop(event, '${dateStr}')">
        <div class="calendar-day-num">${dayNum}</div>
        <div class="calendar-task-chips">${chipsHtml}</div>
      </div>
    `;
  }

  handleDragStart(event, taskId) {
    this.draggedTaskId = taskId;
    event.dataTransfer.setData('text/plain', taskId);
    event.dataTransfer.effectAllowed = 'move';
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const cell = event.target.closest('.calendar-day-cell');
    if (cell) {
      cell.style.backgroundColor = 'var(--color-surface-elevated)';
    }
  }

  handleDragLeave(event) {
    const cell = event.target.closest('.calendar-day-cell');
    if (cell) {
      cell.style.backgroundColor = '';
    }
  }

  handleDrop(event, targetDateStr) {
    event.preventDefault();
    const cell = event.target.closest('.calendar-day-cell');
    if (cell) cell.style.backgroundColor = '';

    const taskId = event.dataTransfer.getData('text/plain') || this.draggedTaskId;
    if (taskId && targetDateStr) {
      const task = this.store.getTask(taskId);
      if (task) {
        // Keep existing hour/minute or default to 23:59
        let hour = '23';
        let minute = '59';
        if (task.deadline) {
          const d = new Date(task.deadline);
          hour = String(d.getHours()).padStart(2, '0');
          minute = String(d.getMinutes()).padStart(2, '0');
        }
        const newDeadline = new Date(`${targetDateStr}T${hour}:${minute}:00`).toISOString();
        this.store.updateTask(taskId, { deadline: newDeadline });
      }
    }
  }

  formatDateISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.CalendarView = CalendarView;
