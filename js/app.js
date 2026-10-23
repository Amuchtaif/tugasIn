/**
 * TugasIn - Main Application Orchestrator
 * Coordinates routing, modals, views, keyboard shortcuts, and state syncing
 */

class App {
  constructor() {
    this.store = window.store;
    this.currentView = 'today'; // 'today', 'all', 'course', 'project', 'archive', 'trash', 'settings'
    this.activeCourseId = null;
    this.activeProjectId = null;
    this.viewMode = 'list'; // 'list', 'kanban', 'calendar'
    this.searchQuery = '';
    this.filterPriority = '';
    this.filterStatus = '';

    this.listView = new ListView('view-body', this.store);
    this.kanbanView = new KanbanView('view-body', this.store);
    this.calendarView = new CalendarView('view-body', this.store);

    this.activeEditingTaskId = null;
    this.init();
  }

  init() {
    // Subscribe to store updates
    this.store.subscribe(() => {
      this.renderSidebar();
      this.renderTopStats();
      this.renderCurrentView();
    });

    this.bindEvents();
    this.renderSidebar();
    this.renderTopStats();
    this.renderCurrentView();
  }

  bindEvents() {
    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input/textarea
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        if (e.key === 'Escape') {
          this.closeAllModals();
        }
        return;
      }

      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        this.openQuickAddModal();
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search');
        if (searchInput) searchInput.focus();
      } else if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Global Search
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderCurrentView();
      });
    }

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }

  // --- NAVIGATION ROUTING ---
  navigateTo(view, meta = {}) {
    this.currentView = view;
    if (view === 'course') {
      this.activeCourseId = meta.courseId || null;
    } else {
      this.activeCourseId = null;
    }

    if (view === 'project') {
      this.activeProjectId = meta.projectId || null;
    } else {
      this.activeProjectId = null;
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    this.renderSidebar();
    this.renderCurrentView();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    // Update toolbar tab buttons
    document.querySelectorAll('.view-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    this.renderCurrentView();
  }

  // --- RENDER SIDEBAR ---
  renderSidebar() {
    const semesters = this.store.getSemesters(false);
    const activeTasks = this.store.getTasks();
    const todayTasks = this.store.getTasks({ dueTodayOnly: true });
    const trashTasks = this.store.getTasks({ trashOnly: true });

    // Update counters
    const todayCountEl = document.getElementById('side-count-today');
    if (todayCountEl) todayCountEl.textContent = todayTasks.length;

    const allCountEl = document.getElementById('side-count-all');
    if (allCountEl) allCountEl.textContent = activeTasks.length;

    const trashCountEl = document.getElementById('side-count-trash');
    if (trashCountEl) trashCountEl.textContent = trashTasks.length;

    // Highlight active nav items
    document.querySelectorAll('.sidebar-nav-item').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.view === this.currentView && !this.activeCourseId) {
        el.classList.add('active');
      }
    });

    // Render Semesters & Courses Tree
    const treeContainer = document.getElementById('semester-tree-container');
    if (!treeContainer) return;

    let treeHtml = '';
    semesters.forEach(sem => {
      const courses = this.store.getCourses(sem.id);
      treeHtml += `
        <div class="semester-block">
          <div class="semester-header" onclick="window.app.toggleSemesterCollapse('${sem.id}')">
            <div class="semester-title">
              <span style="color: ${sem.warna || 'var(--color-primary)'}">◆</span>
              <span>${this.escapeHtml(sem.nama)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window.app.openSemesterModal('${sem.id}')" title="Pengaturan Semester">
                ⚙
              </button>
            </div>
          </div>
          <div class="semester-courses" id="courses_of_${sem.id}">
      `;

      courses.forEach(course => {
        const courseTasks = activeTasks.filter(t => t.course_id === course.id);
        const isActive = this.currentView === 'course' && this.activeCourseId === course.id;

        treeHtml += `
          <div class="course-item ${isActive ? 'active' : ''}" onclick="window.app.navigateTo('course', { courseId: '${course.id}' })">
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <span style="color: ${course.warna || 'var(--color-secondary)'}">●</span>
              <span class="course-code-tag">${this.escapeHtml(course.kode)}</span>
              <span>${this.escapeHtml(course.nama)}</span>
            </div>
            <span class="nav-counter">${courseTasks.length}</span>
          </div>
        `;
      });

      treeHtml += `
            <button class="btn btn-ghost btn-sm" style="width: 100%; justify-content: flex-start; margin-top: 4px; color: var(--color-muted);" onclick="window.app.openCourseModal(null, '${sem.id}')">
              + Mata Kuliah
            </button>
          </div>
        </div>
      `;
    });

    treeContainer.innerHTML = treeHtml;
  }

  toggleSemesterCollapse(semId) {
    const el = document.getElementById(`courses_of_${semId}`);
    if (el) {
      el.style.display = el.style.display === 'none' ? 'flex' : 'none';
    }
  }

  // --- RENDER TOP STATS ---
  renderTopStats() {
    const all = this.store.getTasks();
    const today = this.store.getTasks({ dueTodayOnly: true });
    const overdue = all.filter(t => this.store.isTaskOverdue(t));
    const inProgressStatus = this.store.getStatuses().find(s => s.nama.toLowerCase().includes('kerja') || s.nama.toLowerCase().includes('progress'));
    const inProgCount = inProgressStatus ? all.filter(t => t.status_id === inProgressStatus.id).length : 0;

    const statTodayEl = document.getElementById('stat-today-count');
    if (statTodayEl) statTodayEl.textContent = today.length;

    const statOverdueEl = document.getElementById('stat-overdue-count');
    if (statOverdueEl) statOverdueEl.textContent = overdue.length;

    const statInProgEl = document.getElementById('stat-inprog-count');
    if (statInProgEl) statInProgEl.textContent = inProgCount;
  }

  // --- RENDER CURRENT VIEW ---
  renderCurrentView() {
    const titleEl = document.getElementById('breadcrumb-title');
    const subtitleEl = document.getElementById('breadcrumb-parent');
    const toolbar = document.querySelector('.view-toolbar');

    // Filter tasks based on route
    let filterOptions = {
      searchQuery: this.searchQuery,
      priority: this.filterPriority,
      statusId: this.filterStatus
    };

    if (this.currentView === 'today') {
      if (titleEl) titleEl.textContent = 'Hari Ini & Minggu Ini';
      if (subtitleEl) subtitleEl.textContent = 'Tugas Aktif';
      if (toolbar) toolbar.style.display = 'flex';
      filterOptions.dueThisWeekOnly = true;
      const tasks = this.store.getTasks(filterOptions);
      this.renderViewContainer(tasks);

    } else if (this.currentView === 'all') {
      if (titleEl) titleEl.textContent = 'Semua Tugas';
      if (subtitleEl) subtitleEl.textContent = 'Seluruh Mata Kuliah';
      if (toolbar) toolbar.style.display = 'flex';
      const tasks = this.store.getTasks(filterOptions);
      this.renderViewContainer(tasks);

    } else if (this.currentView === 'course') {
      const course = this.store.getCourse(this.activeCourseId);
      if (titleEl) titleEl.textContent = course ? `${course.kode} · ${course.nama}` : 'Mata Kuliah';
      if (subtitleEl) subtitleEl.textContent = 'Mata Kuliah';
      if (toolbar) toolbar.style.display = 'flex';
      filterOptions.courseId = this.activeCourseId;
      const tasks = this.store.getTasks(filterOptions);
      this.renderViewContainer(tasks);

    } else if (this.currentView === 'project') {
      if (titleEl) titleEl.textContent = 'Proyek & Tugas Besar';
      if (subtitleEl) subtitleEl.textContent = 'Rencana Kerja';
      if (toolbar) toolbar.style.display = 'none';
      this.renderProjectsView();

    } else if (this.currentView === 'archive') {
      if (titleEl) titleEl.textContent = 'Arsip Semester';
      if (subtitleEl) subtitleEl.textContent = 'Riwayat Akademik';
      if (toolbar) toolbar.style.display = 'none';
      this.renderArchiveView();

    } else if (this.currentView === 'trash') {
      if (titleEl) titleEl.textContent = 'Sampah (Soft Delete)';
      if (subtitleEl) subtitleEl.textContent = 'Dapat dipulihkan dalam 30 hari';
      if (toolbar) toolbar.style.display = 'none';
      this.renderTrashView();

    } else if (this.currentView === 'settings') {
      if (titleEl) titleEl.textContent = 'Pengaturan & Notifikasi Telegram';
      if (subtitleEl) subtitleEl.textContent = 'Preferensi Aplikasi';
      if (toolbar) toolbar.style.display = 'none';
      this.renderSettingsView();
    }
  }

  renderViewContainer(tasks) {
    if (this.viewMode === 'list') {
      this.listView.render(tasks);
    } else if (this.viewMode === 'kanban') {
      this.kanbanView.render(tasks);
    } else if (this.viewMode === 'calendar') {
      this.calendarView.render(tasks);
    }
  }

  // --- SPECIAL VIEWS ---
  renderProjectsView() {
    const container = document.getElementById('view-body');
    const projects = this.store.getProjects();
    const allTasks = this.store.getTasks();

    let html = `
      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 960px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div class="h2">Daftar Proyek & Tugas Besar</div>
            <p class="mono-label">Pecah tugas besar menjadi beberapa task terukur</p>
          </div>
          <button class="btn btn-secondary" onclick="window.app.openProjectModal()">+ Proyek Baru</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px;">
    `;

    if (projects.length === 0) {
      html += `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="h3">Belum ada proyek dibuat</div>
          <p class="mono-label">Buat proyek seperti Tugas Besar atau Skripsi.</p>
        </div>
      `;
    }

    projects.forEach(p => {
      const pTasks = allTasks.filter(t => t.project_id === p.id);
      const total = pTasks.length;
      const doneCount = pTasks.filter(t => {
        const s = this.store.getStatus(t.status_id);
        return s && s.apakah_selesai;
      }).length;
      const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

      html += `
        <div class="card" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between;">
            <div>
              <span class="mono-label" style="color: var(--color-tertiary);">${p.status || 'Aktif'}</span>
              <div class="h3" style="margin-top: 4px;">${this.escapeHtml(p.nama)}</div>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-ghost btn-sm" onclick="window.app.openProjectModal('${p.id}')">✎</button>
              <button class="btn btn-ghost btn-sm" onclick="window.app.deleteProjectConfirm('${p.id}')">✕</button>
            </div>
          </div>
          <div style="font-size: 0.88rem; color: var(--color-secondary); line-height: 1.4;">
            ${this.escapeHtml(p.deskripsi || 'Tidak ada deskripsi')}
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
              <span class="mono-label">Progres Tugas</span>
              <span class="mono-label">${doneCount}/${total} selesai (${percent}%)</span>
            </div>
            <div style="height: 6px; background-color: var(--color-surface-hover); border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: ${percent}%; background-color: var(--color-tertiary); transition: width 0.3s;"></div>
            </div>
          </div>

          <div style="border-top: 1px solid var(--color-border); padding-top: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span class="mono-label">Deadline: ${p.deadline ? new Date(p.deadline).toLocaleDateString('id-ID') : '-'}</span>
            <button class="btn btn-secondary btn-sm" onclick="window.app.openQuickAddModalWithProject('${p.id}')">+ Tambah Task</button>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  renderArchiveView() {
    const container = document.getElementById('view-body');
    const archived = this.store.getArchivedSemesters();

    let html = `
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 800px;">
        <div>
          <div class="h2">Arsip Semester</div>
          <p class="mono-label">Semester lama yang diarsipkan agar tampilan aktif tetap rapi.</p>
        </div>
    `;

    if (archived.length === 0) {
      html += `
        <div class="empty-state">
          <div class="h3">Tidak ada semester yang diarsipkan</div>
          <p class="mono-label">Anda dapat mengarsipkan semester dari menu pengaturan semester.</p>
        </div>
      `;
    } else {
      archived.forEach(s => {
        const courses = this.store.getCourses(s.id);
        html += `
          <div class="card" style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div class="h3">${this.escapeHtml(s.nama)}</div>
              <div class="mono-label" style="margin-top: 4px;">
                ${s.tanggal_mulai || '-'} s/d ${s.tanggal_selesai || '-'} · ${courses.length} Mata Kuliah
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="window.app.unarchiveSemester('${s.id}')">
                Buka Arsip (Aktifkan)
              </button>
              <button class="btn btn-danger btn-sm" onclick="window.app.deleteSemesterConfirm('${s.id}')">
                Hapus
              </button>
            </div>
          </div>
        `;
      });
    }

    html += '</div>';
    container.innerHTML = html;
  }

  renderTrashView() {
    const container = document.getElementById('view-body');
    const trashTasks = this.store.getTasks({ trashOnly: true });

    let html = `
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 900px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div class="h2">Sampah (Trash)</div>
            <p class="mono-label">Task yang dihapus tersimpan di sini selama 30 hari.</p>
          </div>
          ${trashTasks.length > 0 ? `
            <button class="btn btn-danger" onclick="window.app.emptyTrashConfirm()">Kosongkan Sampah</button>
          ` : ''}
        </div>
    `;

    if (trashTasks.length === 0) {
      html += `
        <div class="empty-state">
          <div class="h3">Kotak sampah kosong</div>
          <p class="mono-label">Tidak ada tugas yang sedang dihapus.</p>
        </div>
      `;
    } else {
      html += `
        <div class="card" style="padding: 0; overflow: hidden;">
          <table class="task-table">
            <tbody>
      `;
      trashTasks.forEach(task => {
        const course = this.store.getCourse(task.course_id);
        html += `
          <tr class="task-row">
            <td style="padding: 12px 16px;">
              <div style="font-weight: 500;">${this.escapeHtml(task.judul)}</div>
              <div class="mono-label" style="color: var(--color-muted);">
                ${course ? course.nama : 'Umum'} · Dihapus pada: ${new Date(task.dihapus_pada).toLocaleString('id-ID')}
              </div>
            </td>
            <td style="text-align: right; padding: 12px 16px;">
              <button class="btn btn-secondary btn-sm" onclick="window.app.restoreTask('${task.id}')">
                Pulihkan
              </button>
              <button class="btn btn-danger btn-sm" onclick="window.app.permanentDeleteTaskConfirm('${task.id}')">
                Hapus Permanen
              </button>
            </td>
          </tr>
        `;
      });
      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  renderSettingsView() {
    const container = document.getElementById('view-body');
    const settings = this.store.getSettings();

    let html = `
      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 780px;">
        <div>
          <div class="h2">Pengaturan Aplikasi & Pengingat Telegram</div>
          <p class="mono-label">Konfigurasi notifikasi Telegram bot dan pencadangan data.</p>
        </div>

        <!-- Telegram Configuration Box -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div class="h3">🤖 Integrasi Telegram Bot (MVP)</div>
            <span class="tg-status-indicator">
              <span class="status-dot ${settings.telegram_enabled && settings.telegram_bot_token ? 'active' : ''}"></span>
              ${settings.telegram_enabled && settings.telegram_bot_token ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>

          <div style="font-size: 0.88rem; color: var(--color-secondary); margin-bottom: 16px; line-height: 1.5;">
            Pengingat deadline akan dikirim langsung ke akun Telegram Anda via Bot.
            Buat bot via <b style="color: var(--color-primary);">@BotFather</b> untuk mendapatkan Bot Token, dan dapatkan Chat ID dari <b style="color: var(--color-primary);">@userinfobot</b>.
          </div>

          <form onsubmit="window.app.saveTelegramSettings(event)" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="form-group">
              <label class="form-label">Telegram Bot Token</label>
              <input type="text" id="setting-tg-token" value="${this.escapeHtml(settings.telegram_bot_token || '')}" placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRstuVWXyz">
            </div>

            <div class="form-group">
              <label class="form-label">Telegram Chat ID</label>
              <input type="text" id="setting-tg-chatid" value="${this.escapeHtml(settings.telegram_chat_id || '')}" placeholder="Contoh: 987654321">
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="setting-tg-enabled" ${settings.telegram_enabled ? 'checked' : ''} style="width: auto;">
              <label for="setting-tg-enabled" style="font-size: 0.88rem; cursor: pointer;">Aktifkan pengiriman pengingat via Telegram</label>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <button type="submit" class="btn btn-secondary">Simpan Pengaturan</button>
              <button type="button" class="btn btn-secondary" onclick="window.app.testTelegramConnection()">
                Kirim Pesan Tes Telegram
              </button>
            </div>
            <div id="tg-test-feedback" class="mono-label" style="margin-top: 6px;"></div>
          </form>
        </div>

        <!-- Backup & Restore Box -->
        <div class="card">
          <div class="h3" style="margin-bottom: 8px;">💾 Pencadangan & Pemulihan Data</div>
          <div style="font-size: 0.88rem; color: var(--color-secondary); margin-bottom: 16px;">
            Ekspor seluruh semester, mata kuliah, dan task ke berkas JSON lokal untuk backup aman.
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="window.app.exportDataToFile()">
              📥 Ekspor Data (JSON)
            </button>
            <label class="btn btn-secondary" style="cursor: pointer;">
              📤 Impor Data (JSON)
              <input type="file" accept=".json" onchange="window.app.importDataFromFile(event)" style="display: none;">
            </label>
            <button class="btn btn-danger" onclick="window.app.resetDataConfirm()">
              ↺ Reset ke Data Bawaan
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // --- ACTIONS ---
  toggleTaskCompletion(id) {
    this.store.toggleTaskCompletion(id);
  }

  deleteTask(id) {
    this.store.softDeleteTask(id);
  }

  restoreTask(id) {
    this.store.restoreTask(id);
    this.renderTrashView();
  }

  permanentDeleteTaskConfirm(id) {
    if (confirm('Yakin ingin menghapus task ini secara permanen? Data tidak dapat dipulihkan.')) {
      this.store.permanentDeleteTask(id);
      this.renderTrashView();
    }
  }

  emptyTrashConfirm() {
    if (confirm('Kosongkan semua task di sampah secara permanen?')) {
      this.store.emptyTrash();
      this.renderTrashView();
    }
  }

  unarchiveSemester(id) {
    this.store.toggleArchiveSemester(id);
    this.renderArchiveView();
  }

  deleteSemesterConfirm(id) {
    if (confirm('Hapus semester ini beserta matakuliah di dalamnya?')) {
      this.store.deleteSemester(id);
      this.renderArchiveView();
    }
  }

  deleteProjectConfirm(id) {
    if (confirm('Hapus proyek ini? Task yang terkait tidak akan terhapus.')) {
      this.store.deleteProject(id);
      this.renderProjectsView();
    }
  }

  // --- STATUS ACTIONS (KANBAN) ---
  addNewStatusPrompt() {
    const name = prompt('Masukkan nama kolom status baru:');
    if (name && name.trim()) {
      this.store.addStatus(name.trim(), false);
    }
  }

  editStatusPrompt(statusId, currentName) {
    const name = prompt('Ubah nama kolom status:', currentName);
    if (name && name.trim() && name !== currentName) {
      this.store.updateStatus(statusId, { nama: name.trim() });
    }
  }

  deleteStatusConfirm(statusId) {
    if (confirm('Hapus kolom status ini? Task di kolom ini akan dipindah ke kolom pertama.')) {
      const remaining = this.store.getStatuses().filter(s => s.id !== statusId);
      if (remaining.length > 0) {
        // Move tasks to first remaining status
        this.store.getTasks().forEach(t => {
          if (t.status_id === statusId) {
            this.store.updateTask(t.id, { status_id: remaining[0].id });
          }
        });
        this.store.deleteStatus(statusId);
      }
    }
  }

  // --- MODAL CONTROLS ---
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
  }

  // --- QUICK ADD MODAL ---
  openQuickAddModal() {
    this.populateQuickAddForm();
    this.openModal('quick-add-modal');
    setTimeout(() => {
      const input = document.getElementById('qa-title');
      if (input) input.focus();
    }, 100);
  }

  openQuickAddModalWithStatus(statusId) {
    this.openQuickAddModal();
    const statusSelect = document.getElementById('qa-status');
    if (statusSelect) statusSelect.value = statusId;
  }

  openQuickAddModalWithDate(dateStr) {
    this.openQuickAddModal();
    const deadlineInput = document.getElementById('qa-deadline');
    if (deadlineInput) deadlineInput.value = `${dateStr}T23:59`;
  }

  openQuickAddModalWithProject(projectId) {
    this.openQuickAddModal();
    const projSelect = document.getElementById('qa-project');
    if (projSelect) projSelect.value = projectId;
  }

  populateQuickAddForm() {
    // Courses
    const courseSelect = document.getElementById('qa-course');
    if (courseSelect) {
      const courses = this.store.getCourses();
      courseSelect.innerHTML = courses.map(c => `<option value="${c.id}">${this.escapeHtml(c.kode)} - ${this.escapeHtml(c.nama)}</option>`).join('');
      if (this.activeCourseId) courseSelect.value = this.activeCourseId;
    }

    // Statuses
    const statusSelect = document.getElementById('qa-status');
    if (statusSelect) {
      const statuses = this.store.getStatuses();
      statusSelect.innerHTML = statuses.map(s => `<option value="${s.id}">${this.escapeHtml(s.nama)}</option>`).join('');
    }

    // Projects
    const projSelect = document.getElementById('qa-project');
    if (projSelect) {
      const projects = this.store.getProjects();
      projSelect.innerHTML = '<option value="">(Opsional) Tanpa Proyek</option>' +
        projects.map(p => `<option value="${p.id}">${this.escapeHtml(p.nama)}</option>`).join('');
      if (this.activeProjectId) projSelect.value = this.activeProjectId;
    }

    // Default deadline to tomorrow 23:59
    const deadlineInput = document.getElementById('qa-deadline');
    if (deadlineInput && !deadlineInput.value) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const y = tomorrow.getFullYear();
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const d = String(tomorrow.getDate()).padStart(2, '0');
      deadlineInput.value = `${y}-${m}-${d}T23:59`;
    }

    const titleInput = document.getElementById('qa-title');
    if (titleInput) titleInput.value = '';
  }

  submitQuickAdd(e) {
    e.preventDefault();
    const title = document.getElementById('qa-title').value.trim();
    if (!title) return;

    const courseId = document.getElementById('qa-course').value;
    const statusId = document.getElementById('qa-status').value;
    const priority = document.getElementById('qa-priority').value;
    const deadlineVal = document.getElementById('qa-deadline').value;
    const projectId = document.getElementById('qa-project').value || null;

    const deadline = deadlineVal ? new Date(deadlineVal).toISOString() : '';

    this.store.addTask({
      judul: title,
      course_id: courseId,
      status_id: statusId,
      prioritas: priority,
      deadline: deadline,
      project_id: projectId
    });

    this.closeModal('quick-add-modal');
  }

  // --- TASK DETAIL MODAL ---
  openTaskDetail(taskId) {
    const task = this.store.getTask(taskId);
    if (!task) return;
    this.activeEditingTaskId = taskId;

    // Fill form
    document.getElementById('task-modal-title').textContent = task.judul;
    document.getElementById('edit-task-title').value = task.judul;
    document.getElementById('edit-task-desc').value = task.deskripsi || '';

    // Course
    const courseSelect = document.getElementById('edit-task-course');
    const courses = this.store.getCourses();
    courseSelect.innerHTML = courses.map(c => `<option value="${c.id}" ${c.id === task.course_id ? 'selected' : ''}>${this.escapeHtml(c.kode)} - ${this.escapeHtml(c.nama)}</option>`).join('');

    // Status
    const statusSelect = document.getElementById('edit-task-status');
    const statuses = this.store.getStatuses();
    statusSelect.innerHTML = statuses.map(s => `<option value="${s.id}" ${s.id === task.status_id ? 'selected' : ''}>${this.escapeHtml(s.nama)}</option>`).join('');

    // Priority
    document.getElementById('edit-task-priority').value = task.prioritas || 'Sedang';

    // Deadline
    const deadlineInput = document.getElementById('edit-task-deadline');
    if (task.deadline) {
      const d = new Date(task.deadline);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      deadlineInput.value = `${y}-${m}-${day}T${hour}:${min}`;
    } else {
      deadlineInput.value = '';
    }

    // Tags
    document.getElementById('edit-task-tags').value = (task.tags || []).join(', ');

    // Custom Field URL
    document.getElementById('edit-task-custom-url').value = (task.custom_values && task.custom_values.repository_url) || (task.custom_values && task.custom_values.figma_url) || '';

    // Subtasks
    this.renderSubtasksEditor(task.subtasks || []);

    this.openModal('task-detail-modal');
  }

  renderSubtasksEditor(subtasks) {
    const list = document.getElementById('subtask-editor-list');
    if (!list) return;

    let html = '';
    subtasks.forEach((st, idx) => {
      html += `
        <div class="subtask-item">
          <input type="checkbox" ${st.selesai ? 'checked' : ''} onchange="window.app.toggleSubtask(${idx})">
          <input type="text" class="subtask-title-input ${st.selesai ? 'done' : ''}" value="${this.escapeHtml(st.judul)}" onchange="window.app.updateSubtaskTitle(${idx}, this.value)">
          <button type="button" class="btn btn-ghost btn-sm" onclick="window.app.deleteSubtask(${idx})" style="color: var(--color-danger);">✕</button>
        </div>
      `;
    });
    list.innerHTML = html;
  }

  addSubtask() {
    const input = document.getElementById('new-subtask-input');
    if (!input || !input.value.trim() || !this.activeEditingTaskId) return;

    const task = this.store.getTask(this.activeEditingTaskId);
    if (!task) return;

    if (!task.subtasks) task.subtasks = [];
    task.subtasks.push({
      id: 'sub_' + Date.now(),
      judul: input.value.trim(),
      selesai: false
    });
    input.value = '';
    this.store.save();
    this.renderSubtasksEditor(task.subtasks);
  }

  toggleSubtask(idx) {
    const task = this.store.getTask(this.activeEditingTaskId);
    if (task && task.subtasks && task.subtasks[idx]) {
      task.subtasks[idx].selesai = !task.subtasks[idx].selesai;
      this.store.save();
      this.renderSubtasksEditor(task.subtasks);
    }
  }

  updateSubtaskTitle(idx, title) {
    const task = this.store.getTask(this.activeEditingTaskId);
    if (task && task.subtasks && task.subtasks[idx]) {
      task.subtasks[idx].judul = title;
      this.store.save();
    }
  }

  deleteSubtask(idx) {
    const task = this.store.getTask(this.activeEditingTaskId);
    if (task && task.subtasks) {
      task.subtasks.splice(idx, 1);
      this.store.save();
      this.renderSubtasksEditor(task.subtasks);
    }
  }

  saveTaskDetail(e) {
    e.preventDefault();
    if (!this.activeEditingTaskId) return;

    const title = document.getElementById('edit-task-title').value.trim();
    if (!title) return;

    const desc = document.getElementById('edit-task-desc').value;
    const courseId = document.getElementById('edit-task-course').value;
    const statusId = document.getElementById('edit-task-status').value;
    const priority = document.getElementById('edit-task-priority').value;
    const deadlineVal = document.getElementById('edit-task-deadline').value;
    const tagsStr = document.getElementById('edit-task-tags').value;
    const customUrl = document.getElementById('edit-task-custom-url').value.trim();

    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const deadline = deadlineVal ? new Date(deadlineVal).toISOString() : '';

    this.store.updateTask(this.activeEditingTaskId, {
      judul: title,
      deskripsi: desc,
      course_id: courseId,
      status_id: statusId,
      prioritas: priority,
      deadline: deadline,
      tags: tags,
      custom_values: { repository_url: customUrl }
    });

    this.closeModal('task-detail-modal');
  }

  deleteTaskFromModal() {
    if (this.activeEditingTaskId) {
      this.store.softDeleteTask(this.activeEditingTaskId);
      this.closeModal('task-detail-modal');
    }
  }

  // --- SEMESTER MODAL ---
  openSemesterModal(semId = null) {
    const sem = semId ? this.store.getSemester(semId) : null;
    document.getElementById('sem-modal-id').value = sem ? sem.id : '';
    document.getElementById('sem-modal-name').value = sem ? sem.nama : '';
    document.getElementById('sem-modal-start').value = sem ? sem.tanggal_mulai : '';
    document.getElementById('sem-modal-end').value = sem ? sem.tanggal_selesai : '';
    document.getElementById('sem-modal-archive').checked = sem ? sem.diarsipkan : false;

    this.openModal('semester-modal');
  }

  saveSemester(e) {
    e.preventDefault();
    const id = document.getElementById('sem-modal-id').value;
    const nama = document.getElementById('sem-modal-name').value.trim();
    const tanggal_mulai = document.getElementById('sem-modal-start').value;
    const tanggal_selesai = document.getElementById('sem-modal-end').value;
    const diarsipkan = document.getElementById('sem-modal-archive').checked;

    if (!nama) return;

    if (id) {
      this.store.updateSemester(id, { nama, tanggal_mulai, tanggal_selesai, diarsipkan });
    } else {
      this.store.addSemester({ nama, tanggal_mulai, tanggal_selesai, diarsipkan });
    }

    this.closeModal('semester-modal');
  }

  // --- COURSE MODAL ---
  openCourseModal(courseId = null, defaultSemId = null) {
    const course = courseId ? this.store.getCourse(courseId) : null;
    document.getElementById('course-modal-id').value = course ? course.id : '';
    document.getElementById('course-modal-name').value = course ? course.nama : '';
    document.getElementById('course-modal-code').value = course ? course.kode : '';
    document.getElementById('course-modal-lecturer').value = course ? course.dosen : '';
    document.getElementById('course-modal-sks').value = course ? course.sks : 3;

    // Semester select
    const semSelect = document.getElementById('course-modal-sem');
    const semesters = this.store.getSemesters(false);
    semSelect.innerHTML = semesters.map(s => `<option value="${s.id}">${this.escapeHtml(s.nama)}</option>`).join('');
    if (course) {
      semSelect.value = course.semester_id;
    } else if (defaultSemId) {
      semSelect.value = defaultSemId;
    }

    this.openModal('course-modal');
  }

  saveCourse(e) {
    e.preventDefault();
    const id = document.getElementById('course-modal-id').value;
    const nama = document.getElementById('course-modal-name').value.trim();
    const kode = document.getElementById('course-modal-code').value.trim();
    const dosen = document.getElementById('course-modal-lecturer').value.trim();
    const sks = document.getElementById('course-modal-sks').value;
    const semester_id = document.getElementById('course-modal-sem').value;

    if (!nama) return;

    if (id) {
      this.store.updateCourse(id, { nama, kode, dosen, sks, semester_id });
    } else {
      this.store.addCourse({ nama, kode, dosen, sks, semester_id });
    }

    this.closeModal('course-modal');
  }

  // --- PROJECT MODAL ---
  openProjectModal(projId = null) {
    const proj = projId ? this.store.getProject(projId) : null;
    document.getElementById('proj-modal-id').value = proj ? proj.id : '';
    document.getElementById('proj-modal-name').value = proj ? proj.nama : '';
    document.getElementById('proj-modal-desc').value = proj ? proj.deskripsi : '';
    document.getElementById('proj-modal-deadline').value = proj && proj.deadline ? proj.deadline.substring(0, 10) : '';
    document.getElementById('proj-modal-status').value = proj ? proj.status : 'Berjalan';

    this.openModal('project-modal');
  }

  saveProject(e) {
    e.preventDefault();
    const id = document.getElementById('proj-modal-id').value;
    const nama = document.getElementById('proj-modal-name').value.trim();
    const deskripsi = document.getElementById('proj-modal-desc').value.trim();
    const deadline = document.getElementById('proj-modal-deadline').value;
    const status = document.getElementById('proj-modal-status').value;

    if (!nama) return;

    if (id) {
      this.store.updateProject(id, { nama, deskripsi, deadline, status });
    } else {
      this.store.addProject({ nama, deskripsi, deadline, status });
    }

    this.closeModal('project-modal');
    if (this.currentView === 'project') this.renderProjectsView();
  }

  // --- TELEGRAM & SETTINGS ---
  saveTelegramSettings(e) {
    e.preventDefault();
    const token = document.getElementById('setting-tg-token').value.trim();
    const chatId = document.getElementById('setting-tg-chatid').value.trim();
    const enabled = document.getElementById('setting-tg-enabled').checked;

    this.store.updateSettings({
      telegram_bot_token: token,
      telegram_chat_id: chatId,
      telegram_enabled: enabled
    });

    const feedback = document.getElementById('tg-test-feedback');
    if (feedback) {
      feedback.style.color = 'var(--color-tertiary)';
      feedback.textContent = '✓ Pengaturan Telegram berhasil disimpan!';
    }
  }

  async testTelegramConnection() {
    const feedback = document.getElementById('tg-test-feedback');
    if (feedback) {
      feedback.style.color = 'var(--color-secondary)';
      feedback.textContent = 'Mengirim pesan tes ke Telegram...';
    }

    const res = await window.telegramService.sendTestMessage();
    if (feedback) {
      if (res.success) {
        feedback.style.color = 'var(--color-tertiary)';
        feedback.textContent = '✓ Berhasil terkirim! Cek aplikasi Telegram Anda.';
      } else {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = `✕ Gagal: ${res.message}`;
      }
    }
  }

  exportDataToFile() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(this.store.exportJSON());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tugasin_backup_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  importDataFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const success = this.store.importJSON(e.target.result);
      if (success) {
        alert('Data berhasil diimpor!');
        this.renderCurrentView();
      } else {
        alert('Gagal mengimpor data: format berkas tidak sesuai.');
      }
    };
    reader.readAsText(file);
  }

  resetDataConfirm() {
    if (confirm('Perhatian! Anda akan mengatur ulang seluruh data ke nilai bawaan. Lanjutkan?')) {
      this.store.resetData();
      alert('Data telah direset ke bawaan demo.');
      this.renderCurrentView();
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
