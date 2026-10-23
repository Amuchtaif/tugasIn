/**
 * TugasIn - Kanban View Component
 * Drag-and-drop kanban board with dynamic status columns, in-column reordering,
 * empty column dropping, and mobile touch support.
 */

class KanbanView {
  constructor(containerId, store) {
    this.container = document.getElementById(containerId);
    this.store = store;
    this.draggedTaskId = null;
    this.preventClick = false;
    this.touchData = null;
    window.kanbanView = this;
  }

  render(tasks) {
    if (!this.container) return;

    const statuses = this.store.getStatuses();
    let html = '<div class="kanban-board">';

    statuses.forEach(status => {
      // Sort tasks by sequential urutan
      const colTasks = (tasks || [])
        .filter(t => t.status_id === status.id)
        .sort((a, b) => (Number(a.urutan) || 0) - (Number(b.urutan) || 0));

      html += `
        <div class="kanban-column" 
             data-status-id="${status.id}"
             ondragover="window.kanbanView.handleDragOver(event)"
             ondrop="window.kanbanView.handleDrop(event, '${status.id}')">
          <div class="kanban-col-header">
            <div class="kanban-col-title">
              <span>${this.escapeHtml(status.nama)}</span>
              <span class="kanban-col-count">${colTasks.length}</span>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="btn btn-ghost btn-icon-sm" onclick="window.app.editStatusPrompt('${status.id}', '${this.escapeHtml(status.nama)}')" title="Ubah Nama Kolom">
                ✎
              </button>
              ${statuses.length > 1 ? `
                <button class="btn btn-ghost btn-icon-sm" onclick="window.app.deleteStatusConfirm('${status.id}')" title="Hapus Kolom">
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

    // Attachments counter
    let attachmentsHtml = '';
    if (task.attachments && task.attachments.length > 0) {
      attachmentsHtml = `<span class="attachment-pill" title="${task.attachments.length} lampiran gambar">🖼️ ${task.attachments.length}</span>`;
    }

    return `
      <div class="kanban-card" 
           draggable="true" 
           data-task-id="${task.id}"
           data-status-id="${task.status_id}"
           ondragstart="window.kanbanView.handleDragStart(event, '${task.id}')"
           ondragend="window.kanbanView.handleDragEnd(event)"
           ontouchstart="window.kanbanView.handleTouchStart(event, '${task.id}')"
           ontouchmove="window.kanbanView.handleTouchMove(event)"
           ontouchend="window.kanbanView.handleTouchEnd(event)"
           ontouchcancel="window.kanbanView.handleTouchCancel(event)"
           onclick="window.kanbanView.handleCardClick(event, '${task.id}')">
        
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
          <div style="display: flex; gap: 4px; align-items: center;">
            ${attachmentsHtml}
            ${subtasksHtml}
          </div>
        </div>
      </div>
    `;
  }

  // Calculate drop position among sibling cards based on clientY
  getDropIndex(listEl, clientY) {
    if (!listEl) return { index: 0, beforeCard: null };
    const cards = Array.from(listEl.querySelectorAll('.kanban-card:not(.dragging)'));
    for (let i = 0; i < cards.length; i++) {
      const box = cards[i].getBoundingClientRect();
      const mid = box.top + box.height / 2;
      if (clientY < mid) {
        return { index: i, beforeCard: cards[i] };
      }
    }
    return { index: cards.length, beforeCard: null };
  }

  updateDropIndicator(listEl, beforeCard) {
    if (!listEl) return;
    let indicator = document.getElementById('kanban-drop-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'kanban-drop-indicator';
      indicator.className = 'kanban-drop-indicator';
    }
    if (beforeCard && beforeCard.parentNode === listEl) {
      listEl.insertBefore(indicator, beforeCard);
    } else {
      listEl.appendChild(indicator);
    }
  }

  removeDropIndicator() {
    const ind = document.getElementById('kanban-drop-indicator');
    if (ind) ind.remove();
  }

  // --- HTML5 Desktop Drag and Drop Handlers ---
  handleDragStart(event, taskId) {
    this.draggedTaskId = taskId;
    this.preventClick = true;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', taskId);
      event.dataTransfer.effectAllowed = 'move';
    }
    const cardEl = event.currentTarget || event.target.closest('.kanban-card');
    if (cardEl) {
      setTimeout(() => cardEl.classList.add('dragging'), 0);
    }
  }

  handleDragEnd(event) {
    const cardEl = event.target.closest('.kanban-card');
    if (cardEl) cardEl.classList.remove('dragging');
    this.draggedTaskId = null;
    this.removeDropIndicator();
    document.querySelectorAll('.kanban-card-list').forEach(el => el.classList.remove('drag-over'));
    // Keep preventClick true briefly so subsequent click event does not open detail modal
    setTimeout(() => {
      this.preventClick = false;
    }, 150);
  }

  handleDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const colEl = event.target.closest('.kanban-column');
    if (!colEl) return;
    const listEl = colEl.querySelector('.kanban-card-list');
    if (!listEl) return;

    document.querySelectorAll('.kanban-card-list').forEach(el => {
      if (el !== listEl) el.classList.remove('drag-over');
    });
    listEl.classList.add('drag-over');

    const { beforeCard } = this.getDropIndex(listEl, event.clientY);
    this.updateDropIndicator(listEl, beforeCard);
  }

