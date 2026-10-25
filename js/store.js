/**
 * TugasIn - Core Reactive Data Store
 * Conforms to PRD-TugasIn.md specification
 * Storage Layer: Full and direct relational access to MySQL (tugasin_db via api.php)
 * All data is loaded directly from and persisted into MySQL. No JSON file or localStorage cache.
 */

class Store {
  constructor() {
    this.listeners = new Set();
    this.dbConnected = false;
    this.isLoading = true;
    this.lastError = null;

    // Load cached Telegram settings and theme from localStorage as instant fallback
    let localTg = {};
    try {
      const savedTg = localStorage.getItem('tugasin_tg_settings');
      if (savedTg) localTg = JSON.parse(savedTg);
    } catch (e) {}

    // Relational in-memory state, purely mirroring MySQL database
    this.data = {
      semesters: [],
      courses: [],
      schedules: [],
      statuses: [],
      projects: [],
      tasks: [],
      settings: {
        theme: localStorage.getItem('tugasin_theme') || 'light',
        telegram_bot_token: localTg.telegram_bot_token || '',
        telegram_chat_id: localTg.telegram_chat_id || '',
        telegram_enabled: typeof localTg.telegram_enabled === 'boolean' ? localTg.telegram_enabled : false,
        default_reminder_hours: [72, 24, 2],
        snooze_minutes: 15,
        timezone: 'Asia/Jakarta'
      }
    };

    // Purge any legacy localStorage JSON cache to ensure 100% clean MySQL-only data
    try {
      localStorage.removeItem('tugasin_db_v1');
    } catch (e) {
      // Ignore if localStorage unavailable
    }

    // Initialize initial connection to MySQL
    this.initPromise = this.fetchFromBackend();
  }

