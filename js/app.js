/**
 * TugasIn - Main Application Orchestrator
 * Coordinates routing, modals, views, keyboard shortcuts, and state syncing
 */

const COURSE_ICONS = [
  { id: 'book', name: 'Buku / Teori', cat: 'general' },
  { id: 'book-open', name: 'Referensi / Bacaan', cat: 'general' },
  { id: 'code', name: 'Pemrograman / Koding', cat: 'tech' },
  { id: 'laptop-code', name: 'Software Engineering', cat: 'tech' },
  { id: 'database', name: 'Basis Data / SQL', cat: 'tech' },
  { id: 'server', name: 'Server / Jaringan', cat: 'tech' },
  { id: 'brain', name: 'Kecerdasan Buatan / AI', cat: 'tech' },
  { id: 'microchip', name: 'Mikrokontroler / IoT', cat: 'tech' },
  { id: 'network-wired', name: 'Infrastruktur Jaringan', cat: 'tech' },
  { id: 'terminal', name: 'CLI / Sistem Operasi', cat: 'tech' },
  { id: 'robot', name: 'Robotika / AI', cat: 'tech' },
  { id: 'mobile-screen', name: 'Mobile App Dev', cat: 'tech' },
  { id: 'globe', name: 'Web & Internet', cat: 'tech' },
  { id: 'shield-halved', name: 'Keamanan Siber', cat: 'tech' },
  { id: 'display', name: 'Sistem Komputer & Hardware', cat: 'tech' },
  { id: 'palette', name: 'Desain Grafis / UI UX', cat: 'design' },
  { id: 'pen-nib', name: 'Kepenulisan / Jurnal', cat: 'design' },
  { id: 'compass-drafting', name: 'Arsitektur / Desain', cat: 'design' },
  { id: 'layer-group', name: 'Multimedia / Layout', cat: 'design' },
  { id: 'shapes', name: 'Desain Bentuk / 3D', cat: 'design' },
  { id: 'calculator', name: 'Matematika / Kalkulus', cat: 'science' },
  { id: 'chart-line', name: 'Statistika / Analisis', cat: 'science' },
  { id: 'chart-pie', name: 'Visualisasi Data', cat: 'business' },
  { id: 'chart-simple', name: 'Probabilitas', cat: 'science' },
  { id: 'flask', name: 'Praktikum Kimia / Lab', cat: 'science' },
  { id: 'atom', name: 'Fisika / Teori', cat: 'science' },
  { id: 'dna', name: 'Bioinformatika / Sains', cat: 'science' },
  { id: 'scale-balanced', name: 'Hukum / Etika Profesi', cat: 'general' },
  { id: 'briefcase', name: 'Manajemen / Bisnis', cat: 'business' },
  { id: 'building-columns', name: 'Ekonomi / Perbankan', cat: 'business' },
  { id: 'coins', name: 'Akuntansi / Keuangan', cat: 'business' },
  { id: 'bullhorn', name: 'Komunikasi / Marketing', cat: 'business' },
  { id: 'comments', name: 'Bahasa / Diskusi', cat: 'general' },
  { id: 'graduation-cap', name: 'Akademik / Skripsi', cat: 'general' },
  { id: 'lightbulb', name: 'Kewirausahaan / Ide', cat: 'general' },
  { id: 'award', name: 'Sertifikasi / Prestasi', cat: 'general' },
  { id: 'gears', name: 'Teknik Mesin / Otomasi', cat: 'science' },
  { id: 'cloud', name: 'Cloud Computing', cat: 'tech' }
];