  handleDragLeave(event) {
    const colEl = event.target.closest('.kanban-column');
    if (colEl && !colEl.contains(event.relatedTarget)) {
      const listEl = colEl.querySelector('.kanban-card-list');
      if (listEl) listEl.classList.remove('drag-over');
    }
  }

  handleDrop(event, fallbackStatusId) {
    event.preventDefault();
    event.stopPropagation();
    this.removeDropIndicator();
    document.querySelectorAll('.kanban-card-list').forEach(el => el.classList.remove('drag-over'));

    const colEl = event.target.closest('.kanban-column');
    const targetStatusId = (colEl ? colEl.getAttribute('data-status-id') : null) || fallbackStatusId;
    const listEl = colEl ? colEl.querySelector('.kanban-card-list') : null;

    const taskId = (event.dataTransfer && event.dataTransfer.getData('text/plain')) || this.draggedTaskId;

    if (taskId && targetStatusId) {
      const dropIndex = listEl ? this.getDropIndex(listEl, event.clientY).index : 0;
      this.store.reorderTask(taskId, targetStatusId, dropIndex);
    }

    this.draggedTaskId = null;
    setTimeout(() => {
      this.preventClick = false;
    }, 150);
  }

  handleCardClick(event, taskId) {
    if (this.preventClick) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    window.app.openTaskDetail(taskId);
  }

  // --- Mobile Touch Drag and Drop Handlers ---
  handleTouchStart(event, taskId) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    const cardEl = event.currentTarget || event.target.closest('.kanban-card');
    this.touchData = {
      taskId,
      cardEl,
      startX: touch.clientX,
      startY: touch.clientY,
      isDragging: false,
      clone: null
    };
  }

  handleTouchMove(event) {
    if (!this.touchData) return;
    const touch = event.touches[0];
    const dx = touch.clientX - this.touchData.startX;
    const dy = touch.clientY - this.touchData.startY;

    // 8px movement threshold to activate touch drag
    if (!this.touchData.isDragging && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      this.touchData.isDragging = true;
      this.preventClick = true;
      this.touchData.cardEl.classList.add('dragging');

      // Create floating touch ghost element
      const rect = this.touchData.cardEl.getBoundingClientRect();
      const clone = this.touchData.cardEl.cloneNode(true);
      clone.id = 'touch-drag-clone';
      clone.style.position = 'fixed';
      clone.style.width = `${rect.width}px`;
      clone.style.left = `${touch.clientX - rect.width / 2}px`;
      clone.style.top = `${touch.clientY - 30}px`;
      clone.style.zIndex = '10000';
      clone.style.pointerEvents = 'none';
      clone.style.opacity = '0.92';
      clone.style.transform = 'scale(1.03) rotate(2deg)';
      clone.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.22)';
      document.body.appendChild(clone);
      this.touchData.clone = clone;
    }

    if (this.touchData.isDragging) {
      // Prevent browser scroll while dragging
      if (event.cancelable) event.preventDefault();

      if (this.touchData.clone) {
        const rect = this.touchData.cardEl.getBoundingClientRect();
        this.touchData.clone.style.left = `${touch.clientX - rect.width / 2}px`;
        this.touchData.clone.style.top = `${touch.clientY - 30}px`;
      }

      // Detect drop target column under finger
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const column = targetEl?.closest('.kanban-column');
      document.querySelectorAll('.kanban-card-list').forEach(l => l.classList.remove('drag-over'));
      if (column) {
        const list = column.querySelector('.kanban-card-list');
        if (list) {
          list.classList.add('drag-over');
          const { beforeCard } = this.getDropIndex(list, touch.clientY);
          this.updateDropIndicator(list, beforeCard);
        }
      }
    }
  }

  handleTouchEnd(event) {
    if (!this.touchData) return;

    if (this.touchData.isDragging) {
      const touch = event.changedTouches[0];
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const column = targetEl?.closest('.kanban-column');
      if (column) {
        const statusId = column.getAttribute('data-status-id');
        const list = column.querySelector('.kanban-card-list');
        const dropIndex = list ? this.getDropIndex(list, touch.clientY).index : 0;
        this.store.reorderTask(this.touchData.taskId, statusId, dropIndex);
      }
    }

    if (this.touchData.clone) this.touchData.clone.remove();
    if (this.touchData.cardEl) this.touchData.cardEl.classList.remove('dragging');
    this.removeDropIndicator();
    document.querySelectorAll('.kanban-card-list').forEach(l => l.classList.remove('drag-over'));
    this.touchData = null;

    setTimeout(() => {
      this.preventClick = false;
    }, 200);
  }

  handleTouchCancel() {
    if (this.touchData) {
      if (this.touchData.clone) this.touchData.clone.remove();
      if (this.touchData.cardEl) this.touchData.cardEl.classList.remove('dragging');
      this.removeDropIndicator();
      document.querySelectorAll('.kanban-card-list').forEach(l => l.classList.remove('drag-over'));
      this.touchData = null;
    }
    this.preventClick = false;
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.KanbanView = KanbanView;
