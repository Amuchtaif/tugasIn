-- Backup before Task 1 (Task & Status Separation)
-- Created: 2026-10-25T10:07:05+00:00

CREATE TABLE `semesters` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal_mulai` date DEFAULT NULL,
  `tanggal_selesai` date DEFAULT NULL,
  `warna` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT '#2C5EF5',
  `ikon` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'book-open',
  `diarsipkan` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `semesters` (`id`, `nama`, `tanggal_mulai`, `tanggal_selesai`, `warna`, `ikon`, `diarsipkan`, `created_at`, `updated_at`) VALUES ('sem_1792834157481', 'Semester 5 (ganjil)', '2026-09-14', '2027-01-27', '#2C5EF5', 'book-open', '0', '2026-10-24 16:29:17', '2026-10-24 16:29:17');

CREATE TABLE `courses` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `semester_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `dosen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `sks` int NOT NULL DEFAULT '3',
  `warna` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT '#2C5EF5',
  `ikon` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'book',
  `urutan` int NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_courses_semester` (`semester_id`),
  CONSTRAINT `fk_courses_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `courses` (`id`, `semester_id`, `nama`, `kode`, `dosen`, `sks`, `warna`, `ikon`, `urutan`, `created_at`, `updated_at`) VALUES ('crs_1792834311814', 'sem_1792834157481', 'Technopreneurship', 'INF507', 'Baskoro, S.E., M.M', '2', '#DB2777', 'chart-line', '1', '2026-10-24 16:31:51', '2026-10-24 22:07:15');
INSERT INTO `courses` (`id`, `semester_id`, `nama`, `kode`, `dosen`, `sks`, `warna`, `ikon`, `urutan`, `created_at`, `updated_at`) VALUES ('crs_1792834346884', 'sem_1792834157481', 'Teknologi IOT', 'INF504', 'Dwi Susanto, S.Kom., M.Kom', '3', '#2C5EF5', 'robot', '2', '2026-10-24 16:32:26', '2026-10-24 21:57:49');
INSERT INTO `courses` (`id`, `semester_id`, `nama`, `kode`, `dosen`, `sks`, `warna`, `ikon`, `urutan`, `created_at`, `updated_at`) VALUES ('crs_1792834392304', 'sem_1792834157481', 'Sejarah Kebudayaan Islam', 'MKM501', 'Rif\'an Wachid Sumardi, S.Pd.I., M.Pd.', '2', '#059669', 'book-open', '3', '2026-10-24 16:33:11', '2026-10-24 21:58:04');
INSERT INTO `courses` (`id`, `semester_id`, `nama`, `kode`, `dosen`, `sks`, `warna`, `ikon`, `urutan`, `created_at`, `updated_at`) VALUES ('crs_1792834451887', 'sem_1792834157481', 'Analisi & Perencanaan Sistem', 'INF502', 'Lukmanul Hakim, S.T., M.IT.', '3', '#0284C7', 'display', '4', '2026-10-24 16:34:11', '2026-10-24 21:58:16');
INSERT INTO `courses` (`id`, `semester_id`, `nama`, `kode`, `dosen`, `sks`, `warna`, `ikon`, `urutan`, `created_at`, `updated_at`) VALUES ('crs_1792834487093', 'sem_1792834157481', 'Manajemen Proyek', 'INF506', 'Fadhilah Dhinur Aini, S.Kom., M.Kom.', '3', '#7C3AED', 'layer-group', '5', '2026-10-24 16:34:46', '2026-10-24 21:58:48');
INSERT INTO `courses` (`id`, `semester_id`, `nama`, `kode`, `dosen`, `sks`, `warna`, `ikon`, `urutan`, `created_at`, `updated_at`) VALUES ('crs_1792834543600', 'sem_1792834157481', 'WAN & Teknologi Jaringan', 'INF505', 'Yuwono Fitri Widodo, S.Kom., M.Kom', '2', '#D97706', 'network-wired', '6', '2026-10-24 16:35:43', '2026-10-24 21:58:55');
INSERT INTO `courses` (`id`, `semester_id`, `nama`, `kode`, `dosen`, `sks`, `warna`, `ikon`, `urutan`, `created_at`, `updated_at`) VALUES ('crs_1792834600990', 'sem_1792834157481', 'Data Warehouse', 'INF503', 'Fadhilah Dhinur Aini, S.Kom., M.Kom.', '3', '#DC2626', 'laptop-code', '7', '2026-10-24 16:36:40', '2026-10-24 21:59:04');
INSERT INTO `courses` (`id`, `semester_id`, `nama`, `kode`, `dosen`, `sks`, `warna`, `ikon`, `urutan`, `created_at`, `updated_at`) VALUES ('crs_1792834622029', 'sem_1792834157481', 'Pengembangan Aplikasi Web', 'INF501', 'Lukmanul Hakim, S.T., M.IT.', '3', '#475569', 'code', '8', '2026-10-24 16:37:01', '2026-10-24 21:59:11');

CREATE TABLE `statuses` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `urutan` int NOT NULL DEFAULT '0',
  `apakah_selesai` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `projects` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'usr_me',
  `nama` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `deadline` datetime DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Perencanaan',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `projects` (`id`, `user_id`, `nama`, `deskripsi`, `deadline`, `status`, `created_at`, `updated_at`) VALUES ('prj_1792833700548', 'usr_me', 'Projek Churros', 'churros hulya', '2026-10-24 00:00:00', 'Sedang Berjalan', '2026-10-24 16:21:40', '2026-10-24 16:21:40');

CREATE TABLE `tasks` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `project_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `judul` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `prioritas` enum('Mendesak','Tinggi','Sedang','Rendah') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Sedang',
  `deadline` datetime DEFAULT NULL,
  `urutan` int NOT NULL DEFAULT '0',
  `tags` text COLLATE utf8mb4_unicode_ci,
  `custom_url` text COLLATE utf8mb4_unicode_ci,
  `dihapus_pada` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_course` (`course_id`),
  KEY `idx_tasks_project` (`project_id`),
  KEY `idx_tasks_status` (`status_id`),
  KEY `idx_tasks_deadline` (`deadline`),
  KEY `idx_tasks_dihapus` (`dihapus_pada`),
  CONSTRAINT `fk_tasks_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subtasks` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `judul` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `selesai` tinyint(1) NOT NULL DEFAULT '0',
  `urutan` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subtasks_task` (`task_id`),
  CONSTRAINT `fk_subtasks_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `settings` (
  `kunci` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nilai` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kunci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`kunci`, `nilai`, `updated_at`) VALUES ('default_reminder_hours', '[72,24,2]', '2026-10-24 12:34:37');