class App {
  constructor() {
    this.store = window.store;
    this.currentView = 'today'; // 'today', 'all', 'schedule', 'course', 'project', 'archive', 'trash', 'settings'
    this.activeCourseId = null;
    this.activeProjectId = null;
    this.viewMode = 'list'; // 'list', 'kanban', 'calendar'
    this.searchQuery = '';
    this.filterPriority = '';
    this.filterStatus = '';
    this.filterTaskType = ''; // '', 'course', 'project'
    this.quickAddType = 'course'; // 'course' | 'project'

    // Schedule view filters & state
    this.scheduleFilterDay = 'all';
    this.scheduleFilterSemester = 'all';

    // Course modal icon & color state
    this.activeCourseIcon = 'book';
    this.activeCourseColor = '#2C5EF5';

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
    this.renderCourseIconGrid();
    this.setupAttachmentDropzone();
    this.updateDbStatusUi();
    this.renderSidebar();
    this.renderTopStats();
    this.renderCurrentView();

    // Await store's initial fetch from MySQL
    if (this.store.initPromise) {
      await this.store.initPromise;
      this.updateDbStatusUi();
      this.renderSidebar();
      this.renderTopStats();
      this.renderCurrentView();
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

    // Global Search (Desktop & Mobile Sync)
    const searchInput = document.getElementById('global-search');
    const mobileSearchInput = document.getElementById('mobile-global-search');

    const handleSearchInput = (value, origin) => {
      this.searchQuery = value;
      if (origin !== 'desktop' && searchInput) searchInput.value = value;
      if (origin !== 'mobile' && mobileSearchInput) mobileSearchInput.value = value;
      this.renderCurrentView();
    };

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        handleSearchInput(e.target.value, 'desktop');
      });
    }

    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('input', (e) => {
        handleSearchInput(e.target.value, 'mobile');
      });
    }

    // Topbar dynamic shadow on scroll
    const mainContainer = document.getElementById('main-container');
    const topBar = document.getElementById('top-bar');
    if (topBar) {
      const updateScroll = () => {
        const top = (mainContainer ? mainContainer.scrollTop : 0) || window.scrollY || 0;
        topBar.classList.toggle('scrolled', top > 10);
      };
      if (mainContainer) mainContainer.addEventListener('scroll', updateScroll, { passive: true });
      window.addEventListener('scroll', updateScroll, { passive: true });
    }
  }

  // --- FORM CONTROLS INITIALIZATION (TASK 1 - 6) ---
  initFormControls() {
    if (!window.CustomSelect) return;

    // 1. Toolbar filters
    CustomSelect.enhance('#filter-task-type', {
      size: 'sm',
      placeholder: 'Semua Jenis',
      onChange: (val) => {
        this.filterTaskType = val;
        this.renderCurrentView();
      }
    });

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

    CustomSelect.enhance('#qa-project', {
      size: 'md',
      searchable: true,
      placeholder: 'Pilih Proyek'
    });

    CustomSelect.enhance('#qa-status', {
      size: 'md',
      placeholder: 'Pilih Status Awal'
    });

    CustomSelect.enhance('#qa-priority', {
      size: 'md',
      placeholder: 'Pilih Prioritas'
    });

    // 3. Edit Task Modal Selects
    CustomSelect.enhance('#edit-task-course', {
      size: 'md',
      searchable: true,
      placeholder: 'Pilih Mata Kuliah'
    });

    CustomSelect.enhance('#edit-task-project', {
      size: 'md',
      searchable: true,
      placeholder: 'Pilih Proyek'
    });

    CustomSelect.enhance('#edit-task-status', {
      size: 'md',
      placeholder: 'Pilih Status'
    });

    CustomSelect.enhance('#edit-task-priority', {
      size: 'md',
      placeholder: 'Pilih Prioritas'
    });

    // 4. Course, Project & Schedule Modal Selects
    CustomSelect.enhance('#course-modal-sem', {
      size: 'md',
      placeholder: 'Pilih Semester'
    });

    CustomSelect.enhance('#proj-modal-status', {
      size: 'md',
      placeholder: 'Status Proyek'
    });

    // Schedule Modal Selects (Premium Selects)
    CustomSelect.enhance('#schedule-modal-course', {
      size: 'md',
      searchable: true,
      placeholder: 'Pilih Mata Kuliah',
      onChange: () => {
        this.onScheduleCourseChange();
      }
    });

    CustomSelect.enhance('#schedule-modal-day', {
      size: 'md',
      placeholder: 'Pilih Hari Kuliah'
    });

    CustomSelect.enhance('#schedule-modal-type', {
      size: 'md',
      placeholder: 'Pilih Jenis Pertemuan'
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

  toggleMobileSearch(forceState) {
    const bar = document.getElementById('mobile-search-bar');
    const input = document.getElementById('mobile-global-search');
    if (!bar) return;
    const willOpen = forceState !== undefined ? forceState : !bar.classList.contains('active');
    bar.classList.toggle('active', willOpen);
    if (willOpen && input) {
      setTimeout(() => input.focus(), 80);
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

    if (notify && this.store && !this.store.isLoading) {
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

  showToast(msg, type = 'info') {
    this.showToastNotification(msg, type);
  }

  showToastNotification(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    if (type === 'info' && (msg.startsWith('✓') || msg.toLowerCase().includes('berhasil'))) {
      type = 'success';
    }

    let iconClass = 'fa-solid fa-circle-info';
    let iconColor = 'var(--color-tertiary)';
    let typeClass = 'toast-info';

    if (type === 'success') {
      iconClass = 'fa-solid fa-circle-check';
      iconColor = '#10b981';
      typeClass = 'toast-success';
    } else if (type === 'danger' || type === 'error') {
      iconClass = 'fa-solid fa-circle-xmark';
      iconColor = 'var(--color-danger)';
      typeClass = 'toast-danger';
    } else if (type === 'warning') {
      iconClass = 'fa-solid fa-triangle-exclamation';
      iconColor = '#f59e0b';
      typeClass = 'toast-warning';
    }

    const toast = document.createElement('div');
    toast.className = `toast ${typeClass}`;
    toast.innerHTML = `
      <i class="${iconClass}" style="color: ${iconColor}; font-size: 1.15rem; flex-shrink: 0;"></i>
      <div style="flex: 1; min-width: 0; padding-right: 4px;">
        <span style="font-size: 0.88rem; font-weight: 500; line-height: 1.4; color: var(--color-primary);">${this.escapeHtml(msg)}</span>
      </div>
      <button type="button" class="btn btn-ghost btn-icon-sm" style="flex-shrink: 0; width: 24px !important; height: 24px !important; min-height: 24px !important; padding: 0 !important; color: var(--color-muted);" onclick="this.closest('.toast').remove()">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 200);
      }
    }, 3500);
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

    const schedCountEl = document.getElementById('side-count-schedule');
    if (schedCountEl && this.store.getSchedules) {
      schedCountEl.textContent = this.store.getSchedules().length;
    }

    // Highlight active nav items
    document.querySelectorAll('.sidebar-nav-item').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.view === this.currentView && !this.activeCourseId && !this.activeProjectId) {
        el.classList.add('active');
      }
    });

    // Render Semesters & Courses Tree
    const treeContainer = document.getElementById('semester-tree-container');
    if (treeContainer) {
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
          const iconName = course.ikon || 'book';

          treeHtml += `
            <div class="course-item ${isActive ? 'active' : ''}" onclick="window.app.navigateTo('course', { courseId: '${course.id}' })">
              <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                <i class="fa-solid fa-${iconName}" style="color: ${course.warna || 'var(--color-secondary)'}; font-size: 0.75rem; width: 14px; text-align: center;"></i>
                <span class="course-code-tag">${this.escapeHtml(course.kode)}</span>
                <span>${this.escapeHtml(course.nama)}</span>
              </div>
              <div class="course-actions">
                <button class="btn btn-ghost btn-icon-sm" onclick="event.stopPropagation(); window.app.openCourseModal('${course.id}')" title="Edit Mata Kuliah">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
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

    // Render Projects Tree (Task 3.1)
    const projectTreeContainer = document.getElementById('project-tree-container');
    if (projectTreeContainer) {
      const projects = this.store.getProjects ? this.store.getProjects() : [];
      let projHtml = '';

      // Link: "Semua Proyek" (Overview grid)
      const isAllProjectsActive = this.currentView === 'project' && !this.activeProjectId;
      projHtml += `
        <div class="course-item ${isAllProjectsActive ? 'active' : ''}" onclick="window.app.navigateTo('project')">
          <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
            <i class="fa-solid fa-list-check" style="color: var(--color-tertiary); font-size: 0.75rem; width: 14px; text-align: center;"></i>
            <span>Semua Proyek</span>
          </div>
          <span class="nav-counter">${projects.length}</span>
        </div>
      `;

      projects.forEach(p => {
        const pTasks = activeTasks.filter(t => t.project_id === p.id);
        const isActive = this.currentView === 'project' && this.activeProjectId === p.id;

        projHtml += `
          <div class="course-item ${isActive ? 'active' : ''}" onclick="window.app.navigateTo('project', { projectId: '${p.id}' })">
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
              <i class="fa-solid fa-rocket" style="color: #2563EB; font-size: 0.75rem; width: 14px; text-align: center;"></i>
              <span style="overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(p.nama)}</span>
            </div>
            <div class="course-actions">
              <button class="btn btn-ghost btn-icon-sm" onclick="event.stopPropagation(); window.app.openProjectModal('${p.id}')" title="Edit Proyek">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
            </div>
            <span class="nav-counter">${pTasks.length}</span>
          </div>
        `;
      });

      projectTreeContainer.innerHTML = projHtml;
    }
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
    this.showToastNotification('Menampilkan tugas yang sedang dikerjakan');
  }

  // --- RENDER CURRENT VIEW ---
  renderCurrentView() {
    const titleEl = document.getElementById('breadcrumb-title');
    const subtitleEl = document.getElementById('breadcrumb-parent');
    const toolbar = document.querySelector('.view-toolbar');
    const container = document.getElementById('view-body');
    const greetingSec = document.getElementById('greeting-section');

    // Toggle Greeting Section visibility: show on today & all views, hide on course, project, settings, archive, trash
    if (greetingSec) {
      if (['today', 'all'].includes(this.currentView)) {
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

    const breadcrumbParent = document.getElementById('breadcrumb-parent');
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (breadcrumbParent) breadcrumbParent.textContent = 'TugasIn';
    if (breadcrumbTitle) {
      if (this.currentView === 'today') breadcrumbTitle.textContent = 'Hari Ini & Minggu Ini';
      else if (this.currentView === 'all') breadcrumbTitle.textContent = 'Semua Tugas';
      else if (this.currentView === 'schedule') breadcrumbTitle.textContent = 'Jadwal Kuliah';
      else if (this.currentView === 'project') breadcrumbTitle.textContent = 'Proyek & Tugas Besar';
      else if (this.currentView === 'archive') breadcrumbTitle.textContent = 'Arsip Semester';
      else if (this.currentView === 'trash') breadcrumbTitle.textContent = 'Sampah';
      else if (this.currentView === 'settings') breadcrumbTitle.textContent = 'Pengaturan';
      else if (this.currentView === 'course') {
        const c = this.store.getCourse(this.activeCourseId);
        breadcrumbTitle.textContent = c ? c.nama : 'Mata Kuliah';
      }
    }

    // Adjust filter-task-type visibility (only show on global views)
    const filterTypeEl = document.getElementById('filter-task-type');
    const filterTypeWrapper = filterTypeEl ? (
      (filterTypeEl.nextElementSibling && filterTypeEl.nextElementSibling.classList.contains('custom-select'))
        ? filterTypeEl.nextElementSibling
        : filterTypeEl
    ) : null;
    if (filterTypeWrapper) {
      if (['today', 'all'].includes(this.currentView)) {
        filterTypeWrapper.style.display = '';
        if (filterTypeEl) filterTypeEl.style.display = '';
        filterOptions.taskType = this.filterTaskType || '';
      } else {
        filterTypeWrapper.style.display = 'none';
        if (filterTypeEl) filterTypeEl.style.display = 'none';
      }
    }

    // Reset context banner by default
    const bannerSec = document.getElementById('context-banner-section');
    if (bannerSec) {
      bannerSec.style.display = 'none';
      bannerSec.innerHTML = '';
    }

    if (this.currentView === 'today') {
      if (titleEl) titleEl.textContent = 'Hari Ini & Minggu Ini';
      if (subtitleEl) subtitleEl.textContent = 'Tugas Aktif';
      if (toolbar) toolbar.style.display = 'flex';
      filterOptions.dueThisWeekOnly = true;
      const tasks = this.store.getTasks(filterOptions);
      this.renderViewContainer(tasks, {});

    } else if (this.currentView === 'all') {
      if (titleEl) titleEl.textContent = 'Semua Tugas';
      if (subtitleEl) subtitleEl.textContent = 'Seluruh Mata Kuliah & Proyek';
      if (toolbar) toolbar.style.display = 'flex';
      const tasks = this.store.getTasks(filterOptions);
      this.renderViewContainer(tasks, {});

    } else if (this.currentView === 'schedule') {
      if (titleEl) titleEl.textContent = 'Jadwal Kuliah Mingguan';
      if (subtitleEl) subtitleEl.textContent = 'Pengingat Telegram Otomatis (1 Jam & 30 Menit Sebelum Kuliah)';
      if (toolbar) toolbar.style.display = 'none';
      this.renderScheduleView();

    } else if (this.currentView === 'course') {
      const course = this.store.getCourse(this.activeCourseId);
      if (subtitleEl) subtitleEl.textContent = 'Mata Kuliah';
      if (titleEl) titleEl.textContent = course ? course.nama : 'Mata Kuliah';

      if (bannerSec && course) {
        bannerSec.style.display = 'block';
        bannerSec.innerHTML = `
          <div class="context-banner-card">
            <div class="context-banner-left">
              <span class="context-banner-icon" style="background: ${course.warna || '#2C5EF5'}20; color: ${course.warna || '#2C5EF5'};">
                <i class="fa-solid fa-${course.ikon || 'book'}"></i>
              </span>
              <div class="context-banner-info">
                <div class="context-banner-title-row">
                  <span class="badge" style="background: ${course.warna || '#2C5EF5'}15; color: ${course.warna || '#2C5EF5'}; border: 1px solid ${course.warna || '#2C5EF5'}30; font-weight: 600;">${this.escapeHtml(course.kode)}</span>
                  <h2 class="context-banner-title">${this.escapeHtml(course.nama)}</h2>
                </div>
                <div class="context-banner-meta">
                  <span><i class="fa-solid fa-graduation-cap"></i> ${course.sks} SKS</span>
                  <span>•</span>
                  <span><i class="fa-solid fa-chalkboard-user"></i> ${this.escapeHtml(course.dosen || 'Dosen Pengampu Belum Diisi')}</span>
                </div>
              </div>
            </div>
            <div class="context-banner-actions">
              <button class="btn btn-secondary btn-sm" onclick="window.app.openCourseModal('${course.id}')" title="Edit Mata Kuliah">
                <i class="fa-solid fa-pen-to-square"></i> Edit Mata Kuliah
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.app.openQuickAddModalWithCourse('${course.id}')">
                <i class="fa-solid fa-plus"></i> Tambah Tugas
              </button>
            </div>
          </div>
        `;
      }

      if (toolbar) toolbar.style.display = 'flex';
      filterOptions.courseId = this.activeCourseId;
      const tasks = this.store.getTasks(filterOptions);
      this.renderViewContainer(tasks, { courseId: this.activeCourseId });

    } else if (this.currentView === 'project') {
      if (this.activeProjectId) {
        const project = this.store.getProject(this.activeProjectId);
        if (project) {
          if (subtitleEl) subtitleEl.textContent = 'Proyek';
          if (titleEl) titleEl.textContent = project.nama;

          if (bannerSec) {
            bannerSec.style.display = 'block';
            const dlStr = project.deadline ? new Date(project.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tidak ada target';
            bannerSec.innerHTML = `
              <div class="context-banner-card">
                <div class="context-banner-left">
                  <span class="context-banner-icon" style="background: rgba(37, 99, 235, 0.15); color: #2563EB;">
                    <i class="fa-solid fa-rocket"></i>
                  </span>
                  <div class="context-banner-info">
                    <div class="context-banner-title-row">
                      <h2 class="context-banner-title">${this.escapeHtml(project.nama)}</h2>
                      <span class="badge" style="background: rgba(37, 99, 235, 0.1); color: #2563EB; border: 1px solid rgba(37, 99, 235, 0.25);">${this.escapeHtml(project.status || 'Aktif')}</span>
                    </div>
                    <div class="context-banner-meta">
                      <span><i class="fa-regular fa-calendar-check"></i> Target: ${dlStr}</span>
                      ${project.deskripsi ? `<span>•</span> <span>${this.escapeHtml(project.deskripsi)}</span>` : ''}
                    </div>
                  </div>
                </div>
                <div class="context-banner-actions">
                  <button class="btn btn-secondary btn-sm" onclick="window.app.openProjectModal('${project.id}')" title="Edit Proyek">
                    <i class="fa-solid fa-pen-to-square"></i> Edit Proyek
                  </button>
                  <button class="btn btn-primary btn-sm" onclick="window.app.openQuickAddModalWithProject('${project.id}')">
                    <i class="fa-solid fa-plus"></i> Tambah Task
                  </button>
                </div>
              </div>
            `;
          }

          if (toolbar) toolbar.style.display = 'flex';
          filterOptions.projectId = this.activeProjectId;
          const tasks = this.store.getTasks(filterOptions);
          this.renderViewContainer(tasks, { projectId: this.activeProjectId });
        } else {
          this.activeProjectId = null;
          this.renderProjectsView();
        }
      } else {
        if (titleEl) titleEl.textContent = 'Proyek & Tugas Besar';
        if (subtitleEl) subtitleEl.textContent = 'Rencana Kerja & Tugas Terukur';
        if (toolbar) toolbar.style.display = 'none';
        this.renderProjectsView();
      }

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

  renderViewContainer(tasks, context = {}) {
    if (this.viewMode === 'list') {
      this.listView.render(tasks);
    } else if (this.viewMode === 'kanban') {
      this.kanbanView.render(tasks, context);
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
        <div class="card" style="display: flex; flex-direction: column; gap: 14px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;" onclick="window.app.navigateTo('project', { projectId: '${p.id}' })">
          <div style="display: flex; align-items: flex-start; justify-content: space-between;">
            <div>
              <span class="mono-label" style="color: var(--color-tertiary);">${p.status || 'Aktif'}</span>
              <div class="h3" style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-rocket" style="color: #2563EB; font-size: 0.95rem;"></i>
                <span>${this.escapeHtml(p.nama)}</span>
              </div>
            </div>
            <div style="display: flex; gap: 4px;" onclick="event.stopPropagation();">
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

          <div style="border-top: 1px solid var(--color-border); padding-top: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;" onclick="event.stopPropagation();">
            <span class="mono-label">Deadline: ${p.deadline ? new Date(p.deadline).toLocaleDateString('id-ID') : '-'}</span>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm" onclick="window.app.openQuickAddModalWithProject('${p.id}')"><i class="fa-solid fa-plus"></i> Tambah Task</button>
              <button class="btn btn-primary btn-sm" onclick="window.app.navigateTo('project', { projectId: '${p.id}' })"><i class="fa-solid fa-arrow-right"></i> Buka</button>
            </div>
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

  // --- SCHEDULE VIEW (JADWAL KULIAH MINGGUAN & NOTIFIKASI TELEGRAM) ---
  renderScheduleView() {
    const container = document.getElementById('view-body');
    if (!container) return;

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDayIndex = new Date().getDay();
    const currentDayName = dayNames[currentDayIndex];
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const allSchedules = this.store.getSchedules ? this.store.getSchedules('all', this.scheduleFilterSemester) : [];
    const todaySchedules = allSchedules.filter(s => s.hari === currentDayName);

    // Calculate total SKS terjadwal
    const courseIds = [...new Set(allSchedules.map(s => s.course_id))];
    const totalSks = courseIds.reduce((sum, cid) => {
      const c = this.store.getCourse(cid);
      return sum + (c ? (Number(c.sks) || 0) : 0);
    }, 0);

    const settings = this.store.getSettings();
    const tgConnected = Boolean(settings.telegram_enabled && settings.telegram_bot_token && settings.telegram_chat_id);
    const semesters = this.store.getSemesters(false);
    const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    let html = `
      <div class="schedule-container">
        <!-- Header Card with Summary & Actions -->
        <div class="schedule-header-card">
          <div>
            <div class="h2" style="display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-calendar-days" style="color: var(--color-tertiary);"></i>
              <span>Jadwal Kuliah & Praktikum</span>
            </div>
            <p class="mono-label" style="margin-top: 4px;">
              Pengingat otomatis terkirim ke Telegram <b>1 jam (60 mnt)</b> dan <b>30 menit</b> sebelum kuliah
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="window.app.testScheduleReminderNow()" title="Kirim simulasi pesan pengingat ke Telegram">
              <i class="fa-brands fa-telegram" style="color: #229ED9;"></i> Tes Reminder Telegram
            </button>
            <button class="btn btn-primary btn-sm" onclick="window.app.openScheduleModal()">
              <i class="fa-solid fa-plus"></i> Tambah Jadwal Kuliah
            </button>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="schedule-stats-row">
          <div class="schedule-stat-box">
            <div class="schedule-stat-icon" style="background: rgba(44, 94, 245, 0.1); color: var(--color-tertiary);">
              <i class="fa-solid fa-clock"></i>
            </div>
            <div>
              <div class="schedule-stat-num">${allSchedules.length}</div>
              <div class="schedule-stat-label">Jadwal Terdaftar</div>
            </div>
          </div>

          <div class="schedule-stat-box">
            <div class="schedule-stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--color-success);">
              <i class="fa-solid fa-graduation-cap"></i>
            </div>
            <div>
              <div class="schedule-stat-num">${totalSks} <span style="font-size: 0.85rem; font-weight: normal;">SKS</span></div>
              <div class="schedule-stat-label">Beban Perkuliahan</div>
            </div>
          </div>

          <div class="schedule-stat-box">
            <div class="schedule-stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--color-warning);">
              <i class="fa-solid fa-calendar-day"></i>
            </div>
            <div>
              <div class="schedule-stat-num">${todaySchedules.length}</div>
              <div class="schedule-stat-label">Kuliah Hari Ini (${currentDayName})</div>
            </div>
          </div>

          <div class="schedule-stat-box" style="margin-left: auto;">
            <div class="schedule-stat-icon" style="background: ${tgConnected ? 'rgba(34, 158, 217, 0.12)' : 'rgba(239, 68, 68, 0.1)'}; color: ${tgConnected ? '#229ED9' : 'var(--color-danger)'};">
              <i class="fa-brands fa-telegram"></i>
            </div>
            <div>
              <div style="font-size: 0.88rem; font-weight: 600; color: ${tgConnected ? 'var(--color-primary)' : 'var(--color-danger)'}; display: flex; align-items: center; gap: 6px;">
                <span class="status-dot ${tgConnected ? 'active' : 'danger'}"></span>
                ${tgConnected ? 'Bot Telegram Aktif (1h & 30m)' : 'Bot Belum Terhubung'}
              </div>
              <div class="schedule-stat-label">${tgConnected ? 'Notifikasi otomatis aktif' : '<a href="#" onclick="window.app.navigateTo(\'settings\'); return false;" style="text-decoration: underline; color: var(--color-danger);">Setel token di Pengaturan</a>'}</div>
            </div>
          </div>
        </div>

        <!-- Filter & Control Toolbar -->
        <div class="schedule-toolbar">
          <!-- Day Filter Tabs -->
          <div class="schedule-day-tabs">
            <button class="schedule-day-tab ${this.scheduleFilterDay === 'all' ? 'active' : ''}" onclick="window.app.setScheduleDayFilter('all')">
              <span>Semua Hari</span>
            </button>
            <button class="schedule-day-tab ${this.scheduleFilterDay === 'today' ? 'active' : ''}" onclick="window.app.setScheduleDayFilter('today')">
              <i class="fa-solid fa-bolt" style="font-size: 0.75rem;"></i>
              <span>Hari Ini (${currentDayName})</span>
              <span class="today-badge">${todaySchedules.length}</span>
            </button>
            ${daysList.map(day => {
              const isToday = day === currentDayName;
              const count = allSchedules.filter(s => s.hari === day).length;
              const isActive = this.scheduleFilterDay === day;
              return `
                <button class="schedule-day-tab ${isActive ? 'active' : ''}" onclick="window.app.setScheduleDayFilter('${day}')">
                  <span>${day}</span>
                  ${isToday ? '<span class="today-badge">Hari Ini</span>' : ''}
                  <span style="opacity: 0.7; font-size: 0.75rem;">(${count})</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Semester Filter Dropdown with Premium Select -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <select class="filter-select" id="schedule-filter-semester-select" style="min-width: 175px;">
              <option value="all" data-icon="fa-solid fa-layer-group">Semua Semester</option>
              ${semesters.map(s => `<option value="${s.id}" data-icon="fa-solid fa-graduation-cap" ${this.scheduleFilterSemester === s.id ? 'selected' : ''}>${this.escapeHtml(s.nama)}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Weekly Schedule Columns Grid -->
        <div class="schedule-week-grid">
    `;

    // Determine which days to display
    let displayDays = daysList;
    if (this.scheduleFilterDay === 'today') {
      displayDays = [currentDayName];
    } else if (this.scheduleFilterDay !== 'all') {
      displayDays = [this.scheduleFilterDay];
    }

    displayDays.forEach(day => {
      const isToday = day === currentDayName;
      const daySchedules = allSchedules.filter(s => s.hari === day);

      html += `
        <div class="schedule-day-col ${isToday ? 'is-today' : ''}">
          <div class="schedule-col-header">
            <div class="schedule-col-title">
              <span>${day}</span>
              ${isToday ? '<span class="today-badge" style="background: rgba(44, 94, 245, 0.15); color: var(--color-tertiary); font-size: 0.68rem; padding: 2px 6px; border-radius: 4px;">HARI INI</span>' : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="schedule-col-count">${daySchedules.length} Kelas</span>
              <button class="btn btn-ghost btn-icon-sm" onclick="window.app.openScheduleModal(null, '${day}')" title="Tambah Jadwal Hari ${day}">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
          </div>

          <div class="schedule-col-cards">
      `;

      if (daySchedules.length === 0) {
        html += `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 12px; text-align: center; color: var(--color-muted); border: 1px dashed var(--color-border); border-radius: var(--radius-md); margin: auto 0;">
            <i class="fa-regular fa-calendar-xmark" style="font-size: 1.4rem; margin-bottom: 6px; opacity: 0.5;"></i>
            <span style="font-size: 0.8rem;">Tidak ada jadwal ${day}</span>
            <button class="btn btn-ghost btn-sm" style="margin-top: 8px; font-size: 0.75rem;" onclick="window.app.openScheduleModal(null, '${day}')">
              <i class="fa-solid fa-plus"></i> Tambah
            </button>
          </div>
        `;
      } else {
        daySchedules.forEach(sch => {
          const course = this.store.getCourse(sch.course_id);
          const courseCode = course ? course.kode : (sch.course_kode || 'MK');
          const courseName = course ? course.nama : (sch.course_nama || 'Mata Kuliah');
          const courseIkon = course ? (course.ikon || 'book') : (sch.course_ikon || 'book');
          const courseColor = sch.warna || (course ? course.warna : '#2C5EF5');
          const dosen = sch.dosen || (course ? course.dosen : '-');
          const ruangan = sch.ruangan || 'Ruang Kuliah';
          const jenis = sch.jenis || 'Kuliah';

          const startTime = (sch.jam_mulai || '').slice(0, 5);
          const endTime = (sch.jam_selesai || '').slice(0, 5);

          // Live status for today
          let liveIndicatorHtml = '';
          if (isToday && sch.jam_mulai) {
            if (currentHourMin >= startTime && currentHourMin <= endTime) {
              liveIndicatorHtml = `<span class="schedule-live-indicator ongoing"><i class="fa-solid fa-circle-dot"></i> Sedang Berlangsung</span>`;
            } else if (currentHourMin < startTime) {
              const [sh, sm] = startTime.split(':').map(Number);
              const [nh, nm] = currentHourMin.split(':').map(Number);
              const diffMins = (sh * 60 + sm) - (nh * 60 + nm);
              if (diffMins <= 60 && diffMins > 0) {
                liveIndicatorHtml = `<span class="schedule-live-indicator soon"><i class="fa-solid fa-clock"></i> Mulai ${diffMins} mnt lagi</span>`;
              }
            } else {
              liveIndicatorHtml = `<span style="font-size: 0.72rem; color: var(--color-muted);"><i class="fa-solid fa-check"></i> Selesai Hari Ini</span>`;
            }
          }

          html += `
            <div class="schedule-card" style="border-left-color: ${courseColor};">
              <div class="schedule-card-top">
                <span class="schedule-time-badge">
                  <i class="fa-regular fa-clock" style="font-size: 0.75rem;"></i>
                  ${startTime} - ${endTime}
                </span>
                ${liveIndicatorHtml}
              </div>

              <div class="schedule-course-title">
                <span style="width: 26px; height: 26px; border-radius: var(--radius-sm); background: ${courseColor}18; color: ${courseColor}; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0;">
                  <i class="fa-solid fa-${courseIkon}"></i>
                </span>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(courseCode)} · ${this.escapeHtml(courseName)}">
                  ${this.escapeHtml(courseCode)} · ${this.escapeHtml(courseName)}
                </span>
              </div>

              <div class="schedule-info-row">
                <div class="schedule-info-item">
                  <i class="fa-solid fa-location-dot"></i>
                  <span>${this.escapeHtml(ruangan)}</span>
                </div>
                <div class="schedule-info-item">
                  <i class="fa-solid fa-chalkboard-user"></i>
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(dosen)}</span>
                </div>
                <div class="schedule-info-item">
                  <i class="fa-solid fa-tag"></i>
                  <span class="badge" style="font-size: 0.7rem; padding: 1px 6px;">${this.escapeHtml(jenis)}</span>
                </div>
                ${sch.keterangan ? `
                  <div class="schedule-info-item" style="color: var(--color-muted); font-size: 0.78rem; margin-top: 2px;">
                    <i class="fa-regular fa-note-sticky"></i>
                    <span>${this.escapeHtml(sch.keterangan)}</span>
                  </div>
                ` : ''}
              </div>

              <div class="schedule-card-footer">
                <span class="schedule-tg-badge" title="Pengingat Telegram 1 jam dan 30 menit sebelum jadwal aktif">
                  <i class="fa-brands fa-telegram"></i> 1h & 30m
                </span>

                <div class="schedule-actions">
                  <button class="btn btn-ghost btn-icon-sm" onclick="window.app.testScheduleReminder('${sch.id}')" title="Tes Notifikasi Telegram">
                    <i class="fa-brands fa-telegram" style="color: #229ED9;"></i>
                  </button>
                  <button class="btn btn-ghost btn-icon-sm" onclick="window.app.openScheduleModal('${sch.id}')" title="Edit Jadwal">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button class="btn btn-ghost btn-icon-sm" onclick="window.app.deleteScheduleConfirm('${sch.id}')" title="Hapus Jadwal">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        });
      }

      html += `
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Enhance Schedule Semester Filter with CustomSelect
    if (window.CustomSelect) {
      CustomSelect.enhance('#schedule-filter-semester-select', {
        size: 'sm',
        placeholder: 'Semua Semester',
        onChange: (val) => {
          this.setScheduleSemesterFilter(val);
        }
      });
    }
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
                Cool engineering greys dengan aksen tunggal lime (<code>#B4FF39</code>) & font Geist seragam.
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

        <!-- Backup & Restore SQL Card -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
              <div class="h3" style="margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-file-shield" style="color: var(--color-tertiary);"></i>
                <span>Cadangkan & Pulihkan Database (.SQL)</span>
              </div>
              <div style="font-size: 0.82rem; color: var(--color-secondary);">
                Ekspor seluruh struktur skema dan rekaman data TugasIn ke dalam berkas standar <code>.sql</code> untuk arsip mandiri, atau pulihkan data dari berkas cadangan sebelumnya.
              </div>
            </div>
            <span class="mono-label" style="font-size: 0.75rem; background: var(--color-surface-elevated); padding: 4px 10px; border-radius: 20px; border: 1px solid var(--color-border); white-space: nowrap;">
              <i class="fa-solid fa-shield-halved" style="color: var(--color-tertiary);"></i> 10 Tabel Lengkap Termasuk Jadwal
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 16px;">
            <!-- Box Backup -->
            <div style="background: var(--color-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--color-border); display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
              <div>
                <div style="font-weight: 600; font-size: 0.9rem; color: var(--color-primary); display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <i class="fa-solid fa-download" style="color: var(--color-tertiary);"></i>
                  <span>Cadangkan Database (Backup .SQL)</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--color-secondary); line-height: 1.5;">
                  Unduh seluruh data (semester, mata kuliah, jadwal kuliah, tugas, subtask, proyek, status, dan pengaturan) dalam satu berkas SQL terformat query murni.
                </div>
              </div>
              <div>
                <a href="api.php?action=backup_sql" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; width: 100%; justify-content: center; text-decoration: none;">
                  <i class="fa-solid fa-cloud-arrow-down"></i> Unduh Berkas Backup (.sql)
                </a>
              </div>
            </div>

            <!-- Box Restore -->
            <div style="background: var(--color-surface); padding: 14px; border-radius: var(--radius-md); border: 1px dashed var(--color-border); display: flex; flex-direction: column; justify-content: space-between; gap: 12px; transition: border-color 0.2s, background-color 0.2s;"
              ondragover="event.preventDefault(); this.style.borderColor='var(--color-tertiary)'; this.style.background='var(--color-surface-elevated)';"
              ondragleave="this.style.borderColor='var(--color-border)'; this.style.background='var(--color-surface)';"
              ondrop="event.preventDefault(); this.style.borderColor='var(--color-border)'; this.style.background='var(--color-surface)'; window.app.handleRestoreFileSelected({ target: { files: event.dataTransfer.files } });">
              <div>
                <div style="font-weight: 600; font-size: 0.9rem; color: var(--color-primary); display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <i class="fa-solid fa-upload" style="color: #10B981;"></i>
                  <span>Pulihkan Database (Restore .SQL)</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--color-secondary); line-height: 1.5;">
                  Unggah berkas <code>.sql</code> cadangan TugasIn untuk menimpa dan memulihkan seluruh tabel dan catatan ke server database MySQL secara instan.
                </div>
              </div>
              <div>
                <input type="file" id="restore-sql-file-input" accept=".sql" style="display: none;" onchange="window.app.handleRestoreFileSelected(event)">
                <button type="button" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 8px; width: 100%; justify-content: center;" onclick="document.getElementById('restore-sql-file-input').click()">
                  <i class="fa-solid fa-folder-open"></i> Pilih Berkas SQL & Pulihkan...
                </button>
                <div style="font-size: 0.73rem; color: var(--color-muted); text-align: center; margin-top: 6px;">
                  Bisa klik tombol di atas atau tarik (drag & drop) berkas <code>.sql</code> ke kotak ini
                </div>
              </div>
            </div>
          </div>

          <div style="font-size: 0.78rem; color: var(--color-muted); display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-circle-info"></i>
            <span>Berkas backup kompatibel dengan phpMyAdmin, MySQL CLI, MariaDB, serta migrasi cPanel / VPS.</span>
          </div>
          <div id="restore-feedback" class="mono-label" style="margin-top: 10px;"></div>
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
              <div style="font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase;">Jadwal Kuliah</div>
              <div style="font-weight: 600; font-size: 0.88rem;">${(this.store.data.schedules || []).length} Jadwal</div>
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

  // --- STATUS ACTIONS (KANBAN - GLOBAL STATUSES) ---
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
    const status = this.store.getStatus(statusId);
    if (!status) return;

    if (confirm('Hapus kolom status ini? Task di kolom ini akan dipindah ke kolom pertama.')) {
      const allStatuses = this.store.getStatuses();
      const remaining = allStatuses.filter(s => s.id !== statusId);
      if (remaining.length === 0) {
        alert('Tidak dapat menghapus status terakhir. Sistem membutuhkan minimal 1 status.');
        return;
      }

      // Move tasks to first remaining status
      this.store.getTasks().forEach(t => {
        if (t.status_id === statusId) {
          this.store.updateTask(t.id, { status_id: remaining[0].id });
        }
      });
      this.store.deleteStatus(statusId);
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
    if (this.currentView === 'course' && this.activeCourseId) {
      this.openQuickAddModalWithCourse(this.activeCourseId);
      return;
    }
    if (this.currentView === 'project' && this.activeProjectId) {
      this.openQuickAddModalWithProject(this.activeProjectId);
      return;
    }

    // Global context: show type selector
    const typeSelector = document.getElementById('qa-type-selection');
    if (typeSelector) typeSelector.style.display = 'block';

    this.populateQuickAddForm();
    this.setQuickAddType(this.quickAddType || 'course');
    this.openModal('quick-add-modal');
    setTimeout(() => {
      const input = document.getElementById('qa-title');
      if (input) input.focus();
    }, 100);
  }

  openQuickAddModalWithCourse(courseId) {
    this.quickAddType = 'course';
    const typeSelector = document.getElementById('qa-type-selection');
    if (typeSelector) typeSelector.style.display = 'none';

    this.populateQuickAddForm();
    const course = this.store.getCourse(courseId);
    const subtitle = document.getElementById('qa-context-subtitle');
    if (subtitle) {
      subtitle.textContent = course ? `Menambah tugas di: ${course.kode} - ${course.nama}` : 'Menambah Tugas Mata Kuliah';
    }

    const courseSelect = document.getElementById('qa-course');
    if (courseSelect) courseSelect.value = courseId;

    const courseGroup = document.getElementById('qa-course-group');
    if (courseGroup) courseGroup.style.display = 'block';
    const projectGroup = document.getElementById('qa-project-group');
    if (projectGroup) projectGroup.style.display = 'none';

    this.refreshQuickAddStatuses('course', courseId);
    this.openModal('quick-add-modal');
    setTimeout(() => {
      const input = document.getElementById('qa-title');
      if (input) input.focus();
    }, 100);
  }

  openQuickAddModalWithProject(projectId) {
    this.quickAddType = 'project';
    const typeSelector = document.getElementById('qa-type-selection');
    if (typeSelector) typeSelector.style.display = 'none';

    this.populateQuickAddForm();
    const project = this.store.getProject(projectId);
    const subtitle = document.getElementById('qa-context-subtitle');
    if (subtitle) {
      subtitle.textContent = project ? `Menambah task di: ${project.nama}` : 'Menambah Task Project';
    }

    const projSelect = document.getElementById('qa-project');
    if (projSelect) projSelect.value = projectId;

    const courseGroup = document.getElementById('qa-course-group');
    if (courseGroup) courseGroup.style.display = 'none';
    const projectGroup = document.getElementById('qa-project-group');
    if (projectGroup) projectGroup.style.display = 'block';

    this.refreshQuickAddStatuses('project', projectId);
    this.openModal('quick-add-modal');
    setTimeout(() => {
      const input = document.getElementById('qa-title');
      if (input) input.focus();
    }, 100);
  }

  openQuickAddModalWithStatus(statusId) {
    if (this.currentView === 'course' && this.activeCourseId) {
      this.openQuickAddModalWithCourse(this.activeCourseId);
    } else if (this.currentView === 'project' && this.activeProjectId) {
      this.openQuickAddModalWithProject(this.activeProjectId);
    } else {
      this.openQuickAddModal();
    }
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

  setQuickAddType(type) {
    this.quickAddType = type;
    const btnCourse = document.getElementById('qa-type-btn-course');
    const btnProject = document.getElementById('qa-type-btn-project');
    const courseGroup = document.getElementById('qa-course-group');
    const projectGroup = document.getElementById('qa-project-group');
    const subtitle = document.getElementById('qa-context-subtitle');

    if (type === 'course') {
      if (btnCourse) {
        btnCourse.classList.add('btn-primary');
        btnCourse.classList.remove('btn-secondary');
      }
      if (btnProject) {
        btnProject.classList.remove('btn-primary');
        btnProject.classList.add('btn-secondary');
      }
      if (courseGroup) courseGroup.style.display = 'block';
      if (projectGroup) projectGroup.style.display = 'none';
      if (subtitle) subtitle.textContent = 'Menambah Tugas Mata Kuliah';

      const courseId = document.getElementById('qa-course') ? document.getElementById('qa-course').value : null;
      this.refreshQuickAddStatuses('course', courseId);
    } else {
      if (btnProject) {
        btnProject.classList.add('btn-primary');
        btnProject.classList.remove('btn-secondary');
      }
      if (btnCourse) {
        btnCourse.classList.remove('btn-primary');
        btnCourse.classList.add('btn-secondary');
      }
      if (courseGroup) courseGroup.style.display = 'none';
      if (projectGroup) projectGroup.style.display = 'block';
      if (subtitle) subtitle.textContent = 'Menambah Task Project';

      const projectId = document.getElementById('qa-project') ? document.getElementById('qa-project').value : null;
      this.refreshQuickAddStatuses('project', projectId);
    }

    if (window.CustomSelect) {
      window.CustomSelect.syncAll();
    }
  }

  onQuickAddOwnerChange() {
    if (this.quickAddType === 'course') {
      const courseId = document.getElementById('qa-course') ? document.getElementById('qa-course').value : null;
      this.refreshQuickAddStatuses('course', courseId);
    } else {
      const projectId = document.getElementById('qa-project') ? document.getElementById('qa-project').value : null;
      this.refreshQuickAddStatuses('project', projectId);
    }
  }

  refreshQuickAddStatuses(type, ownerId) {
    const statusSelect = document.getElementById('qa-status');
    if (!statusSelect) return;

    const statuses = this.store.getStatuses();
    const curVal = statusSelect.value;
    statusSelect.innerHTML = statuses.map(s => `<option value="${s.id}" ${s.id === curVal ? 'selected' : ''}>${this.escapeHtml(s.nama)}</option>`).join('');
    if (window.CustomSelect) {
      window.CustomSelect.syncAll();
    }
  }

  populateQuickAddForm() {
    // Statuses
    this.refreshQuickAddStatuses();

    // Courses
    const courseSelect = document.getElementById('qa-course');
    if (courseSelect) {
      const courses = this.store.getCourses();
      courseSelect.innerHTML = courses.map(c => `<option value="${c.id}" data-badge="${this.escapeHtml(c.kode)}">${this.escapeHtml(c.kode)} - ${this.escapeHtml(c.nama)}</option>`).join('');
      if (this.activeCourseId) courseSelect.value = this.activeCourseId;
    }

    // Projects
    const projSelect = document.getElementById('qa-project');
    if (projSelect) {
      const projects = this.store.getProjects();
      projSelect.innerHTML = projects.map(p => `<option value="${p.id}" data-dot="#2563EB">${this.escapeHtml(p.nama)}</option>`).join('');
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

    let courseId = null;
    let projectId = null;

    if (this.quickAddType === 'course') {
      courseId = document.getElementById('qa-course').value || null;
      if (!courseId) {
        this.showToastNotification('Silakan pilih mata kuliah terlebih dahulu');
        return;
      }
    } else {
      projectId = document.getElementById('qa-project').value || null;
      if (!projectId) {
        this.showToastNotification('Silakan pilih proyek terlebih dahulu');
        return;
      }
    }

    const statusId = document.getElementById('qa-status').value;
    const priority = document.getElementById('qa-priority').value;
    const deadlineVal = document.getElementById('qa-deadline').value;
    const deadline = deadlineVal ? new Date(deadlineVal).toISOString() : '';

    this.store.addTask({
      judul: title,
      course_id: courseId,
      project_id: projectId,
      status_id: statusId,
      prioritas: priority,
      deadline: deadline
    });

    this.closeModal('quick-add-modal');
    this.showToastNotification(`Task "${title}" berhasil ditambahkan`);
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

    // Context & Exclusive Ownership Display (Task 2.5 & 2.6)
    const ownerBadge = document.getElementById('task-modal-owner-badge');
    const courseGroup = document.getElementById('edit-task-course-group');
    const projectGroup = document.getElementById('edit-task-project-group');
    const courseSelect = document.getElementById('edit-task-course');
    const projSelect = document.getElementById('edit-task-project');
    const statusSelect = document.getElementById('edit-task-status');

    if (task.course_id) {
      const course = this.store.getCourse(task.course_id);
      if (ownerBadge) {
        ownerBadge.innerHTML = `<span class="badge" style="background: ${course?.warna || '#2C5EF5'}20; color: ${course?.warna || '#2C5EF5'}; border: 1px solid ${course?.warna || '#2C5EF5'}40;"><i class="fa-solid fa-graduation-cap"></i> Tugas Mata Kuliah: ${this.escapeHtml(course?.nama || '-')}</span>`;
      }
      if (courseGroup) courseGroup.style.display = 'block';
      if (projectGroup) projectGroup.style.display = 'none';

      const courses = this.store.getCourses();
      if (courseSelect) {
        courseSelect.innerHTML = courses.map(c => `<option value="${c.id}" data-badge="${this.escapeHtml(c.kode)}" ${c.id === task.course_id ? 'selected' : ''}>${this.escapeHtml(c.kode)} - ${this.escapeHtml(c.nama)}</option>`).join('');
      }

      const statuses = this.store.getStatuses();
      if (statusSelect) {
        statusSelect.innerHTML = statuses.map(s => `<option value="${s.id}" ${s.id === task.status_id ? 'selected' : ''}>${this.escapeHtml(s.nama)}</option>`).join('');
      }
    } else {
      const project = this.store.getProject(task.project_id);
      if (ownerBadge) {
        ownerBadge.innerHTML = `<span class="badge" style="background: rgba(37, 99, 235, 0.15); color: #2563EB; border: 1px solid rgba(37, 99, 235, 0.35);"><i class="fa-solid fa-rocket"></i> Task Project: ${this.escapeHtml(project?.nama || '-')}</span>`;
      }
      if (courseGroup) courseGroup.style.display = 'none';
      if (projectGroup) projectGroup.style.display = 'block';

      const projects = this.store.getProjects();
      if (projSelect) {
        projSelect.innerHTML = projects.map(p => `<option value="${p.id}" data-dot="#2563EB" ${p.id === task.project_id ? 'selected' : ''}>${this.escapeHtml(p.nama)}</option>`).join('');
      }

      const statuses = this.store.getStatuses();
      if (statusSelect) {
        statusSelect.innerHTML = statuses.map(s => `<option value="${s.id}" ${s.id === task.status_id ? 'selected' : ''}>${this.escapeHtml(s.nama)}</option>`).join('');
      }
    }

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

  onEditTaskCourseChange() {
    if (window.CustomSelect) window.CustomSelect.syncAll();
  }

  onEditTaskProjectChange() {
    if (window.CustomSelect) window.CustomSelect.syncAll();
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

    const task = this.store.getTask(this.activeEditingTaskId);
    if (!task) return;

    const title = document.getElementById('edit-task-title').value.trim();
    if (!title) return;

    const desc = document.getElementById('edit-task-desc').value;
    const statusId = document.getElementById('edit-task-status').value;
    const priority = document.getElementById('edit-task-priority').value;
    const deadlineVal = document.getElementById('edit-task-deadline').value;
    const tagsStr = document.getElementById('edit-task-tags').value;
    const customUrl = document.getElementById('edit-task-custom-url').value.trim();

    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const deadline = deadlineVal ? new Date(deadlineVal).toISOString() : '';

    let courseId = null;
    let projectId = null;
    if (task.course_id) {
      courseId = document.getElementById('edit-task-course').value || task.course_id;
    } else {
      projectId = document.getElementById('edit-task-project').value || task.project_id;
    }

    this.store.updateTask(this.activeEditingTaskId, {
      judul: title,
      deskripsi: desc,
      course_id: courseId,
      project_id: projectId,
      status_id: statusId,
      prioritas: priority,
      deadline: deadline,
      tags: tags,
      custom_values: { repository_url: customUrl }
    });

    this.closeModal('task-detail-modal');
    this.showToastNotification('Perubahan task berhasil disimpan');
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

  // --- COURSE MODAL & ICON PICKER SYSTEM ---
  renderCourseIconGrid() {
    const grid = document.getElementById('course-modal-icon-grid');
    if (!grid) return;
    if (grid.dataset.rendered === 'true') return;

    grid.innerHTML = COURSE_ICONS.map(item => `
      <button type="button" class="icon-picker-item" data-icon="${item.id}" data-name="${item.name.toLowerCase()}" onclick="window.app.selectCourseIcon('${item.id}')" title="${item.name} (${item.id})">
        <i class="fa-solid fa-${item.id}"></i>
      </button>
    `).join('');
    grid.dataset.rendered = 'true';
  }

  selectCourseIcon(iconId) {
    this.activeCourseIcon = iconId;
    const inp = document.getElementById('course-modal-icon');
    if (inp) inp.value = iconId;

    const iconI = document.getElementById('course-modal-icon-i');
    if (iconI) iconI.className = `fa-solid fa-${iconId}`;

    const iconNameEl = document.getElementById('course-modal-icon-name');
    if (iconNameEl) {
      const match = COURSE_ICONS.find(i => i.id === iconId);
      iconNameEl.textContent = match ? `${iconId} (${match.name})` : iconId;
    }

    const grid = document.getElementById('course-modal-icon-grid');
    if (grid) {
      const prevActive = grid.querySelector('.icon-picker-item.active');
      if (prevActive) prevActive.classList.remove('active');
      const newActive = grid.querySelector(`.icon-picker-item[data-icon="${iconId}"]`);
      if (newActive) newActive.classList.add('active');
    }
  }

  filterCourseIcons(keyword) {
    const q = (keyword || '').toLowerCase().trim();
    const grid = document.getElementById('course-modal-icon-grid');
    if (!grid) return;
    const children = grid.children;
    for (let i = 0; i < children.length; i++) {
      const btn = children[i];
      const id = btn.getAttribute('data-icon') || '';
      const name = btn.getAttribute('data-name') || '';
      btn.style.display = (!q || id.includes(q) || name.includes(q)) ? 'flex' : 'none';
    }
  }

  selectCourseColor(colorHex, btnEl) {
    this.activeCourseColor = colorHex;
    const inp = document.getElementById('course-modal-color');
    if (inp) inp.value = colorHex;

    const badge = document.getElementById('course-modal-icon-badge');
    if (badge) {
      badge.style.background = `${colorHex}20`;
      badge.style.color = colorHex;
    }

    const container = document.getElementById('course-modal-colors');
    if (container) {
      const prev = container.querySelector('.color-dot.active');
      if (prev) prev.classList.remove('active');
      const target = btnEl || container.querySelector(`.color-dot[data-color="${colorHex}"]`);
      if (target) target.classList.add('active');
    }
  }

  openCourseModal(courseId = null, defaultSemId = null) {
    const course = courseId ? this.store.getCourse(courseId) : null;
    document.getElementById('course-modal-id').value = course ? course.id : '';
    document.getElementById('course-modal-name').value = course ? course.nama : '';
    document.getElementById('course-modal-code').value = course ? course.kode : '';
    document.getElementById('course-modal-lecturer').value = course ? course.dosen : '';
    document.getElementById('course-modal-sks').value = course ? course.sks : 3;

    // Title & Buttons
    const titleEl = document.getElementById('course-modal-title');
    const deleteBtn = document.getElementById('course-modal-delete-btn');
    const submitBtn = document.getElementById('course-modal-submit-btn');

    if (course) {
      if (titleEl) titleEl.textContent = `Edit Mata Kuliah: ${course.nama}`;
      if (deleteBtn) deleteBtn.style.display = 'inline-flex';
      if (submitBtn) submitBtn.textContent = 'Perbarui Mata Kuliah';
    } else {
      if (titleEl) titleEl.textContent = 'Tambah Mata Kuliah Baru';
      if (deleteBtn) deleteBtn.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Simpan Mata Kuliah';
    }

    // Color & Icon
    const initialColor = course && course.warna ? course.warna : '#2C5EF5';
    const initialIcon = course && course.ikon ? course.ikon : 'book';

    this.renderCourseIconGrid();
    this.selectCourseIcon(initialIcon);
    this.selectCourseColor(initialColor);

    // Reset icon search
    const searchInp = document.getElementById('course-icon-search');
    if (searchInp) {
      searchInp.value = '';
      this.filterCourseIcons('');
    }

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
    const warna = document.getElementById('course-modal-color').value || '#2C5EF5';
    const ikon = document.getElementById('course-modal-icon').value || 'book';

    if (!nama) return;

    // Sembunyikan form modal terlebih dahulu
    this.closeModal('course-modal');

    // Simpan data ke store dan tampilkan toast berhasil
    if (id) {
      this.store.updateCourse(id, { nama, kode, dosen, sks, semester_id, warna, ikon });
      this.showToast(`Mata kuliah "${nama}" berhasil diperbarui.`, 'success');
    } else {
      this.store.addCourse({ nama, kode, dosen, sks, semester_id, warna, ikon });
      this.showToast(`Mata kuliah "${nama}" berhasil ditambahkan.`, 'success');
    }

    this.renderSidebar();
    this.renderCurrentView();
  }

  deleteCourseFromModal() {
    const id = document.getElementById('course-modal-id').value;
    if (!id) return;
    const course = this.store.getCourse(id);
    const courseName = course ? course.nama : 'Mata Kuliah';

    if (confirm(`Apakah Anda yakin ingin menghapus mata kuliah "${courseName}"?\nSeluruh tugas dan jadwal yang terkait akan ikut terhapus.`)) {
      this.store.deleteCourse(id);
      this.closeModal('course-modal');
      this.showToast(`Mata kuliah "${courseName}" berhasil dihapus.`, 'info');
      if (this.currentView === 'course' && this.activeCourseId === id) {
        this.navigateTo('all');
      } else {
        this.renderSidebar();
        this.renderCurrentView();
      }
    }
  }

  // --- SCHEDULE ACTIONS & MODAL ---
  setScheduleDayFilter(day) {
    this.scheduleFilterDay = day;
    this.renderScheduleView();
  }

  setScheduleSemesterFilter(semId) {
    this.scheduleFilterSemester = semId;
    this.renderScheduleView();
  }

  openScheduleModal(scheduleId = null, defaultDay = null) {
    const schedule = scheduleId ? this.store.getSchedule(scheduleId) : null;
    document.getElementById('schedule-modal-id').value = schedule ? schedule.id : '';

    // Populate course dropdown
    const courseSelect = document.getElementById('schedule-modal-course');
    const courses = this.store.getCourses();
    if (courses.length === 0) {
      alert('Belum ada mata kuliah yang terdaftar. Tambahkan mata kuliah terlebih dahulu di sidebar.');
      return;
    }

    // Populate datalist for lecturer suggestions from existing courses
    const datalist = document.getElementById('schedule-lecturer-list');
    if (datalist) {
      const lecturers = [...new Set(courses.map(c => (c.dosen || '').trim()).filter(Boolean))];
      datalist.innerHTML = lecturers.map(d => `<option value="${this.escapeHtml(d)}">`).join('');
    }

    // First option must be placeholder option, not immediately selecting a course
    const placeholderOption = `<option value="" disabled ${!schedule ? 'selected' : ''}>-- Pilih Mata Kuliah --</option>`;
    courseSelect.innerHTML = placeholderOption + courses.map(c => `
      <option value="${c.id}" data-icon="fa-solid fa-${c.ikon || 'book'}" data-dot="${c.warna || '#2C5EF5'}">${this.escapeHtml(c.kode)} · ${this.escapeHtml(c.nama)} (${c.sks} SKS)</option>
    `).join('');

    if (schedule) {
      courseSelect.value = schedule.course_id;
      document.getElementById('schedule-modal-day').value = schedule.hari || 'Senin';
      document.getElementById('schedule-modal-type').value = schedule.jenis || 'Kuliah';
      document.getElementById('schedule-modal-start').value = (schedule.jam_mulai || '08:00').slice(0, 5);
      document.getElementById('schedule-modal-end').value = (schedule.jam_selesai || '10:30').slice(0, 5);
      document.getElementById('schedule-modal-room').value = schedule.ruangan || '';
      
      const course = this.store.getCourse(schedule.course_id);
      document.getElementById('schedule-modal-lecturer').value = schedule.dosen || (course ? course.dosen : '') || '';
      document.getElementById('schedule-modal-notes').value = schedule.keterangan || '';
      document.getElementById('schedule-modal-reminder').checked = schedule.pengingat_aktif !== false;

      document.getElementById('schedule-modal-title').textContent = 'Edit Jadwal Kuliah';
      document.getElementById('schedule-modal-delete-btn').style.display = 'inline-flex';
      document.getElementById('schedule-modal-submit-btn').textContent = 'Perbarui Jadwal';
    } else {
      courseSelect.value = '';
      document.getElementById('schedule-modal-day').value = defaultDay || 'Senin';
      document.getElementById('schedule-modal-type').value = 'Kuliah';
      document.getElementById('schedule-modal-start').value = '08:00';
      document.getElementById('schedule-modal-end').value = '10:30';
      document.getElementById('schedule-modal-room').value = '';
      document.getElementById('schedule-modal-lecturer').value = '';
      document.getElementById('schedule-modal-notes').value = '';
      document.getElementById('schedule-modal-reminder').checked = true;

      document.getElementById('schedule-modal-title').textContent = 'Tambah Jadwal Kuliah';
      document.getElementById('schedule-modal-delete-btn').style.display = 'none';
      document.getElementById('schedule-modal-submit-btn').textContent = 'Simpan Jadwal';
    }

    if (window.CustomSelect) {
      window.CustomSelect.syncAll();
    }

    this.openModal('schedule-modal');
  }

  onScheduleCourseChange() {
    const courseId = document.getElementById('schedule-modal-course').value;
    const lecturerInput = document.getElementById('schedule-modal-lecturer');
    if (!courseId) {
      lecturerInput.value = '';
      return;
    }
    const course = this.store.getCourse(courseId);
    if (course) {
      // Integrasi otomatis: ambil data dosen dari mata kuliah yang dipilih
      lecturerInput.value = course.dosen || '';
    }
  }

  saveSchedule(e) {
    e.preventDefault();
    const id = document.getElementById('schedule-modal-id').value;
    const course_id = document.getElementById('schedule-modal-course').value;
    const hari = document.getElementById('schedule-modal-day').value;
    const jenis = document.getElementById('schedule-modal-type').value;
    const jam_mulai = document.getElementById('schedule-modal-start').value;
    const jam_selesai = document.getElementById('schedule-modal-end').value;
    const ruangan = document.getElementById('schedule-modal-room').value.trim();
    let dosen = document.getElementById('schedule-modal-lecturer').value.trim();
    const keterangan = document.getElementById('schedule-modal-notes').value.trim();
    const pengingat_aktif = document.getElementById('schedule-modal-reminder').checked;

    if (!course_id) {
      this.showToast('Silakan pilih mata kuliah terlebih dahulu.', 'warning');
      return;
    }

    if (!hari || !jam_mulai) {
      this.showToast('Harap pilih hari dan jam mulai kuliah.', 'warning');
      return;
    }

    // Jika dosen dikosongkan di form, otomatis isi dari data dosen mata kuliah
    if (!dosen) {
      const course = this.store.getCourse(course_id);
      if (course && course.dosen) {
        dosen = course.dosen;
      }
    }

    if (id) {
      this.store.updateSchedule(id, {
        course_id, hari, jenis, jam_mulai, jam_selesai, ruangan, dosen, keterangan, pengingat_aktif
      });
      this.showToast('Jadwal kuliah berhasil diperbarui.', 'success');
    } else {
      this.store.addSchedule({
        course_id, hari, jenis, jam_mulai, jam_selesai, ruangan, dosen, keterangan, pengingat_aktif
      });
      this.showToast('Jadwal kuliah baru berhasil ditambahkan.', 'success');
    }

    this.closeModal('schedule-modal');
    this.renderSidebar();
    if (this.currentView === 'schedule') {
      this.renderScheduleView();
    } else if (this.currentView === 'course' && this.activeCourseId === course_id) {
      this.renderCourseView(course_id);
    }
  }

  deleteScheduleConfirm(scheduleId) {
    const sch = this.store.getSchedule(scheduleId);
    const label = sch ? `${sch.hari} ${sch.jam_mulai}` : 'jadwal';
    if (confirm(`Apakah Anda yakin ingin menghapus ${label}?`)) {
      this.store.deleteSchedule(scheduleId);
      this.showToast('Jadwal kuliah berhasil dihapus.', 'info');
      this.renderSidebar();
      if (this.currentView === 'schedule') {
        this.renderScheduleView();
      }
    }
  }

  deleteScheduleFromModal() {
    const id = document.getElementById('schedule-modal-id').value;
    if (id) {
      this.deleteScheduleConfirm(id);
      this.closeModal('schedule-modal');
    }
  }

  async testScheduleReminder(scheduleId) {
    this.showToast('Mengirim pengingat Telegram...', 'info');
    try {
      const res = await fetch(`api.php?action=test_schedule_reminder&schedule_id=${encodeURIComponent(scheduleId)}&type=60m`);
      const data = await res.json();
      if (data.ok) {
        this.showToast('Notifikasi pengingat jadwal berhasil terkirim ke Telegram!', 'success');
      } else {
        this.showToast(`Gagal kirim notifikasi Telegram: ${data.error || 'Periksa token bot'}`, 'error');
      }
    } catch (e) {
      this.showToast(`Error koneksi Telegram: ${e.message}`, 'error');
    }
  }

  async testScheduleReminderNow() {
    const schedules = this.store.getSchedules ? this.store.getSchedules() : [];
    if (schedules.length === 0) {
      alert('Belum ada jadwal kuliah yang terdaftar. Tambahkan jadwal kuliah terlebih dahulu untuk mengetes notifikasi.');
      return;
    }
    await this.testScheduleReminder(schedules[0].id);
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
  async saveTelegramSettings(e) {
    e.preventDefault();
    const token = document.getElementById('setting-tg-token').value.trim();
    const chatId = document.getElementById('setting-tg-chatid').value.trim();
    const enabled = document.getElementById('setting-tg-enabled').checked;

    const feedback = document.getElementById('tg-test-feedback');
    if (feedback) {
      feedback.style.color = 'var(--color-secondary)';
      feedback.textContent = 'Menyimpan pengaturan ke database...';
    }

    const res = await this.store.updateSettings({
      telegram_bot_token: token,
      telegram_chat_id: chatId,
      telegram_enabled: enabled
    });

    if (feedback) {
      if (res && res.ok !== false) {
        feedback.style.color = 'var(--color-tertiary)';
        feedback.textContent = '✓ Pengaturan Telegram berhasil disimpan permanen!';
        this.showToast('Pengaturan Telegram berhasil disimpan.', 'success');
      } else {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = '✕ Gagal menyimpan ke server: ' + (res?.error || 'Kesalahan koneksi');
        this.showToast('Gagal menyimpan ke server database.', 'error');
      }
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

    let bot = null;
    let viaFallback = false;
    let errorMsg = '';

    // 1. Coba lewat proxy PHP backend terlebih dahulu
    try {
      const res = await fetch('api.php?action=check_telegram_bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (e) {}
      if (data && data.ok && data.result) {
        bot = data.result;
      } else if (data && data.description) {
        errorMsg = data.description;
      } else if (data && data.error) {
        errorMsg = data.error;
      }
    } catch (e) {
      errorMsg = e.message;
    }

    // 2. Jika backend PHP timeout/gagal (misal hosting blokir koneksi keluar cURL),
    // otomatis verifikasi langsung dari browser pengguna ke api.telegram.org (didukung resmi via CORS)
    if (!bot) {
      try {
        if (feedback) {
          feedback.textContent = 'Server hosting lambat/timeout. Mencoba verifikasi langsung dari browser...';
        }
        const directRes = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/getMe`, {
          method: 'GET'
        });
        const directData = await directRes.json();
        if (directData && directData.ok && directData.result) {
          bot = directData.result;
          viaFallback = true;
        } else if (directData && directData.description) {
          errorMsg = directData.description;
        }
      } catch (directErr) {
        console.warn('Direct Telegram getMe also failed:', directErr);
      }
    }

    if (bot) {
      if (feedback) {
        feedback.style.color = 'var(--color-tertiary)';
        const note = viaFallback ? ' <span style="font-size: 0.72rem; color: var(--color-muted);">(Terverifikasi via browser)</span>' : '';
        feedback.innerHTML = `✓ Bot Valid: <b>${this.escapeHtml(bot.first_name)}</b> (<a href="https://t.me/${bot.username}" target="_blank" style="color:var(--color-tertiary); text-decoration:underline;">@${bot.username}</a>)${note}`;
      }
    } else {
      if (feedback) {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = `✕ Token tidak valid atau koneksi gagal: ${errorMsg || 'Periksa kembali token Anda atau koneksi internet.'}`;
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

    let detectedChatId = null;
    let detectedName = 'Pengguna';
    let viaFallback = false;
    let errorMsg = '';

    // 1. Coba via proxy PHP backend
    try {
      const res = await fetch('api.php?action=get_telegram_updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (e) {}
      if (data && data.ok && data.chat_id) {
        detectedChatId = data.chat_id;
        detectedName = data.first_name || data.username || 'Pengguna';
      } else if (data && data.error) {
        errorMsg = data.error;
      }
    } catch (e) {
      errorMsg = e.message;
    }

    // 2. Fallback langsung dari browser jika backend timeout/gagal
    if (!detectedChatId) {
      try {
        if (feedback) {
          feedback.textContent = 'Server hosting lambat/timeout. Mencoba deteksi langsung dari browser...';
        }
        const directRes = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/getUpdates`, {
          method: 'GET'
        });
        const directData = await directRes.json();
        if (directData && directData.ok && Array.isArray(directData.result) && directData.result.length > 0) {
          for (let i = directData.result.length - 1; i >= 0; i--) {
            const u = directData.result[i];
            const msg = u.message || u.edited_message || u.channel_post;
            if (msg && msg.chat && msg.chat.id) {
              detectedChatId = String(msg.chat.id);
              detectedName = msg.chat.first_name || msg.chat.title || msg.chat.username || 'Pengguna';
              viaFallback = true;
              break;
            }
          }
        } else if (directData && directData.description) {
          errorMsg = directData.description;
        }
      } catch (directErr) {
        console.warn('Direct Telegram getUpdates failed:', directErr);
      }
    }

    if (detectedChatId) {
      document.getElementById('setting-tg-chatid').value = detectedChatId;
      // Simpan langsung token dan chat ID agar tidak hilang jika tab tertutup
      this.store.updateSettings({
        telegram_bot_token: token,
        telegram_chat_id: detectedChatId
      });
      if (feedback) {
        feedback.style.color = 'var(--color-tertiary)';
        const note = viaFallback ? ' <span style="font-size: 0.72rem; color: var(--color-muted);">(Terdeteksi via browser)</span>' : '';
        feedback.innerHTML = `✓ Chat ID terdeteksi: <b>${detectedChatId}</b> (${this.escapeHtml(detectedName)}) dan tersimpan otomatis!${note}`;
      }
    } else {
      if (feedback) {
        feedback.style.color = 'var(--color-danger)';
        feedback.innerHTML = `✕ Chat ID tidak ditemukan. Pastikan Anda sudah membuka bot di Telegram dan menekan tombol <b>START</b> (atau kirim <code>/start</code>), lalu coba klik tombol deteksi ini lagi.`;
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

  handleRestoreFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.sql')) {
      this.showToastNotification('Format berkas harus berupa file berekstensi .sql');
      event.target.value = '';
      return;
    }

    this.selectedRestoreFile = file;

    const sizeStr = file.size < 1024 
      ? file.size + ' Bytes' 
      : (file.size < 1024 * 1024 
          ? (file.size / 1024).toFixed(1) + ' KB' 
          : (file.size / (1024 * 1024)).toFixed(2) + ' MB');

    const nameEl = document.getElementById('restore-file-name');
    const sizeEl = document.getElementById('restore-file-size');
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = 'Ukuran: ' + sizeStr + ' · Tipe: SQL Dump Berkas';

    this.openModal('restore-sql-modal');
  }

  async submitRestoreSql() {
    if (!this.selectedRestoreFile) {
      this.showToastNotification('Silakan pilih berkas .sql terlebih dahulu.');
      return;
    }

    const btn = document.getElementById('btn-execute-restore-sql');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memulihkan Database...';
    }

    const feedback = document.getElementById('restore-feedback');
    if (feedback) {
      feedback.style.color = 'var(--color-secondary)';
      feedback.textContent = 'Mengunggah dan mengeksekusi berkas SQL ke database MySQL...';
    }

    try {
      const formData = new FormData();
      formData.append('sql_file', this.selectedRestoreFile);

      const res = await fetch('api.php?action=restore_sql', {
        method: 'POST',
        body: formData,
        cache: 'no-store'
      });

      const data = await res.json();
      if (data && data.ok) {
        this.closeModal('restore-sql-modal');
        this.showToastNotification(data.message || 'Database berhasil dipulihkan!');
        
        if (feedback) {
          feedback.style.color = 'var(--color-tertiary)';
          feedback.textContent = '✓ ' + (data.message || 'Database berhasil dipulihkan!');
        }

        // Muat ulang seluruh store dari database relasional
        await this.store.fetchFromBackend();
        this.updateDbStatusUi();
        this.renderSidebar();
        this.renderTopStats();
        this.renderCurrentView();
      } else {
        const errorMsg = (data && data.error) ? data.error : 'Terjadi kegagalan saat merestore database.';
        alert('Gagal memulihkan database:\n' + errorMsg);
        if (feedback) {
          feedback.style.color = 'var(--color-danger)';
          feedback.textContent = '✕ Gagal memulihkan database: ' + errorMsg;
        }
      }
    } catch (err) {
      console.error('Restore SQL error:', err);
      alert('Terjadi kesalahan jaringan atau server saat merestore database:\n' + err.message);
      if (feedback) {
        feedback.style.color = 'var(--color-danger)';
        feedback.textContent = '✕ Error: ' + err.message;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
      const fileInput = document.getElementById('restore-sql-file-input');
      if (fileInput) fileInput.value = '';
      this.selectedRestoreFile = null;
    }
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