  // --- AUTHORITATIVE MYSQL BACKEND SYNCHRONIZATION ---
  async fetchFromBackend() {
    this.isLoading = true;
    try {
      const res = await fetch('api.php?action=get_all', {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json'
        }
      });

      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (jsonErr) {
        let snippet = text.replace(/<[^>]*>?/gm, '').trim();
        if (snippet.length > 160) snippet = snippet.substring(0, 160) + '...';
        throw new Error(
          snippet 
            ? `Respon server hosting bukan format JSON: ${snippet}` 
            : `Respon server hosting bukan format JSON (HTTP ${res.status}). Periksa pengaturan database di config.php.`
        );
      }

      if (json && json.ok && json.data) {
        const backendSettings = json.data.settings || {};

        let cachedTg = {};
        try {
          const s = localStorage.getItem('tugasin_tg_settings');
          if (s) cachedTg = JSON.parse(s);
        } catch (e) {}

        if (backendSettings.telegram_bot_token) {
          // Backend has valid token, persist to localStorage cache
          try {
            localStorage.setItem('tugasin_tg_settings', JSON.stringify({
              telegram_bot_token: backendSettings.telegram_bot_token,
              telegram_chat_id: backendSettings.telegram_chat_id || '',
              telegram_enabled: Boolean(backendSettings.telegram_enabled)
            }));
          } catch (e) {}
        } else if (cachedTg && cachedTg.telegram_bot_token) {
          // Backend token was empty (e.g. wiped earlier or fresh database), restore from localStorage
          backendSettings.telegram_bot_token = cachedTg.telegram_bot_token;
          backendSettings.telegram_chat_id = cachedTg.telegram_chat_id || '';
          backendSettings.telegram_enabled = Boolean(cachedTg.telegram_enabled);
          // Restore to MySQL
          this.sendToBackend('save_settings', {
            telegram_bot_token: cachedTg.telegram_bot_token,
            telegram_chat_id: cachedTg.telegram_chat_id || '',
            telegram_enabled: cachedTg.telegram_enabled
          });
        }

        this.data = {
          semesters: Array.isArray(json.data.semesters) ? json.data.semesters : [],
          courses: Array.isArray(json.data.courses) ? json.data.courses : [],
          schedules: Array.isArray(json.data.schedules) ? json.data.schedules : [],
          statuses: Array.isArray(json.data.statuses) ? json.data.statuses : [],
          projects: Array.isArray(json.data.projects) ? json.data.projects : [],
          tasks: Array.isArray(json.data.tasks) ? json.data.tasks : [],
          settings: backendSettings
        };

        this.dbConnected = true;
        this.lastError = null;
        this.isLoading = false;
        this.notify();
        return true;
      } else {
        const errorMsg = json.hint ? `${json.error}\nPetunjuk: ${json.hint}` : (json.error || 'Respon data dari MySQL tidak valid.');
        throw new Error(errorMsg);
      }
    } catch (e) {
      console.error('Koneksi ke database MySQL gagal:', e);
      this.dbConnected = false;
      this.lastError = e.message;
      this.isLoading = false;
      this.notify();
      return false;
    }
  }

  async sendToBackend(action, payload = {}) {
    try {
      const res = await fetch(`api.php?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        let snippet = text.replace(/<[^>]*>?/gm, '').trim();
        if (snippet.length > 160) snippet = snippet.substring(0, 160) + '...';
        data = { ok: false, error: snippet || `Respon server bukan format JSON (HTTP ${res.status})` };
      }
      if (data && data.ok) {
        this.dbConnected = true;
        this.lastError = null;
      } else if (data && !data.ok) {
        this.lastError = data.hint ? `${data.error} (${data.hint})` : (data.error || 'Operasi database gagal.');
      }
      return data;
    } catch (e) {
      console.warn(`Gagal mengirim aksi ${action} ke MySQL:`, e);
      this.dbConnected = false;
      this.lastError = e.message;
      return { ok: false, error: e.message };
    }
  }

  async refreshFromBackend() {
    return await this.fetchFromBackend();
  }

  getDbStatus() {
    const tasks = this.data.tasks || [];
    return {
      connected: this.dbConnected,
      loading: this.isLoading,
      lastError: this.lastError,
      type: 'MySQL (MariaDB)',
      database: 'tugasin_db',
      host: '127.0.0.1:3306',
      counts: {
        semesters: (this.data.semesters || []).length,
        courses: (this.data.courses || []).length,
        tasks: tasks.length,
        activeTasks: tasks.filter(t => !t.dihapus_pada).length,
        trashedTasks: tasks.filter(t => t.dihapus_pada).length,
        projects: (this.data.projects || []).length,
        statuses: (this.data.statuses || []).length
      }
    };
  }

  save() {
    // Notify reactive subscribers of state change
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.data);
      } catch (e) {
        console.error('Error in store listener:', e);
      }
    }
  }

  // --- SEMESTERS ---
  getSemesters(includeArchived = false) {
    if (!this.data.semesters) return [];
    return this.data.semesters.filter(s => includeArchived ? true : !s.diarsipkan);
  }

  getArchivedSemesters() {
    if (!this.data.semesters) return [];
    return this.data.semesters.filter(s => s.diarsipkan);
  }

  getSemester(id) {
    if (!this.data.semesters) return null;
    return this.data.semesters.find(s => s.id === id);
  }

  addSemester(sem) {
    const newSem = {
      id: 'sem_' + Date.now(),
      nama: sem.nama || 'Semester Baru',
      tanggal_mulai: sem.tanggal_mulai || '',
      tanggal_selesai: sem.tanggal_selesai || '',
      warna: sem.warna || '#2C5EF5',
      ikon: sem.ikon || 'book-open',
      diarsipkan: false
    };
    this.data.semesters.push(newSem);
    this.save();
    this.sendToBackend('save_semester', newSem);
    return newSem;
  }

  updateSemester(id, fields) {
    const idx = this.data.semesters.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.semesters[idx] = { ...this.data.semesters[idx], ...fields };
      this.save();
      this.sendToBackend('save_semester', this.data.semesters[idx]);
    }
  }

  toggleArchiveSemester(id) {
    const s = this.getSemester(id);
    if (s) {
      s.diarsipkan = !s.diarsipkan;
      this.save();
      this.sendToBackend('save_semester', s);
    }
  }

  deleteSemester(id) {
    this.data.semesters = this.data.semesters.filter(s => s.id !== id);
    this.save();
    this.sendToBackend('delete_semester', { id });
  }

  // --- COURSES ---
  getCourses(semesterId = null) {
    if (!this.data.courses) return [];
    if (!semesterId) return this.data.courses;
    return this.data.courses.filter(c => c.semester_id === semesterId);
  }

  getCourse(id) {
    if (!this.data.courses) return null;
    return this.data.courses.find(c => c.id === id);
  }

  addCourse(course) {
    const newCourse = {
      id: 'crs_' + Date.now(),
      semester_id: course.semester_id,
      nama: course.nama || 'Mata Kuliah Baru',
      kode: course.kode || 'MK101',
      dosen: course.dosen || '',
      sks: Number(course.sks) || 3,
      warna: course.warna || '#2C5EF5',
      ikon: course.ikon || 'book',
      urutan: this.data.courses.length + 1
    };
    this.data.courses.push(newCourse);
    this.save();
    this.sendToBackend('save_course', newCourse);
    return newCourse;
  }

  updateCourse(id, fields) {
    const idx = this.data.courses.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.courses[idx] = { ...this.data.courses[idx], ...fields };
      this.save();
      this.sendToBackend('save_course', this.data.courses[idx]);
    }
  }

  deleteCourse(id) {
    this.data.courses = this.data.courses.filter(c => c.id !== id);
    if (this.data.schedules) {
      this.data.schedules = this.data.schedules.filter(s => s.course_id !== id);
    }
    this.save();
    this.sendToBackend('delete_course', { id });
  }

  // --- SCHEDULES (JADWAL KULIAH) ---
  getSchedules(filterDay = null, semesterId = null) {
    if (!this.data.schedules) return [];
    let list = [...this.data.schedules];

    if (filterDay && filterDay !== 'all') {
      list = list.filter(s => s.hari === filterDay);
    }

    if (semesterId && semesterId !== 'all') {
      const semCourses = this.getCourses(semesterId).map(c => c.id);
      list = list.filter(s => semCourses.includes(s.course_id));
    }

    const dayOrder = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 7 };
    list.sort((a, b) => {
      const orderA = dayOrder[a.hari] || 99;
      const orderB = dayOrder[b.hari] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
    });

    return list;
  }

  getTodaySchedules() {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = dayNames[new Date().getDay()];
    return this.getSchedules(currentDay);
  }

  getSchedule(id) {
    if (!this.data.schedules) return null;
    return this.data.schedules.find(s => s.id === id);
  }

  addSchedule(sch) {
    const course = this.getCourse(sch.course_id);
    const newSchedule = {
      id: 'sch_' + Date.now(),
      course_id: sch.course_id,
      hari: sch.hari || 'Senin',
      jam_mulai: sch.jam_mulai || '08:00',
      jam_selesai: sch.jam_selesai || sch.jam_mulai || '10:00',
      ruangan: sch.ruangan || '',
      dosen: sch.dosen || (course ? course.dosen : ''),
      jenis: sch.jenis || 'Kuliah',
      warna: sch.warna || (course ? course.warna : '#2C5EF5'),
      keterangan: sch.keterangan || '',
      pengingat_aktif: sch.pengingat_aktif !== undefined ? Boolean(sch.pengingat_aktif) : true,
      course_nama: course ? course.nama : '',
      course_kode: course ? course.kode : '',
      course_ikon: course ? course.ikon : 'book',
      course_warna: course ? course.warna : '#2C5EF5'
    };

    if (!this.data.schedules) this.data.schedules = [];
    this.data.schedules.push(newSchedule);
    this.save();
    this.sendToBackend('save_schedule', newSchedule);
    return newSchedule;
  }

  updateSchedule(id, fields) {
    if (!this.data.schedules) return;
    const idx = this.data.schedules.findIndex(s => s.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.schedules[idx], ...fields };
      if (fields.course_id) {
        const course = this.getCourse(fields.course_id);
        if (course) {
          updated.course_nama = course.nama;
          updated.course_kode = course.kode;
          updated.course_ikon = course.ikon;
          if (!fields.warna) updated.warna = course.warna;
        }
      }
      this.data.schedules[idx] = updated;
      this.save();
      this.sendToBackend('save_schedule', updated);
    }
  }

  deleteSchedule(id) {
    if (!this.data.schedules) return;
    this.data.schedules = this.data.schedules.filter(s => s.id !== id);
    this.save();
    this.sendToBackend('delete_schedule', { id });
  }

  // --- PROJECTS ---
  getProjects() {
    return this.data.projects || [];
  }

  getProject(id) {
    if (!this.data.projects) return null;
    return this.data.projects.find(p => p.id === id);
  }

  addProject(proj) {
    const newProj = {
      id: 'prj_' + Date.now(),
      user_id: 'usr_me',
      nama: proj.nama || 'Proyek Baru',
      deskripsi: proj.deskripsi || '',
      deadline: proj.deadline || '',
      status: proj.status || 'Perencanaan'
    };
    this.data.projects.push(newProj);
    this.save();
    this.sendToBackend('save_project', newProj);
    return newProj;
  }

  updateProject(id, fields) {
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.projects[idx] = { ...this.data.projects[idx], ...fields };
      this.save();
      this.sendToBackend('save_project', this.data.projects[idx]);
    }
  }

  deleteProject(id) {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    this.save();
    this.sendToBackend('delete_project', { id });
  }

  // --- STATUSES ---
  getStatuses() {
    if (!this.data.statuses) return [];
    return [...this.data.statuses].sort((a, b) => a.urutan - b.urutan);
  }

  getStatus(id) {
    if (!this.data.statuses) return null;
    return this.data.statuses.find(s => s.id === id);
  }

  addStatus(nama, isDone = false) {
    const newStatus = {
      id: 'st_' + Date.now(),
      nama,
      urutan: this.data.statuses.length,
      apakah_selesai: isDone
    };
    this.data.statuses.push(newStatus);
    this.save();
    this.sendToBackend('save_status', newStatus);
    return newStatus;
  }

  updateStatus(id, fields) {
    const idx = this.data.statuses.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.statuses[idx] = { ...this.data.statuses[idx], ...fields };
      this.save();
      this.sendToBackend('save_status', this.data.statuses[idx]);
    }
  }

  deleteStatus(id) {
    if (this.data.statuses.length <= 1) return; // Prevent deleting all statuses
    this.data.statuses = this.data.statuses.filter(s => s.id !== id);
    this.save();
    this.sendToBackend('delete_status', { id });
  }

  // --- TASKS ---
  getTasks(filterOptions = {}) {
    if (!this.data.tasks) return [];
    let list = this.data.tasks;

    // Soft delete filter
    if (filterOptions.trashOnly) {
      list = list.filter(t => t.dihapus_pada !== null && t.dihapus_pada !== undefined);
    } else {
      list = list.filter(t => t.dihapus_pada === null || t.dihapus_pada === undefined);
    }

    if (filterOptions.courseId) {
      list = list.filter(t => t.course_id === filterOptions.courseId);
    }

    if (filterOptions.projectId) {
      list = list.filter(t => t.project_id === filterOptions.projectId);
    }

    if (filterOptions.semesterId) {
      const courseIds = this.getCourses(filterOptions.semesterId).map(c => c.id);
      list = list.filter(t => courseIds.includes(t.course_id));
    }

    if (filterOptions.priority) {
      list = list.filter(t => t.prioritas === filterOptions.priority);
    }

    if (filterOptions.statusId) {
      list = list.filter(t => t.status_id === filterOptions.statusId);
    }

    if (filterOptions.searchQuery) {
      const q = filterOptions.searchQuery.toLowerCase();
      list = list.filter(t =>
        t.judul.toLowerCase().includes(q) ||
        (t.deskripsi && t.deskripsi.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    if (filterOptions.dueTodayOnly) {
      const todayStr = new Date().toDateString();
      list = list.filter(t => {
        if (!t.deadline) return false;
        return new Date(t.deadline).toDateString() === todayStr;
      });
    }

    if (filterOptions.dueThisWeekOnly) {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      list = list.filter(t => {
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        return d >= now && d <= nextWeek;
      });
    }

    return list;
  }

  getTask(id) {
    if (!this.data.tasks) return null;
    return this.data.tasks.find(t => t.id === id);
  }

  addTask(task) {
    const defaultCourseId = (this.data.courses && this.data.courses[0]) ? this.data.courses[0].id : '';
    const defaultStatusId = (this.data.statuses && this.data.statuses[0]) ? this.data.statuses[0].id : 'st_todo';

    const newTask = {
      id: 'tsk_' + Date.now(),
      course_id: task.course_id || defaultCourseId,
      project_id: task.project_id || null,
      status_id: task.status_id || defaultStatusId,
      judul: task.judul || 'Task Baru',
      deskripsi: task.deskripsi || '',
      prioritas: task.prioritas || 'Sedang',
      deadline: task.deadline || '',
      urutan: this.data.tasks ? this.data.tasks.length : 0,
      subtasks: task.subtasks || [],
      tags: task.tags || [],
      custom_values: task.custom_values || {},
      attachments: task.attachments || [],
      dihapus_pada: null
    };

    if (!this.data.tasks) this.data.tasks = [];
    this.data.tasks.unshift(newTask);
    this.save();
    this.sendToBackend('save_task', newTask);
    return newTask;
  }

  updateTask(id, fields) {
    const idx = this.data.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.tasks[idx] = { ...this.data.tasks[idx], ...fields };
      this.save();
      this.sendToBackend('save_task', this.data.tasks[idx]);
      return this.data.tasks[idx];
    }
    return null;
  }

  reorderTask(taskId, targetStatusId, targetIndex = 0) {
    const task = this.getTask(taskId);
    if (!task) return null;

    // Collect all active tasks in target column excluding the moved task
    const colTasks = (this.data.tasks || [])
      .filter(t => !t.dihapus_pada && t.status_id === targetStatusId && t.id !== taskId)
      .sort((a, b) => (Number(a.urutan) || 0) - (Number(b.urutan) || 0));

    // Clamp index within valid bounds
    const clampedIndex = Math.max(0, Math.min(targetIndex, colTasks.length));

    // Update target status and insert into list
    task.status_id = targetStatusId;
    colTasks.splice(clampedIndex, 0, task);

    // Reassign sequential urutan (0, 1, 2, ...) to tasks in this column
    colTasks.forEach((t, i) => {
      t.urutan = i;
    });

    this.save();

    // Persist moved task immediately to MySQL
    this.sendToBackend('save_task', task);

    // Persist affected siblings whose urutan changed
    colTasks.forEach(t => {
      if (t.id !== task.id) {
        this.sendToBackend('save_task', t);
      }
    });

    return task;
  }

  toggleTaskCompletion(id) {
    const task = this.getTask(id);
    if (!task) return;
    const currentStatus = this.getStatus(task.status_id);
    if (currentStatus && currentStatus.apakah_selesai) {
      const nonDone = this.data.statuses.find(s => !s.apakah_selesai);
      task.status_id = nonDone ? nonDone.id : 'st_todo';
    } else {
      const doneStatus = this.data.statuses.find(s => s.apakah_selesai);
      task.status_id = doneStatus ? doneStatus.id : 'st_done';
    }
    this.save();
    this.sendToBackend('save_task', task);
  }

  softDeleteTask(id) {
    const task = this.getTask(id);
    if (task) {
      task.dihapus_pada = new Date().toISOString();
      this.save();
      this.sendToBackend('delete_task', { id, permanent: false });
    }
  }

  restoreTask(id) {
    const task = this.getTask(id);
    if (task) {
      task.dihapus_pada = null;
      this.save();
      this.sendToBackend('restore_task', { id });
    }
  }

  permanentDeleteTask(id) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.save();
    this.sendToBackend('delete_task', { id, permanent: true });
  }

  emptyTrash() {
    this.data.tasks = this.data.tasks.filter(t => t.dihapus_pada === null || t.dihapus_pada === undefined);
    this.save();
    this.sendToBackend('empty_trash');
  }

  // --- ATTACHMENTS (Gambar Pendukung) ---
  getTaskAttachments(taskId) {
    const task = this.getTask(taskId);
    return (task && Array.isArray(task.attachments)) ? task.attachments : [];
  }

  addAttachmentToTask(taskId, attachment) {
    const task = this.getTask(taskId);
    if (!task) return;
    if (!Array.isArray(task.attachments)) task.attachments = [];
    task.attachments.push(attachment);
    this.save();
  }

  removeAttachmentFromTask(taskId, attachmentId) {
    const task = this.getTask(taskId);
    if (!task || !Array.isArray(task.attachments)) return;
    task.attachments = task.attachments.filter(a => a.id !== attachmentId);
    this.save();
    return this.sendToBackend('delete_attachment', { id: attachmentId, task_id: taskId });
  }

  updateAttachmentCaption(taskId, attachmentId, caption) {
    const task = this.getTask(taskId);
    if (!task || !Array.isArray(task.attachments)) return;
    const att = task.attachments.find(a => a.id === attachmentId);
    if (att) {
      att.caption = caption;
      this.save();
      return this.sendToBackend('update_attachment_caption', { id: attachmentId, caption });
    }
  }

  reorderTaskAttachments(taskId, attachmentIds) {
    const task = this.getTask(taskId);
    if (!task || !Array.isArray(task.attachments)) return;
    const map = new Map(task.attachments.map(a => [a.id, a]));
    const reordered = [];
    attachmentIds.forEach((id, idx) => {
      if (map.has(id)) {
        const item = map.get(id);
        item.urutan = idx;
        reordered.push(item);
        map.delete(id);
      }
    });
    map.forEach(item => reordered.push(item));
    task.attachments = reordered;
    this.save();
    return this.sendToBackend('reorder_attachments', { task_id: taskId, ids: attachmentIds });
  }

  async duplicateTask(taskId) {
    const original = this.getTask(taskId);
    if (!original) return null;
    const newTask = JSON.parse(JSON.stringify(original));
    newTask.id = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    newTask.judul = `${original.judul} (Salinan)`;
    newTask.dibuat_pada = new Date().toISOString();
    newTask.diubah_pada = new Date().toISOString();
    newTask.dihapus_pada = null;
    if (Array.isArray(newTask.attachments)) {
      newTask.attachments = newTask.attachments.map((att, idx) => ({
        ...att,
        id: 'att_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 6),
        task_id: newTask.id
      }));
    }
    this.data.tasks.unshift(newTask);
    this.save();
    await this.sendToBackend('save_task', newTask);
    return newTask;
  }

  isTaskOverdue(task) {
    if (!task.deadline) return false;
    const status = this.getStatus(task.status_id);
    if (status && status.apakah_selesai) return false;
    return new Date(task.deadline) < new Date();
  }

  // --- SETTINGS ---
  getSettings() {
    return this.data.settings || {};
  }

  async updateSettings(fields) {
    this.data.settings = { ...this.data.settings, ...fields };

    // Sync telegram settings to localStorage cache
    if (fields.telegram_bot_token !== undefined || fields.telegram_chat_id !== undefined || fields.telegram_enabled !== undefined) {
      try {
        localStorage.setItem('tugasin_tg_settings', JSON.stringify({
          telegram_bot_token: this.data.settings.telegram_bot_token || '',
          telegram_chat_id: this.data.settings.telegram_chat_id || '',
          telegram_enabled: Boolean(this.data.settings.telegram_enabled)
        }));
      } catch (e) {}
    }

    this.save();
    // Only send the fields being updated to avoid overwriting unrelated settings with defaults
    return await this.sendToBackend('save_settings', fields);
  }

  async clearAllData() {
    try {
      const res = await this.sendToBackend('clear_all_data');
      if (res && res.ok) {
        await this.fetchFromBackend();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Clear all data error:', e);
      return false;
    }
  }

  async resetData() {
    try {
      const res = await this.sendToBackend('reset_database');
      if (res && res.ok) {
        await this.fetchFromBackend();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Reset database error:', e);
      return false;
    }
  }
}

// Global singleton instance
window.store = new Store();