INSERT INTO `settings` (`kunci`, `nilai`, `updated_at`) VALUES ('snooze_minutes', '15', '2026-10-24 12:34:37');
INSERT INTO `settings` (`kunci`, `nilai`, `updated_at`) VALUES ('telegram_bot_token', '', '2026-10-25 07:58:14');
INSERT INTO `settings` (`kunci`, `nilai`, `updated_at`) VALUES ('telegram_chat_id', '', '2026-10-24 22:31:10');
INSERT INTO `settings` (`kunci`, `nilai`, `updated_at`) VALUES ('telegram_enabled', '0', '2026-10-24 22:31:10');
INSERT INTO `settings` (`kunci`, `nilai`, `updated_at`) VALUES ('theme', 'light', '2026-10-25 08:03:24');
INSERT INTO `settings` (`kunci`, `nilai`, `updated_at`) VALUES ('timezone', 'Asia/Jakarta', '2026-10-24 12:34:37');

CREATE TABLE `task_attachments` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` bigint NOT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `caption` text COLLATE utf8mb4_unicode_ci,
  `urutan` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attachments_task` (`task_id`),
  CONSTRAINT `fk_attachments_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `schedules` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hari` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jam_mulai` time NOT NULL,
  `jam_selesai` time NOT NULL,
  `ruangan` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `dosen` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `jenis` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'Kuliah',
  `warna` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `pengingat_aktif` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_schedules_course` (`course_id`),
  KEY `idx_schedules_hari` (`hari`),
  CONSTRAINT `fk_schedules_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `schedules` (`id`, `course_id`, `hari`, `jam_mulai`, `jam_selesai`, `ruangan`, `dosen`, `jenis`, `warna`, `keterangan`, `pengingat_aktif`, `created_at`, `updated_at`) VALUES ('sch_1792854008128', 'crs_1792834311814', 'Senin', '16:30:00', '17:30:00', 'Online', 'Baskoro, S.E., M.M', 'Kuliah', '#059669', '', '1', '2026-10-24 22:00:07', '2026-10-24 22:00:07');

CREATE TABLE `schedule_reminder_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `schedule_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reminder_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal` date NOT NULL,
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_sched_rem_unique` (`schedule_id`,`reminder_type`,`tanggal`),
  KEY `idx_sched_rem_schedule` (`schedule_id`),
  CONSTRAINT `fk_sched_rem_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

