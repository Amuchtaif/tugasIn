/**
 * TugasIn - List View Component
 * Notion-like grouped table view for tasks
 */

class ListView {
  constructor(containerId, store) {
    this.container = document.getElementById(containerId);
    this.store = store;
    window.listView = this;
  }

  render(tasks, groupBy = 'status') {
    if (!this.container) return;

    if (!tasks || tasks.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-clipboard-check"></i></div>
          <div class="h2">Tidak ada tugas</div>
          <p class="mono-label">Semua tugas selesai atau tidak ada yang sesuai filter.</p>
          <button class="btn btn-primary" onclick="window.app.openQuickAddModal()"><i class="fa-solid fa-plus"></i> Buat Task Baru</button>
        </div>
      `;
      return;
    }

    let groups = {};
    if (groupBy === 'status') {
      // Group by canonical status columns for clean unified presentation
      groups = {
        'todo': { title: 'Belum Mulai', isDone: false, items: [] },
        'prog': { title: 'Sedang Dikerjakan / Dikerjakan', isDone: false, items: [] },
        'rev':  { title: 'Butuh Review / Review', isDone: false, items: [] },
        'done': { title: 'Selesai', isDone: true, items: [] }
      };
      tasks.forEach(t => {
        const st = this.store.getStatus(t.status_id);
        const stName = st ? st.nama.toLowerCase() : '';
        const isDone = st ? st.apakah_selesai : false;
        if (isDone) {
          groups['done'].items.push(t);
        } else if (stName.includes('kerja') || stName.includes('prog') || stName.includes('doing')) {
          groups['prog'].items.push(t);
        } else if (stName.includes('rev') || stName.includes('tinjau')) {
          groups['rev'].items.push(t);
        } else {
          groups['todo'].items.push(t);
        }
      });
    } else if (groupBy === 'course') {
      const courses = this.store.getCourses();
      courses.forEach(c => groups['crs_' + c.id] = { title: `${c.kode} - ${c.nama}`, items: [] });
      const projects = this.store.getProjects ? this.store.getProjects() : [];
      projects.forEach(p => groups['prj_' + p.id] = { title: `Proyek: ${p.nama}`, items: [] });
      if (!groups['other']) groups['other'] = { title: 'Lainnya', items: [] };
      tasks.forEach(t => {
        if (t.course_id && groups['crs_' + t.course_id]) {
          groups['crs_' + t.course_id].items.push(t);
        } else if (t.project_id && groups['prj_' + t.project_id]) {
          groups['prj_' + t.project_id].items.push(t);
        } else {
          groups['other'].items.push(t);
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
            <td colspan="6" style="text-align: center; color: var(--color-muted); padding: 16px;">
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
    const course = task.course_id ? this.store.getCourse(task.course_id) : null;
    const project = task.project_id ? this.store.getProject(task.project_id) : null;
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
          <i class="fa-solid fa-list-check" style="font-size: 0.72rem;"></i> ${completed}/${total}
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

    // Attachments counter
    let attachmentsHtml = '';
    if (task.attachments && task.attachments.length > 0) {
      attachmentsHtml = `
        <span class="attachment-pill" title="${task.attachments.length} lampiran gambar">
          <i class="fa-solid fa-image" style="font-size: 0.72rem;"></i> ${task.attachments.length}
        </span>
      `;
    }

    return `
      <tr class="task-row" data-id="${task.id}">
        <td class="task-checkbox-col">
          <div class="custom-checkbox ${isCompleted ? 'checked' : ''}" 
               onclick="window.app.toggleTaskCompletion('${task.id}')"
               title="${isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}">
            ${isCompleted ? '<i class="fa-solid fa-check"></i>' : ''}
          </div>
        </td>
        <td class="task-title-cell" onclick="window.app.openTaskDetail('${task.id}')">
          <div class="task-title-text ${isCompleted ? 'completed' : ''}">
            ${this.escapeHtml(task.judul)}
            ${attachmentsHtml}
            ${subtasksHtml}
          </div>
          <div class="task-meta-preview">
            ${tagsHtml}
          </div>
        </td>
        <td class="task-course-col">
          ${course ? `
            <span class="course-badge" style="border-left: 2px solid ${course.warna || 'var(--color-border)'}">
              <i class="fa-solid fa-${course.ikon || 'book'}" style="font-size: 0.72rem; margin-right: 4px;"></i>
              ${this.escapeHtml(course.kode)} · ${this.escapeHtml(course.nama.length > 18 ? course.nama.substring(0, 16) + '...' : course.nama)}
            </span>
          ` : (project ? `
            <span class="project-badge" style="border-left: 2px solid #2563EB; background: rgba(37, 99, 235, 0.08); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; color: #2563EB; display: inline-flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-rocket" style="font-size: 0.7rem;"></i>
              ${this.escapeHtml(project.nama.length > 18 ? project.nama.substring(0, 16) + '...' : project.nama)}
            </span>
          ` : '<span class="mono-label" style="color: var(--color-muted);">-</span>')}
        </td>
        <td class="task-priority-col">
          <span class="priority-badge ${prioClass}">
            <span class="priority-dot"></span>
            ${task.prioritas || 'Sedang'}
          </span>
        </td>
        <td class="task-deadline-col">
          ${deadlineHtml}
        </td>
        <td class="task-actions-col">
          <button class="btn btn-ghost btn-icon-sm" onclick="window.app.openTaskDetail('${task.id}')" title="Edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-ghost btn-icon-sm" onclick="window.app.deleteTask('${task.id}')" title="Hapus ke Sampah">
            <i class="fa-solid fa-trash-can"></i>
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
