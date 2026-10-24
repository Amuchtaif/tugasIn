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

    window.app = this;
    window.kanbanView = this.kanbanView;
    window.calendarView = this.calendarView;
    window.listView = this.listView;

    this.activeEditingTaskId = null;
    this.activePreviewTaskId = null;
    this.activePreviewIndex = 0;
    this.previewZoom = 1;
    this.previewPan = { x: 0, y: 0 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.touchStartDist = 0;
    this.touchStartPoint = { x: 0, y: 0 };

    this.init();
  }

  async init() {
    this.initTheme();
    this.initSidebar();

    // Subscribe to store updates
    this.store.subscribe(() => {
      this.updateDbStatusUi();
      this.renderSidebar();
      this.renderTopStats();
      this.renderCurrentView();
    });

    this.bindEvents();
    this.initFormControls();
    this.setupAttachmentDropzone();
    this.updateDbStatusUi();
    this.renderSidebar();
    this.renderTopStats();
    this.renderCurrentView();

    // Await store's initial fetch from MySQL
    if (this.store.initPromise) {
      await this.store.initPromise;
      this.updateDbStatusUi();
    }
  }

  updateDbStatusUi() {
    const dot = document.getElementById('sidebar-db-dot');
    if (dot) {
      if (this.store.dbConnected) {
        dot.className = 'status-dot active';
        dot.title = 'Terhubung ke MySQL (tugasin_db)';
      } else {
        dot.className = 'status-dot danger';
        dot.title = 'Terputus dari MySQL: ' + (this.store.lastError || '');
      }
    }
  }

  bindEvents() {
    // Keyboard shortcuts & Navigation
    window.addEventListener('keydown', (e) => {
      // Lightbox modal keyboard navigation (Task 4.4, 4.6, 4.9)
      const previewModal = document.getElementById('image-preview-modal');
      const isPreviewOpen = previewModal && previewModal.style.display !== 'none';
      if (isPreviewOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.closeImagePreviewModal();
          return;
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.previewPrevImage();
          return;
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.previewNextImage();
          return;
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          this.previewZoomIn();
          return;
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          this.previewZoomOut();
          return;
        } else if (e.key === '0') {
          e.preventDefault();
          this.previewResetZoom();
          return;
        }
      }

      // Don't trigger standard shortcuts if user is typing in an input/textarea
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        if (e.key === 'Escape') {
          this.closeAllModals();
        }
        return;
      }

      // Keyboard shortcut for sidebar toggle: Ctrl+B or Cmd+B
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        this.toggleSidebar();
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

    // Clipboard paste handler for screenshots (Task 3.4)
    window.addEventListener('paste', (e) => {
      const taskModal = document.getElementById('task-detail-modal');
      if (taskModal && taskModal.classList.contains('active') && this.activeEditingTaskId) {
        const items = e.clipboardData ? e.clipboardData.items : [];
        const imageFiles = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
              const now = new Date();
              const ext = file.type.split('/')[1] || 'png';
              const filename = `screenshot_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}.${ext}`;
              const namedFile = new File([file], filename, { type: file.type });
              imageFiles.push(namedFile);
            }
          }
        }
        if (imageFiles.length > 0) {
          e.preventDefault();
          this.uploadAttachmentFiles(imageFiles, this.activeEditingTaskId);
        }
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
  }

  // --- FORM CONTROLS INITIALIZATION (TASK 1 - 6) ---
  initFormControls() {
    if (!window.CustomSelect) return;

    // 1. Toolbar filters
    CustomSelect.enhance('#filter-priority', {
      size: 'sm',
      placeholder: 'Semua Prioritas',
      onChange: (val) => {
        this.filterPriority = val;
        this.renderCurrentView();
      }
    });

    CustomSelect.enhance('#filter-status', {
      size: 'sm',
      placeholder: 'Semua Status',
      onChange: (val) => {
        this.filterStatus = val;
        this.renderCurrentView();
      }
    });

    // 2. Quick Add Modal Selects
    CustomSelect.enhance('#qa-course', {
      size: 'md',
      searchable: true,
      placeholder: 'Pilih Mata Kuliah'
    });

    CustomSelect.enhance('#qa-status', {
      size: 'md',
      placeholder: 'Pilih Status Awal'
    });

    CustomSelect.enhance('#qa-priority', {
      size: 'md',
      placeholder: 'Pilih Prioritas'
    });

    CustomSelect.enhance('#qa-project', {
      size: 'md',
      searchable: true,
      placeholder: '(Opsional) Tanpa Proyek'
    });

    // 3. Edit Task Modal Selects
    CustomSelect.enhance('#edit-task-course', {
      size: 'md',
      searchable: true,
      placeholder: 'Pilih Mata Kuliah'
    });

    CustomSelect.enhance('#edit-task-status', {
      size: 'md',
      placeholder: 'Pilih Status'
    });

    CustomSelect.enhance('#edit-task-priority', {
      size: 'md',
      placeholder: 'Pilih Prioritas'
    });

    // 4. Course & Project Modal Selects
    CustomSelect.enhance('#course-modal-sem', {
      size: 'md',
      placeholder: 'Pilih Semester'
    });

    CustomSelect.enhance('#proj-modal-status', {
      size: 'md',
      placeholder: 'Status Proyek'
    });

    // 5. Multi-Select Tags Input (Task 5.5)
    const tagInputEl = document.getElementById('edit-task-tags');
    if (tagInputEl && window.TagInput && !this.taskTagInput) {
      this.taskTagInput = new TagInput(tagInputEl, {
        placeholder: 'Ketik tag lalu tekan Enter...'
      });
    }
  }

  // --- SIDEBAR MANAGEMENT (Collapse / Expand & Responsive Mobile Drawer) ---
  initSidebar() {
    const isMobile = window.innerWidth <= 900;
    if (!isMobile) {
      const isCollapsed = localStorage.getItem('tugasin_sidebar_collapsed') === 'true';
      this.setSidebarCollapsed(isCollapsed, false);
    } else {
      document.documentElement.classList.remove('sidebar-init-collapsed');
    }
  }

  toggleSidebar() {
    const isMobile = window.innerWidth <= 900;
    if (isMobile) {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      const isOpen = sidebar ? sidebar.classList.contains('open') : false;
      if (isOpen) {
        this.closeMobileSidebar();
      } else {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    } else {
      const appRoot = document.getElementById('app-root');
      const isCurrentlyCollapsed = appRoot ? appRoot.classList.contains('sidebar-collapsed') : false;
      this.setSidebarCollapsed(!isCurrentlyCollapsed, true);
    }
  }

  setSidebarCollapsed(collapsed, notify = false) {
    document.documentElement.classList.remove('sidebar-init-collapsed');
    const appRoot = document.getElementById('app-root');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn') || document.getElementById('mobile-menu-btn');

    if (collapsed) {
      if (appRoot) appRoot.classList.add('sidebar-collapsed');
      if (sidebar) sidebar.classList.add('collapsed');
      localStorage.setItem('tugasin_sidebar_collapsed', 'true');
      if (toggleBtn) {
        toggleBtn.title = 'Tampilkan Sidebar (Ctrl+B)';
        toggleBtn.classList.add('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    } else {
      if (appRoot) appRoot.classList.remove('sidebar-collapsed');
      if (sidebar) sidebar.classList.remove('collapsed');
      localStorage.setItem('tugasin_sidebar_collapsed', 'false');
      if (toggleBtn) {
        toggleBtn.title = 'Sembunyikan Sidebar (Ctrl+B)';
        toggleBtn.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'true');
      }
    }

    // Trigger window resize so any responsive components recalculate
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --- THEME MANAGEMENT (Glassline Light Mode / Graphite Dark Mode) ---
  initTheme() {
    const settings = this.store.getSettings() || {};
    const saved = localStorage.getItem('tugasin_theme') || settings.theme || 'light';
    this.setTheme(saved, false);
  }

  toggleTheme(event = null) {
    if (this.isThemeTransitioning) return;
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next, true, event);
  }

  setTheme(themeName, notify = true, event = null) {
    const target = themeName === 'dark' ? 'dark' : 'light';
    const current = document.documentElement.getAttribute('data-theme') || 'light';

    // If already on target theme and initialized, do nothing
    if (current === target && document.documentElement.hasAttribute('data-theme') && notify) {
      return;
    }

    // Initial load: apply without any transition animation
    if (!notify) {
      this.applyThemeDom(target, false);
      return;
    }

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      this.applyThemeDom(target, true);
      return;
    }

    this.isThemeTransitioning = true;
    this.animateThemeButton();

    // Check if View Transitions API is supported (Chrome/Edge/Chromium)
    if (typeof document.startViewTransition === 'function') {
      let x = window.innerWidth - 60;
      let y = 30;

      if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        x = event.clientX;
        y = event.clientY;
      } else {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
          const rect = btn.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }
      }

      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(() => {
        this.applyThemeDom(target, true);
      });

      transition.ready.then(() => {
        const animation = document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`
            ]
          },
          {
            duration: 420,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );

        animation.onfinish = () => {
          this.isThemeTransitioning = false;
        };
      }).catch(() => {
        this.isThemeTransitioning = false;
      });
    } else {
      // Universal Smooth CSS Transition Fallback
      document.documentElement.classList.add('theme-transitioning');
      this.applyThemeDom(target, true);
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
        this.isThemeTransitioning = false;
      }, 400);
    }
  }

  applyThemeDom(target, notify = true) {
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('tugasin_theme', target);

    if (this.store) {
      this.store.updateSettings({ theme: target });
    }

    // Update theme toggle button icon & tooltip in top-bar
    const icon = document.getElementById('theme-toggle-icon');
    const btn = document.getElementById('theme-toggle-btn');
    if (icon) {
      icon.innerHTML = `<i class="fa-solid ${target === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>`;
    }
    if (btn) {
      btn.title = target === 'dark' ? 'Beralih ke Mode Terang (Glassline)' : 'Beralih ke Mode Gelap (Graphite)';
    }

    if (notify) {
      this.showToastNotification(
        `Tema diubah ke ${target === 'dark' ? 'Mode Gelap (Graphite)' : 'Mode Terang (Glassline)'}`
      );
    }

    // If on settings view, re-render to reflect selection
    if (this.currentView === 'settings') {
      this.renderSettingsView();
    }
  }

  animateThemeButton() {
    const icon = document.getElementById('theme-toggle-icon');
    if (!icon) return;
    icon.classList.remove('anim-spin');
    void icon.offsetWidth; // Force reflow
    icon.classList.add('anim-spin');
    setTimeout(() => {
      icon.classList.remove('anim-spin');
    }, 500);
  }

  showToastNotification(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-reminder';
    toast.innerHTML = `
      <div style="flex: 1; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 0.88rem; font-weight: 500;">${this.escapeHtml(msg)}</span>
        <button class="btn btn-ghost btn-icon-sm" onclick="this.closest('.toast').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 3000);
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
    this.closeMobileSidebar();

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
              <i class="fa-solid fa-graduation-cap" style="color: ${sem.warna || 'var(--color-primary)'}; font-size: 0.85rem;"></i>
              <span>${this.escapeHtml(sem.nama)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <button class="btn btn-ghost btn-icon-sm" onclick="event.stopPropagation(); window.app.openSemesterModal('${sem.id}')" title="Pengaturan Semester">
                <i class="fa-solid fa-gear"></i>
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
              <i class="fa-solid fa-book" style="color: ${course.warna || 'var(--color-secondary)'}; font-size: 0.72rem;"></i>
              <span class="course-code-tag">${this.escapeHtml(course.kode)}</span>
              <span>${this.escapeHtml(course.nama)}</span>
            </div>
            <span class="nav-counter">${courseTasks.length}</span>
          </div>
        `;
      });

      treeHtml += `
            <button class="btn btn-ghost btn-sm" style="width: 100%; justify-content: flex-start; margin-top: 4px; color: var(--color-muted);" onclick="window.app.openCourseModal(null, '${sem.id}')">
              <i class="fa-solid fa-plus"></i> Mata Kuliah
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

    this.updateGreetingSection();
  }

  // --- GREETING & REMINDER HERO SECTION ---
  updateGreetingSection() {
    const greetingSec = document.getElementById('greeting-section');
    if (!greetingSec) return;

    // Time-based greeting
    const now = new Date();
    const hour = now.getHours();
    let timeGreeting = 'Selamat Malam';
    let timeIcon = 'fa-moon';

    if (hour >= 4 && hour < 11) {
      timeGreeting = 'Selamat Pagi';
      timeIcon = 'fa-cloud-sun';
    } else if (hour >= 11 && hour < 15) {
      timeGreeting = 'Selamat Siang';
      timeIcon = 'fa-sun';
    } else if (hour >= 15 && hour < 18) {
      timeGreeting = 'Selamat Sore';
      timeIcon = 'fa-cloud-sun';
    } else {
      timeGreeting = 'Selamat Malam';
      timeIcon = 'fa-moon';
    }

    const titleEl = document.getElementById('greeting-title-text');
    if (titleEl) {
      titleEl.textContent = `${timeGreeting}, Andi Muchtaif!`;
    }

    const iconEl = document.getElementById('greeting-time-icon');
    if (iconEl) {
      iconEl.className = `fa-solid ${timeIcon}`;
    }

    const dateEl = document.getElementById('greeting-date-text');
    if (dateEl) {
      const dateStr = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      dateEl.textContent = dateStr;
    }

    // Task counts
    const all = this.store.getTasks();
    const todayTasks = this.store.getTasks({ dueTodayOnly: true });
    // Unfinished tasks due today
    const unfinishedToday = todayTasks.filter(t => {
      const s = this.store.getStatus(t.status_id);
      return !s || !s.apakah_selesai;
    });

    const ongoingTasks = all.filter(t => {
      const s = this.store.getStatus(t.status_id);
      if (!s) return false;
      return s.id === 'st_prog' || s.nama.toLowerCase().includes('kerja') || s.nama.toLowerCase().includes('progress');
    });

    const todayCountEl = document.getElementById('reminder-today-count');
    if (todayCountEl) {
      todayCountEl.textContent = unfinishedToday.length;
    }

    const ongoingCountEl = document.getElementById('reminder-ongoing-count');
    if (ongoingCountEl) {
      ongoingCountEl.textContent = ongoingTasks.length;
    }

    const deadlineCard = document.getElementById('reminder-card-deadline');
    if (deadlineCard) {
      if (unfinishedToday.length > 0) {
        deadlineCard.classList.add('has-urgent');
      } else {
        deadlineCard.classList.remove('has-urgent');
      }
    }
  }

  filterByTodayDeadline() {
    this.navigateTo('today');
    this.filterStatus = '';
    const filterEl = document.getElementById('filter-status');
    if (filterEl) {
      filterEl.value = '';
      if (window.CustomSelect) window.CustomSelect.syncAll();
    }
    this.renderCurrentView();
    this.showToastNotification('Menampilkan tugas dengan deadline hari ini & minggu ini');
  }

  filterByOngoing() {
    this.navigateTo('all');
    this.filterStatus = 'st_prog';
    const filterEl = document.getElementById('filter-status');
    if (filterEl) {
      filterEl.value = 'st_prog';
      if (window.CustomSelect) window.CustomSelect.syncAll();
    }
    this.renderCurrentView();
    this.showToastNotification('Menampilkan tugas yang sedang dikerjakan (On Going)');
  }

  // --- RENDER CURRENT VIEW ---
  renderCurrentView() {
    const titleEl = document.getElementById('breadcrumb-title');
    const subtitleEl = document.getElementById('breadcrumb-parent');
    const toolbar = document.querySelector('.view-toolbar');
    const container = document.getElementById('view-body');
    const greetingSec = document.getElementById('greeting-section');

    // Toggle Greeting Section visibility: show on task & project views, hide on settings, archive, trash
    if (greetingSec) {
      if (['today', 'all', 'course', 'project'].includes(this.currentView)) {
        greetingSec.style.display = 'block';
        this.updateGreetingSection();
      } else {
        greetingSec.style.display = 'none';
      }
    }

    // Loading state while MySQL data is being retrieved
    if (this.store.isLoading) {
      if (titleEl) titleEl.textContent = 'Memuat Data...';
      if (subtitleEl) subtitleEl.textContent = 'MySQL Database';
      if (toolbar) toolbar.style.display = 'none';
      if (container) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 60px 20px;">
            <div class="preview-spinner" style="margin: 0 auto 16px;"></div>
            <div class="h3">Menghubungkan ke Database MySQL...</div>
            <div style="font-size: 0.88rem; color: var(--color-muted);">Memuat data langsung dari tugasin_db (127.0.0.1:3306)...</div>
          </div>
        `;
      }
      return;
    }

    // Database connection error state (when not on settings view)
    if (!this.store.dbConnected && this.currentView !== 'settings') {
      if (titleEl) titleEl.textContent = 'Koneksi Terputus';
      if (subtitleEl) subtitleEl.textContent = 'Database MySQL';
      if (toolbar) toolbar.style.display = 'none';
      if (container) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 48px 24px; border: 1px dashed var(--color-danger); border-radius: 12px; background: rgba(239, 68, 68, 0.04); margin-top: 20px;">
            <div style="font-size: 2.4rem; margin-bottom: 12px; color: var(--color-danger);"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="h3" style="color: var(--color-danger); margin-bottom: 8px;">Koneksi Database MySQL Gagal</div>
            <div style="font-size: 0.9rem; color: var(--color-secondary); max-width: 520px; margin: 0 auto 20px; line-height: 1.6;">
              Aplikasi TugasIn diatur untuk <b>mengakses data penuh langsung dari database MySQL</b> (tanpa file JSON / cache lokal).
              Pastikan server database MySQL (XAMPP/MariaDB) di <code>127.0.0.1:3306</code> aktif dan kredensial di <code>config.php</code> sudah sesuai.
              ${this.store.lastError ? `<br><span style="color: var(--color-danger); font-family: var(--font-mono); font-size: 0.8rem; background: rgba(239, 68, 68, 0.1); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">Error: ${this.escapeHtml(this.store.lastError)}</span>` : ''}
            </div>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-primary" onclick="window.app.retryDbConnection()">
                <i class="fa-solid fa-rotate"></i> Coba Hubungkan Kembali
              </button>
              <button class="btn btn-secondary" onclick="window.app.navigateTo('settings')">
                <i class="fa-solid fa-gear"></i> Buka Pengaturan Database
              </button>
            </div>
          </div>
        `;
      }
      return;
    }

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
          <button class="btn btn-secondary" onclick="window.app.openProjectModal()"><i class="fa-solid fa-plus"></i> Proyek Baru</button>
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
              <button class="btn btn-ghost btn-icon-sm" onclick="window.app.openProjectModal('${p.id}')" title="Edit Proyek"><i class="fa-solid fa-pen-to-square"></i></button>
              <button class="btn btn-ghost btn-icon-sm" onclick="window.app.deleteProjectConfirm('${p.id}')" title="Hapus Proyek"><i class="fa-solid fa-trash-can"></i></button>
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
            <button class="btn btn-secondary btn-sm" onclick="window.app.openQuickAddModalWithProject('${p.id}')"><i class="fa-solid fa-plus"></i> Tambah Task</button>
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
                <i class="fa-solid fa-box-open"></i> Buka Arsip (Aktifkan)
              </button>
              <button class="btn btn-danger btn-sm" onclick="window.app.deleteSemesterConfirm('${s.id}')">
                <i class="fa-solid fa-trash-can"></i> Hapus
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
            <button class="btn btn-danger" onclick="window.app.emptyTrashConfirm()"><i class="fa-solid fa-trash-can"></i> Kosongkan Sampah</button>
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
                <i class="fa-solid fa-rotate-left"></i> Pulihkan
              </button>
              <button class="btn btn-danger btn-sm" onclick="window.app.permanentDeleteTaskConfirm('${task.id}')">
                <i class="fa-solid fa-trash-can"></i> Hapus Permanen
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
    const currentTheme = document.documentElement.getAttribute('data-theme') || settings.theme || 'light';

    let html = `
      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 780px;">
        <div>
          <div class="h2">Pengaturan Aplikasi</div>
          <p class="mono-label">Konfigurasi tema tampilan antarmuka, pengingat Telegram, dan pencadangan data.</p>
        </div>

        <!-- Theme Selection Card -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div class="h3"><i class="fa-solid fa-palette"></i> Tema Tampilan Antarmuka</div>
            <span class="mono-label">Tema Aktif: <b style="color: var(--color-primary);">${currentTheme === 'light' ? 'Glassline (Light Mode)' : 'Graphite (Dark Mode)'}</b></span>
          </div>
          <p class="mono-label" style="margin-bottom: 16px;">Pilih tema desain antarmuka. Tema bawaan (default) adalah Glassline Light Mode.</p>

          <div class="theme-selector-grid">
            <!-- Glassline Light Card -->
            <div class="theme-choice-card ${currentTheme === 'light' ? 'selected' : ''}" onclick="window.app.setTheme('light', true, event)">
              <div class="theme-choice-header">
                <div class="theme-choice-title">
                  <span class="theme-choice-radio"></span>
                  <span>Glassline (Mode Terang)</span>
                </div>
                <span class="theme-badge-default">Bawaan / Default</span>
              </div>
              <div class="theme-choice-desc">
                Fog-grey neutrals dengan aksen tunggal cobalt (<code>#2C5EF5</code>) & font Geist. Berdasarkan <code>design-lightmode.md</code>.
              </div>
              <div class="theme-color-palette">
                <div class="theme-color-chip" style="background: #F1F3F5; border: 1px solid #CBD5E1;" title="Neutral (#F1F3F5)"></div>
                <div class="theme-color-chip" style="background: #FFFFFF; border: 1px solid #CBD5E1;" title="Surface (#FFFFFF)"></div>
                <div class="theme-color-chip" style="background: #0F1419;" title="Primary (#0F1419)"></div>
                <div class="theme-color-chip" style="background: #4A5568;" title="Secondary (#4A5568)"></div>
                <div class="theme-color-chip" style="background: #2C5EF5;" title="Tertiary Cobalt (#2C5EF5)"></div>
              </div>
            </div>

            <!-- Graphite Dark Card -->
            <div class="theme-choice-card ${currentTheme === 'dark' ? 'selected' : ''}" onclick="window.app.setTheme('dark', true, event)">
              <div class="theme-choice-header">
                <div class="theme-choice-title">
                  <span class="theme-choice-radio"></span>
                  <span>Graphite (Mode Gelap)</span>
                </div>
              </div>
              <div class="theme-choice-desc">
                Cool engineering greys dengan aksen tunggal lime (<code>#B4FF39</code>) & font Inter. Berdasarkan <code>design.md</code>.
              </div>
              <div class="theme-color-palette">
                <div class="theme-color-chip" style="background: #0E1013; border: 1px solid #3E4552;" title="Neutral (#0E1013)"></div>
                <div class="theme-color-chip" style="background: #17191C; border: 1px solid #3E4552;" title="Surface (#17191C)"></div>
                <div class="theme-color-chip" style="background: #ECEDEE;" title="Primary (#ECEDEE)"></div>
                <div class="theme-color-chip" style="background: #9CA3AF;" title="Secondary (#9CA3AF)"></div>
                <div class="theme-color-chip" style="background: #B4FF39;" title="Tertiary Lime (#B4FF39)"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Telegram Configuration Box -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div class="h3"><i class="fa-brands fa-telegram" style="color: #229ED9;"></i> Integrasi Telegram Bot Pengingat</div>
            <span class="tg-status-indicator">
              <span class="status-dot ${settings.telegram_enabled && settings.telegram_bot_token && settings.telegram_chat_id ? 'active' : ''}"></span>
              ${settings.telegram_enabled && settings.telegram_bot_token && settings.telegram_chat_id ? 'Aktif & Terhubung' : 'Belum Terhubung'}
            </span>
          </div>

          <!-- Quick Guide Accordion/Box -->
          <div style="background-color: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
            <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; color: var(--color-primary); display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-book-open"></i>
              <span>Langkah Cepat Membuat & Menghubungkan Bot:</span>
            </div>
            <ol style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: var(--color-secondary); line-height: 1.6;">
              <li>Buka Telegram, cari akun resmi <b><a href="https://t.me/BotFather" target="_blank" style="color: var(--color-tertiary); text-decoration: underline;">@BotFather</a></b>.</li>
              <li>Kirim pesan <code>/newbot</code>, lalu beri nama bot (contoh: <i>TugasIn Pengingat</i>) dan username (harus berakhiran <i>bot</i>, contoh: <i>tugasin_kahlil_bot</i>).</li>
              <li>Salin <b>HTTP API Token</b> yang diberikan BotFather dan tempel di kolom <b>Telegram Bot Token</b> di bawah.</li>
              <li>Buka bot yang baru Anda buat di Telegram, lalu tekan tombol <b>START</b> (atau kirim <code>/start</code>).</li>
              <li>Klik tombol <b><i class="fa-solid fa-bolt"></i> Deteksi Chat ID Otomatis</b> di bawah agar Chat ID terisi secara otomatis tanpa repot!</li>
            </ol>
          </div>

          <form onsubmit="window.app.saveTelegramSettings(event)" style="display: flex; flex-direction: column; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Telegram Bot Token *</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="setting-tg-token" value="${this.escapeHtml(settings.telegram_bot_token || '')}" placeholder="Contoh: 7123456789:AAHkL1234567890abcdefghijklmnopqrst" style="flex: 1;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.app.verifyTelegramBot()">
                  <i class="fa-solid fa-magnifying-glass"></i> Verifikasi Token
                </button>
              </div>
              <div id="tg-bot-verify-feedback" class="mono-label" style="font-size: 0.78rem; margin-top: 4px;"></div>
            </div>

            <div class="form-group">
              <label class="form-label">Telegram Chat ID *</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="setting-tg-chatid" value="${this.escapeHtml(settings.telegram_chat_id || '')}" placeholder="Contoh: 123456789" style="flex: 1;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.app.detectTelegramChatId()" title="Deteksi Chat ID otomatis dari pesan /start terakhir">
                  <i class="fa-solid fa-bolt"></i> Deteksi Chat ID Otomatis
                </button>
              </div>
              <div id="tg-detect-feedback" class="mono-label" style="font-size: 0.78rem; margin-top: 4px;"></div>
            </div>

            <label class="custom-switch" style="padding: 6px 0;">
              <input type="checkbox" id="setting-tg-enabled" ${settings.telegram_enabled ? 'checked' : ''}>
              <span class="custom-switch-track"><span class="custom-switch-thumb"></span></span>
              <span class="custom-switch-label">Aktifkan pengiriman pengingat deadline otomatis via Telegram</span>
            </label>

            <div style="display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap;">
              <button type="submit" class="btn btn-primary">
                <i class="fa-solid fa-floppy-disk"></i> Simpan Pengaturan
              </button>
              <button type="button" class="btn btn-secondary" onclick="window.app.testTelegramConnection()">
                <i class="fa-solid fa-bell"></i> Kirim Pesan Tes Telegram
              </button>
            </div>
            <div id="tg-test-feedback" class="mono-label" style="margin-top: 6px;"></div>
          </form>
        </div>

        <!-- MySQL Full Database Access & Management Box -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <div>
              <div class="h3" style="margin-bottom: 4px;"><i class="fa-solid fa-database" style="color: var(--color-tertiary);"></i> Akses Penuh Database MySQL</div>
              <div style="font-size: 0.82rem; color: var(--color-secondary);">
                Aplikasi mengambil dan menyimpan seluruh data langsung dari database relasional MySQL. Tidak menggunakan file JSON maupun penyimpanan lokal.
              </div>
            </div>
            <span class="tg-status-indicator">
              <span class="status-dot ${this.store.dbConnected ? 'active' : 'danger'}"></span>
              ${this.store.dbConnected ? 'Terhubung Penuh (MySQL)' : 'Terputus dari MySQL'}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px;">
            <div style="background: var(--color-surface); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--color-border);">
              <div style="font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase;">Host & Port</div>
              <div style="font-weight: 600; font-family: var(--font-mono); font-size: 0.88rem;">127.0.0.1:3306</div>
            </div>
            <div style="background: var(--color-surface); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--color-border);">
              <div style="font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase;">Database</div>
              <div style="font-weight: 600; font-family: var(--font-mono); font-size: 0.88rem; color: var(--color-primary);">tugasin_db</div>
            </div>
            <div style="background: var(--color-surface); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--color-border);">
              <div style="font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase;">Semester</div>
              <div style="font-weight: 600; font-size: 0.88rem;">${(this.store.data.semesters || []).length} Semester</div>
            </div>
            <div style="background: var(--color-surface); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--color-border);">
              <div style="font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase;">Mata Kuliah</div>
              <div style="font-weight: 600; font-size: 0.88rem;">${(this.store.data.courses || []).length} Kursus</div>
            </div>
            <div style="background: var(--color-surface); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--color-border);">
              <div style="font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase;">Total Tugas</div>
              <div style="font-weight: 600; font-size: 0.88rem;">${(this.store.data.tasks || []).length} Tugas</div>
            </div>
            <div style="background: var(--color-surface); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--color-border);">
              <div style="font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase;">Proyek / Tubas</div>
              <div style="font-weight: 600; font-size: 0.88rem;">${(this.store.data.projects || []).length} Proyek</div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="window.app.refreshFromMySQL()">
              <i class="fa-solid fa-rotate"></i> Segarkan Data Langsung dari MySQL
            </button>
            <button class="btn btn-secondary" onclick="window.app.checkDbStatus()">
              <i class="fa-solid fa-network-wired"></i> Uji Ping & Latensi Database
            </button>
            <button class="btn btn-danger" onclick="window.app.openModal('clear-data-modal')" title="Kosongkan seluruh data tugas, semester, mata kuliah, dan proyek menjadi 0">
              <i class="fa-solid fa-trash-can"></i> Reset Data Menjadi Kosong (Null Data)
            </button>
            <button class="btn btn-secondary" onclick="window.app.openModal('reset-demo-modal')" title="Isi ulang data contoh bawaan dari database.sql">
              <i class="fa-solid fa-rotate-left"></i> Isi Data Demo Bawaan (database.sql)
            </button>
          </div>
          <div id="db-feedback" class="mono-label" style="margin-top: 12px;"></div>
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
    if (modalId === 'task-detail-modal') {
      this.activeEditingTaskId = null;
    }
  }

  closeAllModals() {
    this.closeImagePreviewModal();
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
    this.activeEditingTaskId = null;
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
    if (statusSelect) {
      statusSelect.value = statusId;
      if (window.CustomSelect) window.CustomSelect.syncAll();
    }
  }

  openQuickAddModalWithDate(dateStr) {
    this.openQuickAddModal();
    const deadlineInput = document.getElementById('qa-deadline');
    if (deadlineInput) deadlineInput.value = `${dateStr}T23:59`;
  }

  openQuickAddModalWithProject(projectId) {
    this.openQuickAddModal();
    const projSelect = document.getElementById('qa-project');
    if (projSelect) {
      projSelect.value = projectId;
      if (window.CustomSelect) window.CustomSelect.syncAll();
    }
  }

  populateQuickAddForm() {
    // Courses
    const courseSelect = document.getElementById('qa-course');
    if (courseSelect) {
      const courses = this.store.getCourses();
      courseSelect.innerHTML = courses.map(c => `<option value="${c.id}" data-badge="${this.escapeHtml(c.kode)}">${this.escapeHtml(c.kode)} - ${this.escapeHtml(c.nama)}</option>`).join('');
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
        projects.map(p => `<option value="${p.id}" data-dot="#2563EB">${this.escapeHtml(p.nama)}</option>`).join('');
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

    if (window.CustomSelect) {
      window.CustomSelect.syncAll();
    }
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
    courseSelect.innerHTML = courses.map(c => `<option value="${c.id}" data-badge="${this.escapeHtml(c.kode)}" ${c.id === task.course_id ? 'selected' : ''}>${this.escapeHtml(c.kode)} - ${this.escapeHtml(c.nama)}</option>`).join('');

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

    // Tags (Task 5.5)
    if (this.taskTagInput) {
      this.taskTagInput.setTags(task.tags || []);
    } else {
      document.getElementById('edit-task-tags').value = (task.tags || []).join(', ');
    }

    // Sync all CustomSelect instances to reflect current values
    if (window.CustomSelect) {
      window.CustomSelect.syncAll();
    }

    // Custom Field URL
    document.getElementById('edit-task-custom-url').value = (task.custom_values && task.custom_values.repository_url) || (task.custom_values && task.custom_values.figma_url) || '';

    // Subtasks
    this.renderSubtasksEditor(task.subtasks || []);

    // Supporting Image Attachments (Task 3)
    this.renderTaskAttachments(task);

    this.openModal('task-detail-modal');
  }

  renderSubtasksEditor(subtasks) {
    const list = document.getElementById('subtask-editor-list');
    if (!list) return;

    let html = '';
    subtasks.forEach((st, idx) => {
      html += `
        <div class="subtask-item">
          <label class="custom-checkbox">
            <input type="checkbox" ${st.selesai ? 'checked' : ''} onchange="window.app.toggleSubtask(${idx})">
            <span class="custom-checkbox-box"><i class="fa-solid fa-check custom-checkbox-check"></i></span>
          </label>
          <input type="text" class="subtask-title-input ${st.selesai ? 'done' : ''}" value="${this.escapeHtml(st.judul)}" onchange="window.app.updateSubtaskTitle(${idx}, this.value)">
          <button type="button" class="btn btn-ghost btn-icon-sm" onclick="window.app.deleteSubtask(${idx})" style="color: var(--color-danger);" title="Hapus Subtask"><i class="fa-solid fa-xmark"></i></button>
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

    if (window.CustomSelect) {
      window.CustomSelect.syncAll();
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
    document.getElementById('proj-modal-status').value = proj ? proj.status : 'Perencanaan';

    if (window.CustomSelect) {
      window.CustomSelect.syncAll();
    }

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

  async verifyTelegramBot() {
    const token = document.getElementById('setting-tg-token').value.trim();
    const feedback = document.getElementById('tg-bot-verify-feedback');
    if (!token) {
      if (feedback) {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = 'Masukkan Telegram Bot Token terlebih dahulu!';
      }
      return;
    }

    if (feedback) {
      feedback.style.color = 'var(--color-secondary)';
      feedback.textContent = 'Memverifikasi bot ke server Telegram...';
    }

    try {
      const res = await fetch('api.php?action=check_telegram_bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error(text.replace(/<[^>]*>?/gm, '').trim() || 'Respon server bukan format JSON');
      }
      if (data.ok && data.result) {
        const bot = data.result;
        if (feedback) {
          feedback.style.color = 'var(--color-tertiary)';
          feedback.innerHTML = `✓ Bot Valid: <b>${this.escapeHtml(bot.first_name)}</b> (<a href="https://t.me/${bot.username}" target="_blank" style="color:var(--color-tertiary); text-decoration:underline;">@${bot.username}</a>)`;
        }
      } else {
        if (feedback) {
          feedback.style.color = 'var(--color-danger)';
          feedback.textContent = `✕ Token tidak valid: ${data.description || data.error || 'Periksa kembali token Anda.'}`;
        }
      }
    } catch (e) {
      if (feedback) {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = `✕ Gagal verifikasi: ${e.message}`;
      }
    }
  }

  async detectTelegramChatId() {
    const token = document.getElementById('setting-tg-token').value.trim();
    const feedback = document.getElementById('tg-detect-feedback');
    if (!token) {
      if (feedback) {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = 'Isi Telegram Bot Token terlebih dahulu!';
      }
      return;
    }

    if (feedback) {
      feedback.style.color = 'var(--color-secondary)';
      feedback.textContent = 'Mendeteksi pesan masuk dari server Telegram...';
    }

    try {
      const res = await fetch('api.php?action=get_telegram_updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error(text.replace(/<[^>]*>?/gm, '').trim() || 'Respon server bukan format JSON');
      }
      if (data.ok && data.chat_id) {
        document.getElementById('setting-tg-chatid').value = data.chat_id;
        if (feedback) {
          feedback.style.color = 'var(--color-tertiary)';
          const name = data.first_name || data.username || 'Pengguna';
          feedback.textContent = `✓ Chat ID terdeteksi: ${data.chat_id} (${name})`;
        }
      } else {
        if (feedback) {
          feedback.style.color = 'var(--color-danger)';
          feedback.textContent = `✕ ${data.error || 'Chat ID tidak ditemukan.'}`;
        }
      }
    } catch (e) {
      if (feedback) {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = `✕ Gagal mendeteksi: ${e.message}`;
      }
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

  async refreshFromMySQL() {
    const feedback = document.getElementById('db-feedback');
    if (feedback) {
      feedback.style.color = 'var(--color-secondary)';
      feedback.textContent = 'Memuat ulang data langsung dari database MySQL (tugasin_db)...';
    }

    const success = await this.store.refreshFromBackend();
    if (feedback) {
      if (success) {
        feedback.style.color = 'var(--color-tertiary)';
        feedback.textContent = `✓ Data berhasil dimuat ulang langsung dari database MySQL! (${(this.store.data.tasks || []).length} tugas aktif).`;
        this.showToastNotification('Data berhasil dimuat ulang dari MySQL!');
      } else {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = `✕ Gagal memuat data dari MySQL: ${this.store.lastError || 'Koneksi terputus'}`;
      }
    }
    this.updateDbStatusUi();
    this.renderCurrentView();
  }

  async retryDbConnection() {
    this.showToastNotification('Menghubungkan kembali ke database MySQL...');
    await this.store.fetchFromBackend();
    this.updateDbStatusUi();
    this.renderSidebar();
    this.renderTopStats();
    this.renderCurrentView();
  }

  async clearAllDataConfirm() {
    if (confirm('PERINGATAN! Anda akan menghapus seluruh data (Semester, Mata Kuliah, Tugas, Proyek, dan Lampiran) di database MySQL sehingga menjadi KOSONG (null data).\n\nApakah Anda yakin ingin mengosongkan semua data?')) {
      const feedback = document.getElementById('db-feedback');
      if (feedback) {
        feedback.style.color = 'var(--color-secondary)';
        feedback.textContent = 'Mengosongkan seluruh data database MySQL...';
      }

      const ok = await this.store.clearAllData();
      if (ok) {
        if (feedback) {
          feedback.style.color = 'var(--color-tertiary)';
          feedback.textContent = '✓ Seluruh data berhasil dikosongkan (null data)!';
        }
        this.showToastNotification('Seluruh data di database MySQL berhasil dikosongkan (null data).');
      } else {
        if (feedback) {
          feedback.style.color = 'var(--color-danger)';
          feedback.textContent = '✕ Gagal mengosongkan data database.';
        }
        alert('Gagal mengosongkan data database MySQL. ' + (this.store.lastError || 'Periksa koneksi database.'));
      }
      this.updateDbStatusUi();
      this.renderSidebar();
      this.renderTopStats();
      this.renderCurrentView();
    }
  }

  async executeClearAllData() {
    this.closeModal('clear-data-modal');
    const feedback = document.getElementById('db-feedback');
    if (feedback) {
      feedback.style.color = 'var(--color-secondary)';
      feedback.textContent = 'Mengosongkan seluruh data database MySQL...';
    }

    const ok = await this.store.clearAllData();
    if (ok) {
      if (feedback) {
        feedback.style.color = 'var(--color-tertiary)';
        feedback.textContent = '✓ Seluruh data berhasil dikosongkan (null data)!';
      }
      this.showToastNotification('Seluruh data di database MySQL berhasil dikosongkan (null data).');
    } else {
      if (feedback) {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = '✕ Gagal mengosongkan data database.';
      }
      this.showToastNotification('Gagal mengosongkan database: ' + (this.store.lastError || ''));
    }
    this.updateDbStatusUi();
    this.renderSidebar();
    this.renderTopStats();
    this.renderCurrentView();
  }

  async executeResetDemoData() {
    this.closeModal('reset-demo-modal');
    const feedback = document.getElementById('db-feedback');
    if (feedback) {
      feedback.style.color = 'var(--color-secondary)';
      feedback.textContent = 'Mengatur ulang database ke data demo bawaan...';
    }

    const ok = await this.store.resetData();
    if (ok) {
      if (feedback) {
        feedback.style.color = 'var(--color-tertiary)';
        feedback.textContent = '✓ Database berhasil diatur ulang ke data demo bawaan!';
      }
      this.showToastNotification('Database berhasil diatur ulang ke data demo bawaan.');
    } else {
      if (feedback) {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = '✕ Gagal mengatur ulang database.';
      }
      this.showToastNotification('Gagal mengatur ulang database.');
    }
    this.updateDbStatusUi();
    this.renderSidebar();
    this.renderTopStats();
    this.renderCurrentView();
  }

  async checkDbStatus() {
    const feedback = document.getElementById('db-feedback');
    if (feedback) {
      feedback.style.color = 'var(--color-secondary)';
      feedback.textContent = 'Menguji latensi dan status koneksi MySQL...';
    }

    const start = performance.now();
    try {
      const res = await fetch('api.php?action=ping', { cache: 'no-store' });
      const latency = Math.round(performance.now() - start);
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        let snippet = text.replace(/<[^>]*>?/gm, '').trim();
        if (snippet.length > 160) snippet = snippet.substring(0, 160) + '...';
        throw new Error(
          snippet 
            ? `Respon server hosting bukan format JSON: ${snippet}` 
            : `Respon server hosting bukan format JSON (HTTP ${res.status}). Periksa konfigurasi di config.php.`
        );
      }

      if (data && data.ok) {
        if (feedback) {
          feedback.style.color = 'var(--color-tertiary)';
          feedback.textContent = `✓ MySQL terhubung! Database: ${data.database}, Tugas aktif: ${data.active_tasks}, Latensi respons: ${latency} ms.`;
        }
        this.store.dbConnected = true;
      } else {
        const errDetail = data && data.hint 
          ? `${data.error} (Petunjuk: ${data.hint})` 
          : (data ? data.error : 'Database MySQL tidak merespons ping.');
        if (feedback) {
          feedback.style.color = 'var(--color-danger)';
          feedback.textContent = `✕ ${errDetail}`;
        }
        this.store.dbConnected = false;
        this.store.lastError = errDetail;
      }
    } catch (e) {
      if (feedback) {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = `✕ Gagal terhubung ke MySQL: ${e.message}`;
      }
      this.store.dbConnected = false;
      this.store.lastError = e.message;
    }
    this.updateDbStatusUi();
  }

  // --- ATTACHMENTS (Gambar Pendukung - Task 3 & Task 4) ---
  setupAttachmentDropzone() {
    const dropzone = document.getElementById('attachment-dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt ? Array.from(dt.files) : [];
      if (files.length > 0 && this.activeEditingTaskId) {
        this.uploadAttachmentFiles(files, this.activeEditingTaskId);
      }
    });

    const fileInput = document.getElementById('attachment-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0 && this.activeEditingTaskId) {
          this.uploadAttachmentFiles(files, this.activeEditingTaskId);
        }
        e.target.value = '';
      });
    }
  }

  renderTaskAttachments(task) {
    const counterEl = document.getElementById('attachment-counter');
    const gridEl = document.getElementById('attachment-grid');
    const dropzoneEl = document.getElementById('attachment-dropzone');
    if (!gridEl) return;

    const attachments = (task && Array.isArray(task.attachments)) ? task.attachments : [];
    if (counterEl) {
      counterEl.textContent = `(${attachments.length}/10)`;
    }

    if (dropzoneEl) {
      if (attachments.length >= 10) {
        dropzoneEl.style.opacity = '0.5';
        dropzoneEl.style.pointerEvents = 'none';
      } else {
        dropzoneEl.style.opacity = '1';
        dropzoneEl.style.pointerEvents = 'auto';
      }
    }

    if (attachments.length === 0) {
      gridEl.innerHTML = `
        <div class="mono-label" style="grid-column: 1 / -1; color: var(--color-muted); font-size: 0.8rem; padding: 4px 0;">
          Belum ada gambar lampiran untuk tugas ini.
        </div>
      `;
      return;
    }

    let html = '';
    attachments.forEach((att, idx) => {
      const thumbUrl = `api.php?action=view_attachment&id=${att.id}&thumb=1`;
      html += `
        <div class="attachment-card" data-att-id="${att.id}">
          <div class="attachment-thumb-wrap" onclick="window.app.openImagePreview('${task.id}', ${idx})" title="Klik untuk memperbesar / preview">
            <img src="${thumbUrl}" alt="${this.escapeHtml(att.caption || att.file_name)}" loading="lazy">
            <div class="attachment-overlay-hint"><i class="fa-solid fa-magnifying-glass"></i> Lihat</div>
          </div>
          <div class="attachment-card-body">
            <div class="attachment-file-info" title="${this.escapeHtml(att.file_name)}">
              ${this.escapeHtml(att.file_name)}
            </div>
            <div class="attachment-meta-row">
              <span>${this.formatBytes(att.size_bytes)}</span>
              ${att.width && att.height ? `<span>${att.width}×${att.height}</span>` : ''}
            </div>
            <div class="attachment-caption-row">
              <div class="attachment-caption-text ${att.caption ? '' : 'placeholder'}"
                   onclick="window.app.promptEditCaption('${task.id}', '${att.id}', '${this.escapeHtml(att.caption || '')}')"
                   title="Klik untuk ubah keterangan">
                ${att.caption ? this.escapeHtml(att.caption) : '+ Tambah keterangan...'}
              </div>
            </div>
          </div>
          <div class="attachment-card-actions">
            ${idx > 0 ? `<button type="button" class="btn btn-ghost btn-icon-sm" onclick="window.app.moveAttachment('${task.id}', ${idx}, -1)" title="Geser ke kiri"><i class="fa-solid fa-chevron-left"></i></button>` : ''}
            ${idx < attachments.length - 1 ? `<button type="button" class="btn btn-ghost btn-icon-sm" onclick="window.app.moveAttachment('${task.id}', ${idx}, 1)" title="Geser ke kanan"><i class="fa-solid fa-chevron-right"></i></button>` : ''}
            <div style="flex: 1;"></div>
            <button type="button" class="btn btn-ghost btn-icon-sm" onclick="window.app.promptEditCaption('${task.id}', '${att.id}', '${this.escapeHtml(att.caption || '')}')" title="Ubah keterangan"><i class="fa-solid fa-pen-to-square"></i></button>
            <button type="button" class="btn btn-ghost btn-icon-sm" onclick="window.app.confirmDeleteAttachment('${task.id}', '${att.id}')" title="Hapus gambar" style="color: var(--color-danger);"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      `;
    });

    gridEl.innerHTML = html;
  }

  async uploadAttachmentFiles(files, taskId) {
    const task = this.store.getTask(taskId);
    if (!task) return;

    const currentAttachments = task.attachments || [];
    if (currentAttachments.length >= 10) {
      alert('Batas maksimal 10 gambar per task sudah tercapai.');
      return;
    }

    const remainingSlots = 10 - currentAttachments.length;
    let filesToUpload = Array.from(files);
    if (filesToUpload.length > remainingSlots) {
      alert(`Hanya dapat mengunggah ${remainingSlots} gambar lagi (maksimal 10 gambar per task).`);
      filesToUpload = filesToUpload.slice(0, remainingSlots);
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    const statusEl = document.getElementById('attachment-upload-status');

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      if (!allowedMime.includes(file.type)) {
        alert(`Format berkas "${file.name}" tidak didukung. Harap pilih gambar format JPG, PNG, WebP, atau GIF.`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        alert(`Ukuran berkas "${file.name}" (${this.formatBytes(file.size)}) melebihi batas maksimal 5 MB.`);
        continue;
      }

      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--color-tertiary)';
        statusEl.textContent = `Mengunggah berkas ${i + 1} dari ${filesToUpload.length}: ${file.name}...`;
      }

      try {
        const formData = new FormData();
        formData.append('task_id', taskId);
        formData.append('file', file);

        const res = await fetch('api.php?action=upload_attachment', {
          method: 'POST',
          body: formData
        });
        const text = await res.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch (jsonErr) {
          throw new Error(text.replace(/<[^>]*>?/gm, '').trim() || 'Respon server bukan format JSON');
        }
        if (data.ok && data.attachment) {
          this.store.addAttachmentToTask(taskId, data.attachment);
          this.showToastNotification(`✓ Gambar ${file.name} berhasil diunggah`);
        } else {
          alert(`Gagal mengunggah ${file.name}: ${data.error || 'Terjadi kesalahan sistem'}`);
        }
      } catch (err) {
        alert(`Gagal mengunggah ${file.name}: ${err.message}`);
      }
    }

    if (statusEl) {
      statusEl.style.display = 'none';
      statusEl.textContent = '';
    }

    const updatedTask = this.store.getTask(taskId);
    this.renderTaskAttachments(updatedTask);
    this.renderCurrentView();
  }

  promptEditCaption(taskId, attId, currentCaption) {
    const newCaption = prompt('Ubah keterangan gambar (opsional):', currentCaption || '');
    if (newCaption !== null) {
      this.store.updateAttachmentCaption(taskId, attId, newCaption.trim());
      const updatedTask = this.store.getTask(taskId);
      this.renderTaskAttachments(updatedTask);
      this.showToastNotification('Keterangan gambar berhasil disimpan');
    }
  }

  async confirmDeleteAttachment(taskId, attId) {
    if (confirm('Apakah Anda yakin ingin menghapus gambar lampiran ini?')) {
      await this.store.removeAttachmentFromTask(taskId, attId);
      const updatedTask = this.store.getTask(taskId);
      this.renderTaskAttachments(updatedTask);
      this.renderCurrentView();
      this.showToastNotification('Gambar lampiran berhasil dihapus');
    }
  }

  moveAttachment(taskId, currentIndex, delta) {
    const task = this.store.getTask(taskId);
    if (!task || !Array.isArray(task.attachments)) return;
    const targetIndex = currentIndex + delta;
    if (targetIndex < 0 || targetIndex >= task.attachments.length) return;

    const ids = task.attachments.map(a => a.id);
    const temp = ids[currentIndex];
    ids[currentIndex] = ids[targetIndex];
    ids[targetIndex] = temp;

    this.store.reorderTaskAttachments(taskId, ids);
    this.renderTaskAttachments(this.store.getTask(taskId));
  }

  // --- IMAGE PREVIEW & LIGHTBOX (Task 4) ---
  openImagePreview(taskId, index = 0) {
    const task = this.store.getTask(taskId);
    if (!task || !task.attachments || task.attachments.length === 0) return;

    this.activePreviewTaskId = taskId;
    this.activePreviewIndex = Math.max(0, Math.min(index, task.attachments.length - 1));
    this.previewZoom = 1;
    this.previewPan = { x: 0, y: 0 };
    this.isPanning = false;

    const modal = document.getElementById('image-preview-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.setAttribute('tabindex', '-1');
      modal.focus();
    }
    document.body.style.overflow = 'hidden';

    this.updatePreviewContent();
  }

  closeImagePreviewModal() {
    const modal = document.getElementById('image-preview-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    document.body.style.overflow = '';
    this.activePreviewTaskId = null;
    this.isPanning = false;
  }

  handlePreviewBackdropClick(e) {
    if (e.target && e.target.id === 'image-preview-modal') {
      this.closeImagePreviewModal();
    }
  }

  updatePreviewContent() {
    if (!this.activePreviewTaskId) return;
    const task = this.store.getTask(this.activePreviewTaskId);
    if (!task || !task.attachments || task.attachments.length === 0) {
      this.closeImagePreviewModal();
      return;
    }

    const attachments = task.attachments;
    if (this.activePreviewIndex >= attachments.length) {
      this.activePreviewIndex = attachments.length - 1;
    }
    if (this.activePreviewIndex < 0) {
      this.activePreviewIndex = 0;
    }

    const att = attachments[this.activePreviewIndex];

    const filenameEl = document.getElementById('preview-filename');
    const counterEl = document.getElementById('preview-counter');
    const filesizeEl = document.getElementById('preview-filesize');
    const captionEl = document.getElementById('preview-caption-display');
    const prevBtn = document.getElementById('preview-prev-btn');
    const nextBtn = document.getElementById('preview-next-btn');
    const imgEl = document.getElementById('preview-full-img');
    const spinner = document.getElementById('preview-loading-spinner');

    if (filenameEl) filenameEl.textContent = att.file_name;
    if (counterEl) counterEl.textContent = `${this.activePreviewIndex + 1} / ${attachments.length}`;
    if (filesizeEl) filesizeEl.textContent = `${this.formatBytes(att.size_bytes)} · ${att.width || '?'}×${att.height || '?'}`;
    if (captionEl) {
      captionEl.innerHTML = att.caption ? this.escapeHtml(att.caption) : '<span style="color: #64748B; font-style: italic;">(Tidak ada keterangan)</span>';
    }

    if (prevBtn) prevBtn.style.display = attachments.length > 1 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = attachments.length > 1 ? 'flex' : 'none';

    this.previewZoom = 1;
    this.previewPan = { x: 0, y: 0 };
    this.applyPreviewTransform();

    if (spinner) spinner.style.display = 'block';
    if (imgEl) {
      imgEl.style.opacity = '0.3';
      imgEl.src = `api.php?action=view_attachment&id=${att.id}`;
      imgEl.onload = () => {
        if (spinner) spinner.style.display = 'none';
        imgEl.style.opacity = '1';
      };
      imgEl.onerror = () => {
        if (spinner) spinner.style.display = 'none';
        imgEl.style.opacity = '1';
      };
    }
  }

  previewNextImage() {
    if (!this.activePreviewTaskId) return;
    const task = this.store.getTask(this.activePreviewTaskId);
    if (!task || !task.attachments || task.attachments.length <= 1) return;
    this.activePreviewIndex = (this.activePreviewIndex + 1) % task.attachments.length;
    this.updatePreviewContent();
  }

  previewPrevImage() {
    if (!this.activePreviewTaskId) return;
    const task = this.store.getTask(this.activePreviewTaskId);
    if (!task || !task.attachments || task.attachments.length <= 1) return;
    this.activePreviewIndex = (this.activePreviewIndex - 1 + task.attachments.length) % task.attachments.length;
    this.updatePreviewContent();
  }

  previewZoomIn() {
    this.previewZoom = Math.min(4, Math.round((this.previewZoom + 0.25) * 100) / 100);
    this.applyPreviewTransform();
  }

  previewZoomOut() {
    this.previewZoom = Math.max(0.5, Math.round((this.previewZoom - 0.25) * 100) / 100);
    if (this.previewZoom <= 1) {
      this.previewPan = { x: 0, y: 0 };
    }
    this.applyPreviewTransform();
  }

  previewResetZoom() {
    this.previewZoom = 1;
    this.previewPan = { x: 0, y: 0 };
    this.applyPreviewTransform();
  }

  applyPreviewTransform() {
    const imgEl = document.getElementById('preview-full-img');
    const zoomLabel = document.getElementById('preview-zoom-label');
    const stage = document.getElementById('image-preview-stage');

    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(this.previewZoom * 100)}%`;
    }
    if (imgEl) {
      imgEl.style.transform = `translate(${this.previewPan.x}px, ${this.previewPan.y}px) scale(${this.previewZoom})`;
    }
    if (stage) {
      stage.style.cursor = this.previewZoom > 1 ? (this.isPanning ? 'grabbing' : 'grab') : 'default';
    }
  }

  handlePreviewStageMouseDown(e) {
    if (this.previewZoom <= 1) return;
    if (e.target.closest('button')) return;
    this.isPanning = true;
    this.panStart = { x: e.clientX - this.previewPan.x, y: e.clientY - this.previewPan.y };
    this.applyPreviewTransform();
  }

  handlePreviewStageMouseMove(e) {
    if (!this.isPanning || this.previewZoom <= 1) return;
    this.previewPan = {
      x: e.clientX - this.panStart.x,
      y: e.clientY - this.panStart.y
    };
    this.applyPreviewTransform();
  }

  handlePreviewStageMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.applyPreviewTransform();
    }
  }

  handlePreviewTouchStart(e) {
    if (e.touches.length === 1) {
      this.touchStartPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (this.previewZoom > 1) {
        this.isPanning = true;
        this.panStart = { x: e.touches[0].clientX - this.previewPan.x, y: e.touches[0].clientY - this.previewPan.y };
      }
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchStartDist = Math.hypot(dx, dy);
    }
  }

  handlePreviewTouchMove(e) {
    if (e.touches.length === 1 && this.isPanning && this.previewZoom > 1) {
      e.preventDefault();
      this.previewPan = {
        x: e.touches[0].clientX - this.panStart.x,
        y: e.touches[0].clientY - this.panStart.y
      };
      this.applyPreviewTransform();
    } else if (e.touches.length === 2 && this.touchStartDist > 0) {
      // Pinch zoom
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / this.touchStartDist;
      this.previewZoom = Math.min(4, Math.max(0.5, Math.round(this.previewZoom * ratio * 100) / 100));
      this.touchStartDist = dist;
      this.applyPreviewTransform();
    }
  }

  handlePreviewTouchEnd(e) {
    if (this.isPanning) {
      this.isPanning = false;
    }
    if (e.changedTouches && e.changedTouches.length === 1 && this.previewZoom <= 1) {
      // Detect swipe left or right
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - this.touchStartPoint.x;
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          this.previewPrevImage();
        } else {
          this.previewNextImage();
        }
      }
    }
    this.touchStartDist = 0;
  }

  downloadActivePreviewImage() {
    if (!this.activePreviewTaskId) return;
    const task = this.store.getTask(this.activePreviewTaskId);
    if (!task || !task.attachments || !task.attachments[this.activePreviewIndex]) return;
    const att = task.attachments[this.activePreviewIndex];

    const link = document.createElement('a');
    link.href = `api.php?action=view_attachment&id=${att.id}&download=1`;
    link.download = att.file_name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async deleteActivePreviewImage() {
    if (!this.activePreviewTaskId) return;
    const task = this.store.getTask(this.activePreviewTaskId);
    if (!task || !task.attachments || !task.attachments[this.activePreviewIndex]) return;
    const att = task.attachments[this.activePreviewIndex];

    if (confirm(`Hapus gambar "${att.file_name}"?`)) {
      await this.store.removeAttachmentFromTask(this.activePreviewTaskId, att.id);
      this.showToastNotification('Gambar berhasil dihapus');

      const updatedTask = this.store.getTask(this.activePreviewTaskId);
      this.renderTaskAttachments(updatedTask);
      this.renderCurrentView();

      if (updatedTask && updatedTask.attachments && updatedTask.attachments.length > 0) {
        if (this.activePreviewIndex >= updatedTask.attachments.length) {
          this.activePreviewIndex = updatedTask.attachments.length - 1;
        }
        this.updatePreviewContent();
      } else {
        this.closeImagePreviewModal();
      }
    }
  }

  formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
