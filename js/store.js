/**
 * TugasIn - Core Reactive Data Store
 * Conforms to PRD-TugasIn.md specification
 * Storage Layer: MySQL (tugasin_db via api.php) with instant localStorage local cache
 */

const STORAGE_KEY = 'tugasin_db_v1';

class Store {
  constructor() {
    this.listeners = new Set();
    this.dbConnected = false;
    this.init();
  }

  init() {
    // 1. Fast local cache load (0ms immediate render)
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
        if (!this.data.settings) this.data.settings = {};
        if (!this.data.settings.theme) this.data.settings.theme = 'light';
      } catch (e) {
        console.error('Failed to parse storage, loading seed data:', e);
        this.data = this.getSeedData();
        this.saveLocalOnly();
      }
    } else {
      this.data = this.getSeedData();
      this.saveLocalOnly();
    }

    // 2. Asynchronously fetch fresh source of truth from MySQL
    this.fetchFromBackend();
  }

  // --- BACKEND API SYNCHRONIZATION ---
  async fetchFromBackend() {
    try {
      const res = await fetch('api.php?action=get_all');
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          this.data = json.data;
          this.dbConnected = true;
          this.saveLocalOnly();
          this.notify();
          return true;
        }
      }
    } catch (e) {
      console.warn('MySQL backend fetch unavailable, running from local cache:', e);
      this.dbConnected = false;
    }
    return false;
  }

  async sendToBackend(action, payload = {}) {
    try {
      const res = await fetch(`api.php?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.ok) {
        this.dbConnected = true;
      }
      return data;
    } catch (e) {
      console.warn(`Failed to sync action ${action} to MySQL:`, e);
      this.dbConnected = false;
      return { ok: false, error: e.message };
    }
  }

  async syncAllToMySQL() {
    const res = await this.sendToBackend('sync_all', this.data);
    if (res && res.ok) {
      this.dbConnected = true;
      await this.fetchFromBackend();
    }
    return res;
  }

  getDbStatus() {
    return {
      connected: this.dbConnected,
      type: 'MySQL (MariaDB)',
      database: 'tugasin_db',
      host: '127.0.0.1:3306'
    };
  }

  save() {
    this.saveLocalOnly();
    this.notify();
  }

  saveLocalOnly() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
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
    this.save();
    this.sendToBackend('delete_course', { id });
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

  // --- SETTINGS & BACKUP ---
  getSettings() {
    return this.data.settings || {};
  }

  updateSettings(fields) {
    this.data.settings = { ...this.data.settings, ...fields };
    this.save();
    this.sendToBackend('save_settings', this.data.settings);
  }

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  async importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.tasks || !parsed.courses || !parsed.semesters) {
        throw new Error('Format data JSON tidak valid.');
      }
      this.data = parsed;
      this.save();
      await this.syncAllToMySQL();
      return true;
    } catch (e) {
      console.error('Import error:', e);
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
    } catch (e) {
      console.error('Reset error:', e);
    }
    this.data = this.getSeedData();
    this.save();
    return true;
  }

  getSeedData() {
    const now = new Date();
    const dateAt = (offsetDays, hours = 23, minutes = 59) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };

    const sem1Id = 'sem_5';
    const semArchivedId = 'sem_4';

    const courses = [
      { id: 'crs_web', semester_id: sem1Id, nama: 'Pemrograman Web & Mobile', kode: 'IF3101', dosen: 'Dr. Ir. Budi Santoso', sks: 3, warna: '#0284C7', ikon: 'code', urutan: 1 },
      { id: 'crs_db', semester_id: sem1Id, nama: 'Basis Data Lanjut', kode: 'IF3102', dosen: 'Siti Rahma, M.Kom', sks: 3, warna: '#D97706', ikon: 'database', urutan: 2 },
      { id: 'crs_ai', semester_id: sem1Id, nama: 'Kecerdasan Buatan', kode: 'IF3103', dosen: 'Hendra Wijaya, Ph.D', sks: 3, warna: '#2563EB', ikon: 'cpu', urutan: 3 },
      { id: 'crs_dist', semester_id: sem1Id, nama: 'Sistem Terdistribusi', kode: 'IF3104', dosen: 'Agus Pratama, M.T', sks: 3, warna: '#7C3AED', ikon: 'server', urutan: 4 },
      { id: 'crs_uiux', semester_id: sem1Id, nama: 'Desain Interaksi & UI/UX', kode: 'IF3105', dosen: 'Diana Lestari, M.Ds', sks: 2, warna: '#DB2777', ikon: 'layout', urutan: 5 }
    ];

    const statuses = [
      { id: 'st_todo', nama: 'Belum Mulai', urutan: 0, apakah_selesai: false },
      { id: 'st_prog', nama: 'Sedang Dikerjakan', urutan: 1, apakah_selesai: false },
      { id: 'st_rev', nama: 'Butuh Review', urutan: 2, apakah_selesai: false },
      { id: 'st_done', nama: 'Selesai', urutan: 3, apakah_selesai: true }
    ];

    const projects = [
      { id: 'prj_ecom', user_id: 'usr_me', nama: 'Tugas Besar: Portal E-Commerce Kampus', deskripsi: 'Aplikasi fullstack e-commerce untuk kantin dan koperasi mahasiswa.', deadline: dateAt(14), status: 'Sedang Berjalan' },
      { id: 'prj_ai_img', user_id: 'usr_me', nama: 'Mini Project: Klasifikasi Citra Medis', deskripsi: 'Model CNN transfer learning menggunakan PyTorch untuk deteksi paru-paru.', deadline: dateAt(21), status: 'Perencanaan' }
    ];

    const tasks = [
      {
        id: 'tsk_1', course_id: 'crs_web', project_id: 'prj_ecom', status_id: 'st_prog',
        judul: 'Implementasi REST API Autentikasi JWT & Role Admin',
        deskripsi: 'Membuat endpoint login, register, refresh token, dan middleware role authorization.',
        prioritas: 'Tinggi', deadline: dateAt(0, 23, 59), urutan: 0,
        subtasks: [
          { id: 'sub_1', judul: 'Setup schema User dan Token', selesai: true },
          { id: 'sub_2', judul: 'Implementasi route login & hashing bcrypt', selesai: true },
          { id: 'sub_3', judul: 'Middleware verifikasi JWT access token', selesai: false },
          { id: 'sub_4', judul: 'Unit testing authorization admin', selesai: false }
        ],
        tags: ['Backend', 'Tugas Besar'], custom_values: { url: 'https://github.com/tugasin/api-core' }, dihapus_pada: null
      },
      {
        id: 'tsk_2', course_id: 'crs_db', project_id: null, status_id: 'st_todo',
        judul: 'Laporan Praktikum 4: Optimasi Query & Normalisasi BCNF',
        deskripsi: 'Menganalisis query plan EXPLAIN pada tabel 1 juta baris dan membuat indeks komposit.',
        prioritas: 'Mendesak', deadline: dateAt(1, 17, 0), urutan: 1,
        subtasks: [
          { id: 'sub_5', judul: 'Jalankan EXPLAIN ANALYZE query lambat', selesai: true },
          { id: 'sub_6', judul: 'Buat B-Tree composite index', selesai: false },
          { id: 'sub_7', judul: 'Tulis pembahasan perbandingan execution time di laporan', selesai: false }
        ],
        tags: ['Praktikum', 'Laporan'], custom_values: {}, dihapus_pada: null
      },
      {
        id: 'tsk_3', course_id: 'crs_ai', project_id: 'prj_ai_img', status_id: 'st_prog',
        judul: 'Pembersihan Dataset Citra & Augmentasi Data (PyTorch)',
        deskripsi: 'Melakukan resize 224x224, rotasi acak, flip horizontal, dan normalisasi mean/std ImageNet.',
        prioritas: 'Sedang', deadline: dateAt(3, 21, 0), urutan: 2,
        subtasks: [
          { id: 'sub_8', judul: 'Download raw DICOM / PNG images', selesai: true },
          { id: 'sub_9', judul: 'Buat custom PyTorch Dataset & DataLoader', selesai: false }
        ],
        tags: ['Kecerdasan Buatan', 'Machine Learning'], custom_values: { url: 'https://kaggle.com/datasets/medical-chest' }, dihapus_pada: null
      },
      {
        id: 'tsk_4', course_id: 'crs_uiux', project_id: 'prj_ecom', status_id: 'st_rev',
        judul: 'Hi-Fi Prototyping & Usability Testing Alur Checkout',
        deskripsi: 'Menyelesaikan prototype interaktif Figma alur checkout payment gateway dan tes ke 5 responden.',
        prioritas: 'Tinggi', deadline: dateAt(2, 12, 0), urutan: 3,
        subtasks: [
          { id: 'sub_10', judul: 'Selesaikan layout mobile screen checkout', selesai: true },
          { id: 'sub_11', judul: 'Hubungkan micro-interaction feedback bayar', selesai: true },
          { id: 'sub_12', judul: 'Susun lembar usability testing (SUS score)', selesai: false }
        ],
        tags: ['UI/UX', 'Figma'], custom_values: { url: 'https://figma.com/file/checkout-prototype' }, dihapus_pada: null
      },
      {
        id: 'tsk_5', course_id: 'crs_dist', project_id: null, status_id: 'st_todo',
        judul: 'Tugas Mandiri: Simulasi Algoritma Konsensus Raft',
        deskripsi: 'Membaca paper Ongaro (2014) dan membuat ringkasan mekanisme leader election & log replication.',
        prioritas: 'Rendah', deadline: dateAt(6, 23, 59), urutan: 4,
        subtasks: [], tags: ['Tugas Teori'], custom_values: {}, dihapus_pada: null
      }
    ];

    return {
      semesters: [
        { id: sem1Id, nama: 'Semester 5 (Ganjil 2026/2027)', tanggal_mulai: '2026-09-01', tanggal_selesai: '2027-01-31', warna: '#2C5EF5', ikon: 'book-open', diarsipkan: false },
        { id: semArchivedId, nama: 'Semester 4 (Genap 2025/2026)', tanggal_mulai: '2026-02-01', tanggal_selesai: '2026-06-30', warna: '#64748B', ikon: 'archive', diarsipkan: true }
      ],
      courses,
      statuses,
      projects,
      tasks,
      settings: {
        theme: 'light',
        telegram_bot_token: '',
        telegram_chat_id: '',
        telegram_enabled: false,
        default_reminder_hours: [72, 24, 2],
        snooze_minutes: 15,
        timezone: 'Asia/Jakarta'
      }
    };
  }
}

// Global singleton instance
window.store = new Store();
