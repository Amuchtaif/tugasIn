/**
 * TugasIn - Kanban View Component
 * Drag-and-drop kanban board with dynamic status columns
 */

class KanbanView {
  constructor(containerId, store) {
    this.container = document.getElementById(containerId);
    this.store = store;
    this.draggedTaskId = null;
  }

  render(tasks) {
    if (!this.container) return;

    const statuses = this.store.getStatuses();
    let html = '<div class="kanban-board">';

    statuses.forEach(status => {
      const colTasks = tasks.filter(t => t.status_id === status.id);

      html += `
        <div class="kanban-column" data-status-id="${status.id}">
          <div class="kanban-col-header">
            <div class="kanban-col-title">
              <span>${this.escapeHtml(status.nama)}</span>
              <span class="kanban-col-count">${colTasks.length}</span>
            </div>
            <div style="display: flex; gap: 2px;">
              <button class="btn btn-ghost btn-sm" onclick="window.app.editStatusPrompt('${status.id}', '${this.escapeHtml(status.nama)}')" title="Ubah Nama Kolom">
                ✎
              </button>
              ${statuses.length > 1 ? `
                <button class="btn btn-ghost btn-sm" onclick="window.app.deleteStatusConfirm('${status.id}')" title="Hapus Kolom">
                  ✕
                </button>
              ` : ''}
            </div>
          </div>

          <div class="kanban-card-list" 
               data-status-id="${status.id}"
               ondragover="window.kanbanView.handleDragOver(event)"
               ondragleave="window.kanbanView.handleDragLeave(event)"
               ondrop="window.kanbanView.handleDrop(event, '${status.id}')">
      `;

      colTasks.forEach(task => {
        html += this.renderCard(task);
      });

      html += `
          </div>
          <button class="kanban-add-card-btn" onclick="window.app.openQuickAddModalWithStatus('${status.id}')">
            + Tambah task di sini
          </button>
        </div>
      `;
    });

    // Add new status column button
    html += `
      <button class="kanban-add-col-btn" onclick="window.app.addNewStatusPrompt()">
        + Tambah Kolom Status
      </button>
    `;

    html += '</div>';
    this.container.innerHTML = html;
  }

  renderCard(task) {
    const course = this.store.getCourse(task.course_id);
    const isOverdue = this.store.isTaskOverdue(task);
    const status = this.store.getStatus(task.status_id);
    const isCompleted = status ? status.apakah_selesai : false;

    // Subtasks counter
    let subtasksHtml = '';
    if (task.subtasks && task.subtasks.length > 0) {
      const total = task.subtasks.length;
      const completed = task.subtasks.filter(s => s.selesai).length;
      subtasksHtml = `<span class="subtask-counter-pill">✓ ${completed}/${total}</span>`;
    }

    // Deadline
    let deadlineHtml = '';
    if (task.deadline) {
      const d = new Date(task.deadline);
      const isToday = d.toDateString() === new Date().toDateString();
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const label = isToday ? `Hari ini ${timeStr}` : `${dateStr} ${timeStr}`;

      deadlineHtml = `
        <span class="mono-label ${isOverdue ? 'overdue' : ''}" style="${isOverdue ? 'color: var(--color-danger); font-weight: 600;' : ''}">
          ⏳ ${label}
        </span>
      `;
    }

    const prio = (task.prioritas || 'sedang').toLowerCase();
    const prioClass = `priority-${prio}`;

    return `
      <div class="kanban-card" 
           draggable="true" 
           data-task-id="${task.id}"
           ondragstart="window.kanbanView.handleDragStart(event, '${task.id}')"
           ondragend="window.kanbanView.handleDragEnd(event)"
           onclick="window.app.openTaskDetail('${task.id}')">
        
        <div class="kanban-card-header">
          ${course ? `
            <span class="course-badge" style="border-left: 2px solid ${course.warna || 'var(--color-border)'}">
              ${this.escapeHtml(course.kode)}
            </span>
          ` : '<span class="mono-label">Umum</span>'}

          <span class="priority-badge ${prioClass}">
            <span class="priority-dot"></span>
            ${task.prioritas || 'Sedang'}
          </span>
        </div>

        <div class="kanban-card-title ${isCompleted ? 'completed' : ''}">
          ${this.escapeHtml(task.judul)}
        </div>

        <div class="kanban-card-footer">
          <div>${deadlineHtml}</div>
          <div>${subtasksHtml}</div>
        </div>
      </div>
    `;
  }

  handleDragStart(event, taskId) {
    this.draggedTaskId = taskId;
    event.dataTransfer.setData('text/plain', taskId);
    event.dataTransfer.effectAllowed = 'move';
    const cardEl = event.target.closest('.kanban-card');
    if (cardEl) {
      setTimeout(() => cardEl.classList.add('dragging'), 0);
    }
  }

  handleDragEnd(event) {
    const cardEl = event.target.closest('.kanban-card');
    if (cardEl) cardEl.classList.remove('dragging');
    this.draggedTaskId = null;
    document.querySelectorAll('.kanban-card-list').forEach(el => el.classList.remove('drag-over'));
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const listEl = event.target.closest('.kanban-card-list');
    if (listEl) {
      listEl.classList.add('drag-over');
    }
  }

  handleDragLeave(event) {
    const listEl = event.target.closest('.kanban-card-list');
    if (listEl && !listEl.contains(event.relatedTarget)) {
      listEl.classList.remove('drag-over');
    }
  }

  handleDrop(event, targetStatusId) {
    event.preventDefault();
    const listEl = event.target.closest('.kanban-card-list');
    if (listEl) listEl.classList.remove('drag-over');

    const taskId = event.dataTransfer.getData('text/plain') || this.draggedTaskId;
    if (taskId && targetStatusId) {
      const task = this.store.getTask(taskId);
      if (task && task.status_id !== targetStatusId) {
        this.store.updateTask(taskId, { status_id: targetStatusId });
      }
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.KanbanView = KanbanView;
