/**
 * TugasIn - Core Reactive Data Store
 * Conforms to PRD-TugasIn.md specification
 */

const STORAGE_KEY = 'tugasin_db_v1';

class Store {
  constructor() {
    this.listeners = new Set();
    this.init();
  }

  init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse storage, loading seed data:', e);
        this.data = this.getSeedData();
        this.save();
      }
    } else {
      this.data = this.getSeedData();
      this.save();
    }
  }

  getSeedData() {
    const now = new Date();
    // Helper to format ISO date strings
    const dateAt = (offsetDays, hours = 23, minutes = 59) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };

    const sem1Id = 'sem_5';
    const semArchivedId = 'sem_4';

    const courses = [
      {
        id: 'crs_web',
        semester_id: sem1Id,
        nama: 'Pemrograman Web & Mobile',
        kode: 'IF3101',
        dosen: 'Dr. Ir. Budi Santoso',
        sks: 3,
        warna: '#38BDF8',
        ikon: 'code',
        urutan: 1
      },
      {
        id: 'crs_db',
        semester_id: sem1Id,
        nama: 'Basis Data Lanjut',
        kode: 'IF3102',
        dosen: 'Siti Rahma, M.Kom',
        sks: 3,
        warna: '#F59E0B',
        ikon: 'database',
        urutan: 2
      },
      {
        id: 'crs_ai',
        semester_id: sem1Id,
        nama: 'Kecerdasan Buatan',
        kode: 'IF3103',
        dosen: 'Hendra Wijaya, Ph.D',
        sks: 3,
        warna: '#B4FF39',
        ikon: 'cpu',
        urutan: 3
      },
      {
        id: 'crs_dist',
        semester_id: sem1Id,
        nama: 'Sistem Terdistribusi',
        kode: 'IF3104',
        dosen: 'Agus Pratama, M.T',
        sks: 3,
        warna: '#A855F7',
        ikon: 'server',
        urutan: 4
      },
      {
        id: 'crs_uiux',
        semester_id: sem1Id,
        nama: 'Desain Interaksi & UI/UX',
        kode: 'IF3105',
        dosen: 'Diana Lestari, M.Ds',
        sks: 2,
        warna: '#EC4899',
        ikon: 'layout',
        urutan: 5
      }
    ];

    const statuses = [
      { id: 'st_todo', nama: 'Belum Mulai', urutan: 0, apakah_selesai: false },
      { id: 'st_prog', nama: 'Sedang Dikerjakan', urutan: 1, apakah_selesai: false },
      { id: 'st_rev', nama: 'Butuh Review', urutan: 2, apakah_selesai: false },
      { id: 'st_done', nama: 'Selesai', urutan: 3, apakah_selesai: true }
    ];

    const projects = [
      {
        id: 'prj_ecom',
        user_id: 'user_1',
        nama: 'Tugas Besar: Portal E-Commerce Kampus',
        deskripsi: 'Aplikasi fullstack e-commerce untuk kantin dan koperasi mahasiswa.',
        deadline: dateAt(14),
        status: 'Sedang Berjalan'
      },
      {
        id: 'prj_ai_img',
        user_id: 'user_1',
        nama: 'Mini Project: Klasifikasi Citra Medis',
        deskripsi: 'Model CNN transfer learning menggunakan PyTorch untuk deteksi paru-paru.',
        deadline: dateAt(21),
        status: 'Perencanaan'
      }
    ];

    const tasks = [
      {
        id: 'tsk_1',
        course_id: 'crs_web',
        project_id: 'prj_ecom',
        status_id: 'st_prog',
        judul: 'Implementasi REST API Autentikasi JWT & Role Admin',
        deskripsi: 'Membuat endpoint login, register, refresh token, dan middleware role authorization.',
        prioritas: 'Tinggi',
        deadline: dateAt(0, 23, 59), // Hari ini!
        urutan: 0,
        subtasks: [
          { id: 'sub_1', judul: 'Setup schema User dan Token', selesai: true },
          { id: 'sub_2', judul: 'Implementasi route login & hashing bcrypt', selesai: true },
          { id: 'sub_3', judul: 'Middleware validasi JWT Bearer token', selesai: false },
          { id: 'sub_4', judul: 'Unit testing endpoint auth dengan Postman', selesai: false }
        ],
        tags: ['Backend', 'Tugas Besar'],
        custom_values: { repository_url: 'https://github.com/student/ecommerce-auth' },
        reminders: [{ id: 'rem_1', offset_hours: 2, sent: false }],
        dihapus_pada: null
      },
      {
        id: 'tsk_2',
        course_id: 'crs_db',
        project_id: null,
        status_id: 'st_todo',
        judul: 'Laporan Praktikum 4: Optimasi Query & Normalisasi BCNF',
        deskripsi: 'Menganalisis execution plan (EXPLAIN ANALYZE) pada tabel dengan 500k row.',
        prioritas: 'Mendesak',
        deadline: dateAt(1, 17, 0), // Besok
        urutan: 1,
        subtasks: [
          { id: 'sub_21', judul: 'Download dataset latihan', selesai: true },
          { id: 'sub_22', judul: 'Bandingkan waktu query sebelum dan sesudah index', selesai: false },
          { id: 'sub_23', judul: 'Format laporan ke PDF sesuai template', selesai: false }
        ],
        tags: ['Praktikum', 'Laporan'],
        custom_values: {},
        reminders: [{ id: 'rem_2', offset_hours: 6, sent: false }],
        dihapus_pada: null
      },
      {
        id: 'tsk_3',
        course_id: 'crs_ai',
        project_id: 'prj_ai_img',
        status_id: 'st_prog',
        judul: 'Pembersihan Dataset Citra & Augmentasi Data (PyTorch)',
        deskripsi: 'Resize citra ke 224x224, normalisasi mean/std ImageNet, dan split data train-val-test 80:10:10.',
        prioritas: 'Sedang',
        deadline: dateAt(3, 21, 0), // 3 hari lagi
        urutan: 2,
        subtasks: [
          { id: 'sub_31', judul: 'Download dataset Kaggle', selesai: true },
          { id: 'sub_32', judul: 'Buat script DataLoader & Transform', selesai: false }
        ],
        tags: ['Kecerdasan Buatan', 'Machine Learning'],
        custom_values: {},
        reminders: [],
        dihapus_pada: null
      },
      {
        id: 'tsk_4',
        course_id: 'crs_dist',
        project_id: null,
        status_id: 'st_todo',
        judul: 'Tugas Mandiri: Simulasi Algoritma Konsensus Raft',
        deskripsi: 'Membuat ringkasan tahapan Leader Election dan Log Replication pada Raft.',
        prioritas: 'Rendah',
        deadline: dateAt(6, 23, 59), // 6 hari lagi
        urutan: 3,
        subtasks: [],
        tags: ['Tugas Teori'],
        custom_values: {},
        reminders: [],
        dihapus_pada: null
      },
      {
        id: 'tsk_5',
        course_id: 'crs_uiux',
        project_id: 'prj_ecom',
        status_id: 'st_rev',
        judul: 'Hi-Fi Prototyping & Usability Testing Alur Checkout',
        deskripsi: 'Desain Figma interaktif untuk alur pemilihan barang, keranjang, dan konfirmasi pembayaran.',
        prioritas: 'Tinggi',
        deadline: dateAt(2, 12, 0), // 2 hari lagi
        urutan: 4,
        subtasks: [
          { id: 'sub_51', judul: 'Buat wireframe low-fi', selesai: true },
          { id: 'sub_52', judul: 'Desain komponen interaktif di Figma', selesai: true },
          { id: 'sub_53', judul: 'Uji ke 3 responden mahasiswa', selesai: false }
        ],
        tags: ['UI/UX', 'Figma'],
        custom_values: { figma_url: 'https://figma.com/file/sample-checkout' },
        reminders: [],
        dihapus_pada: null
      },
      {
        id: 'tsk_6',
        course_id: 'crs_web',
        project_id: null,
        status_id: 'st_todo',
        judul: 'Kuis Bab 5: CSS Flexbox & CSS Grid Mastery',
        deskripsi: 'Kuis daring di e-learning kampus 30 soal pilihan ganda & koding singkat.',
        prioritas: 'Mendesak',
        deadline: dateAt(-1, 23, 59), // OVERDUE kemarin!
        urutan: 5,
        subtasks: [
          { id: 'sub_61', judul: 'Review modul perkuliahan bab 5', selesai: true }
        ],
        tags: ['Kuis', 'Overdue'],
        custom_values: {},
        reminders: [],
        dihapus_pada: null
      },
      {
        id: 'tsk_7',
        course_id: 'crs_db',
        project_id: null,
        status_id: 'st_done',
        judul: 'Tugas Kelompok: Analisis ERD Sistem Rumah Sakit',
        deskripsi: 'Mengubah conceptual model menjadi physical relational model dengan relasi m:n.',
        prioritas: 'Sedang',
        deadline: dateAt(-4, 23, 59),
        urutan: 6,
        subtasks: [
          { id: 'sub_71', judul: 'Diskusi kelompok via Discord', selesai: true },
          { id: 'sub_72', judul: 'Gambar diagram di Draw.io', selesai: true },
          { id: 'sub_73', judul: 'Submit link di portal tugas', selesai: true }
        ],
        tags: ['Selesai', 'Basis Data'],
        custom_values: {},
        reminders: [],
        dihapus_pada: null
      }
    ];

    return {
      user: {
        id: 'usr_me',
        nama: 'Mahasiswa Mandiri',
        email: 'student@kampus.ac.id',
        timezone: 'Asia/Jakarta (WIB)'
      },
      semesters: [
        {
          id: sem1Id,
          nama: 'Semester 5 (Ganjil 2026/2027)',
          tanggal_mulai: '2026-09-01',
          tanggal_selesai: '2027-01-31',
          warna: '#B4FF39',
          ikon: 'book-open',
          diarsipkan: false
        },
        {
          id: semArchivedId,
          nama: 'Semester 4 (Genap 2025/2026)',
          tanggal_mulai: '2026-02-01',
          tanggal_selesai: '2026-06-30',
          warna: '#9CA3AF',
          ikon: 'archive',
          diarsipkan: true
        }
      ],
      courses,
      statuses,
      projects,
      tasks,
      settings: {
        telegram_bot_token: '',
        telegram_chat_id: '',
        telegram_enabled: false,
        default_reminder_hours: [72, 24, 2], // H-3, H-1, 2 jam
        snooze_minutes: 15,
        timezone: 'Asia/Jakarta'
      }
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.notify();
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
    return this.data.semesters.filter(s => includeArchived ? true : !s.diarsipkan);
  }

  getArchivedSemesters() {
    return this.data.semesters.filter(s => s.diarsipkan);
  }

  getSemester(id) {
    return this.data.semesters.find(s => s.id === id);
  }

  addSemester(sem) {
    const newSem = {
      id: 'sem_' + Date.now(),
      nama: sem.nama || 'Semester Baru',
      tanggal_mulai: sem.tanggal_mulai || '',
      tanggal_selesai: sem.tanggal_selesai || '',
      warna: sem.warna || '#ECEDEE',
      ikon: sem.ikon || 'book',
      diarsipkan: false
    };
    this.data.semesters.push(newSem);
    this.save();
    return newSem;
  }

  updateSemester(id, fields) {
    const idx = this.data.semesters.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.semesters[idx] = { ...this.data.semesters[idx], ...fields };
      this.save();
    }
  }

  toggleArchiveSemester(id) {
    const s = this.getSemester(id);
    if (s) {
      s.diarsipkan = !s.diarsipkan;
      this.save();
    }
  }

  deleteSemester(id) {
    this.data.semesters = this.data.semesters.filter(s => s.id !== id);
    this.save();
  }

  // --- COURSES ---
  getCourses(semesterId = null) {
    if (!semesterId) return this.data.courses;
    return this.data.courses.filter(c => c.semester_id === semesterId);
  }

  getCourse(id) {
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
      warna: course.warna || '#ECEDEE',
      ikon: course.ikon || 'book',
      urutan: this.data.courses.length + 1
    };
    this.data.courses.push(newCourse);
    this.save();
    return newCourse;
  }

  updateCourse(id, fields) {
    const idx = this.data.courses.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.courses[idx] = { ...this.data.courses[idx], ...fields };
      this.save();
    }
  }

  deleteCourse(id) {
    this.data.courses = this.data.courses.filter(c => c.id !== id);
    this.save();
  }

  // --- PROJECTS ---
  getProjects() {
    return this.data.projects;
  }

  getProject(id) {
    return this.data.projects.find(p => p.id === id);
  }

  addProject(proj) {
    const newProj = {
      id: 'prj_' + Date.now(),
      user_id: 'usr_me',
      nama: proj.nama || 'Proyek Baru',
      deskripsi: proj.deskripsi || '',
      deadline: proj.deadline || '',
      status: proj.status || 'Berjalan'
    };
    this.data.projects.push(newProj);
    this.save();
    return newProj;
  }

  updateProject(id, fields) {
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.projects[idx] = { ...this.data.projects[idx], ...fields };
      this.save();
    }
  }

  deleteProject(id) {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    this.save();
  }

  // --- STATUSES ---
  getStatuses() {
    return this.data.statuses.sort((a, b) => a.urutan - b.urutan);
  }

  getStatus(id) {
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
    return newStatus;
  }

  updateStatus(id, fields) {
    const idx = this.data.statuses.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.statuses[idx] = { ...this.data.statuses[idx], ...fields };
      this.save();
    }
  }

  deleteStatus(id) {
    if (this.data.statuses.length <= 1) return; // Prevent deleting all statuses
    this.data.statuses = this.data.statuses.filter(s => s.id !== id);
    this.save();
  }

  // --- TASKS ---
  getTasks(filterOptions = {}) {
    let list = this.data.tasks;

    // Soft delete filter
    if (filterOptions.trashOnly) {
      list = list.filter(t => t.dihapus_pada !== null);
    } else {
      list = list.filter(t => t.dihapus_pada === null);
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
    return this.data.tasks.find(t => t.id === id);
  }

  addTask(task) {
    const newTask = {
      id: 'tsk_' + Date.now(),
      course_id: task.course_id || (this.data.courses[0] ? this.data.courses[0].id : ''),
      project_id: task.project_id || null,
      status_id: task.status_id || (this.data.statuses[0] ? this.data.statuses[0].id : 'st_todo'),
      judul: task.judul || 'Task Baru',
      deskripsi: task.deskripsi || '',
      prioritas: task.prioritas || 'Sedang',
      deadline: task.deadline || '',
      urutan: this.data.tasks.length,
      subtasks: task.subtasks || [],
      tags: task.tags || [],
      custom_values: task.custom_values || {},
      reminders: task.reminders || [],
      dihapus_pada: null
    };
    this.data.tasks.unshift(newTask);
    this.save();
    return newTask;
  }

  updateTask(id, fields) {
    const idx = this.data.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.tasks[idx] = { ...this.data.tasks[idx], ...fields };
      this.save();
      return this.data.tasks[idx];
    }
    return null;
  }

  toggleTaskCompletion(id) {
    const task = this.getTask(id);
    if (!task) return;
    const currentStatus = this.getStatus(task.status_id);
    if (currentStatus && currentStatus.apakah_selesai) {
      // Set to in progress or todo
      const nonDone = this.data.statuses.find(s => !s.apakah_selesai);
      task.status_id = nonDone ? nonDone.id : 'st_todo';
    } else {
      // Set to done status
      const doneStatus = this.data.statuses.find(s => s.apakah_selesai);
      task.status_id = doneStatus ? doneStatus.id : 'st_done';
    }
    this.save();
  }

  softDeleteTask(id) {
    const task = this.getTask(id);
    if (task) {
      task.dihapus_pada = new Date().toISOString();
      this.save();
    }
  }

  restoreTask(id) {
    const task = this.getTask(id);
    if (task) {
      task.dihapus_pada = null;
      this.save();
    }
  }

  permanentDeleteTask(id) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.save();
  }

  emptyTrash() {
    this.data.tasks = this.data.tasks.filter(t => t.dihapus_pada === null);
    this.save();
  }

  // Helper checks
  isTaskOverdue(task) {
    if (!task.deadline) return false;
    const status = this.getStatus(task.status_id);
    if (status && status.apakah_selesai) return false;
    return new Date(task.deadline) < new Date();
  }

  // --- SETTINGS & BACKUP ---
  getSettings() {
    return this.data.settings;
  }

  updateSettings(fields) {
    this.data.settings = { ...this.data.settings, ...fields };
    this.save();
  }

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.tasks || !parsed.courses || !parsed.semesters) {
        throw new Error('Format data tidak valid.');
      }
      this.data = parsed;
      this.save();
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  resetData() {
    this.data = this.getSeedData();
    this.save();
  }
}

// Global singleton instance
window.store = new Store();
