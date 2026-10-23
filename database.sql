-- =============================================================================
-- TugasIn Database Schema for MySQL / MariaDB (XAMPP)
-- Database: tugasin_db
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `tugasin_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tugasin_db`;

-- 1. Table Semesters
CREATE TABLE IF NOT EXISTS `semesters` (
  `id` VARCHAR(64) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `tanggal_mulai` DATE NULL,
  `tanggal_selesai` DATE NULL,
  `warna` VARCHAR(32) DEFAULT '#2C5EF5',
  `ikon` VARCHAR(64) DEFAULT 'book-open',
  `diarsipkan` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table Courses (Mata Kuliah)
CREATE TABLE IF NOT EXISTS `courses` (
  `id` VARCHAR(64) NOT NULL,
  `semester_id` VARCHAR(64) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `kode` VARCHAR(64) DEFAULT '',
  `dosen` VARCHAR(255) DEFAULT '',
  `sks` INT NOT NULL DEFAULT 3,
  `warna` VARCHAR(32) DEFAULT '#2C5EF5',
  `ikon` VARCHAR(64) DEFAULT 'book',
  `urutan` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_courses_semester` (`semester_id`),
  CONSTRAINT `fk_courses_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table Statuses
CREATE TABLE IF NOT EXISTS `statuses` (
  `id` VARCHAR(64) NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `urutan` INT NOT NULL DEFAULT 0,
  `apakah_selesai` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table Projects (Tugas Besar / Proyek)
CREATE TABLE IF NOT EXISTS `projects` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL DEFAULT 'usr_me',
  `nama` VARCHAR(255) NOT NULL,
  `deskripsi` TEXT NULL,
  `deadline` DATETIME NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Perencanaan',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table Tasks
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(64) NOT NULL,
  `course_id` VARCHAR(64) NULL,
  `project_id` VARCHAR(64) NULL,
  `status_id` VARCHAR(64) NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `deskripsi` TEXT NULL,
  `prioritas` ENUM('Mendesak', 'Tinggi', 'Sedang', 'Rendah') NOT NULL DEFAULT 'Sedang',
  `deadline` DATETIME NULL,
  `urutan` INT NOT NULL DEFAULT 0,
  `tags` TEXT NULL,
  `custom_url` TEXT NULL,
  `dihapus_pada` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_course` (`course_id`),
  KEY `idx_tasks_project` (`project_id`),
  KEY `idx_tasks_status` (`status_id`),
  KEY `idx_tasks_deadline` (`deadline`),
  KEY `idx_tasks_dihapus` (`dihapus_pada`),
  CONSTRAINT `fk_tasks_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table Subtasks
CREATE TABLE IF NOT EXISTS `subtasks` (
  `id` VARCHAR(64) NOT NULL,
  `task_id` VARCHAR(64) NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `selesai` TINYINT(1) NOT NULL DEFAULT 0,
  `urutan` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subtasks_task` (`task_id`),
  CONSTRAINT `fk_subtasks_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table Settings
CREATE TABLE IF NOT EXISTS `settings` (
  `kunci` VARCHAR(64) NOT NULL,
  `nilai` TEXT NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kunci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table Task Attachments (Gambar Pendukung)
CREATE TABLE IF NOT EXISTS `task_attachments` (
  `id` VARCHAR(64) NOT NULL,
  `task_id` VARCHAR(64) NOT NULL,
  `storage_path` VARCHAR(255) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(64) NOT NULL,
  `size_bytes` BIGINT NOT NULL,
  `width` INT NULL,
  `height` INT NULL,
  `caption` TEXT NULL,
  `urutan` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attachments_task` (`task_id`),
  CONSTRAINT `fk_attachments_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SEED DATA (Default Initial Records)
-- =============================================================================

-- Statuses
INSERT IGNORE INTO `statuses` (`id`, `nama`, `urutan`, `apakah_selesai`) VALUES
('st_todo', 'Belum Mulai', 0, 0),
('st_prog', 'Sedang Dikerjakan', 1, 0),
('st_rev', 'Butuh Review', 2, 0),
('st_done', 'Selesai', 3, 1);

-- Semesters
INSERT IGNORE INTO `semesters` (`id`, `nama`, `tanggal_mulai`, `tanggal_selesai`, `warna`, `ikon`, `diarsipkan`) VALUES
('sem_5', 'Semester 5 (Ganjil 2026/2027)', '2026-09-01', '2027-01-31', '#2C5EF5', 'book-open', 0),
('sem_4', 'Semester 4 (Genap 2025/2026)', '2026-02-01', '2026-06-30', '#64748B', 'archive', 1);

-- Courses
INSERT IGNORE INTO `courses` (`id`, `semester_id`, `nama`, `kode`, `dosen`, `sks`, `warna`, `ikon`, `urutan`) VALUES
('crs_web', 'sem_5', 'Pemrograman Web & Mobile', 'IF3101', 'Dr. Ir. Budi Santoso', 3, '#0284C7', 'code', 1),
('crs_db', 'sem_5', 'Basis Data Lanjut', 'IF3102', 'Siti Rahma, M.Kom', 3, '#D97706', 'database', 2),
('crs_ai', 'sem_5', 'Kecerdasan Buatan', 'IF3103', 'Hendra Wijaya, Ph.D', 3, '#2563EB', 'cpu', 3),
('crs_dist', 'sem_5', 'Sistem Terdistribusi', 'IF3104', 'Agus Pratama, M.T', 3, '#7C3AED', 'server', 4),
('crs_uiux', 'sem_5', 'Desain Interaksi & UI/UX', 'IF3105', 'Diana Lestari, M.Ds', 2, '#DB2777', 'layout', 5);

-- Projects
INSERT IGNORE INTO `projects` (`id`, `user_id`, `nama`, `deskripsi`, `deadline`, `status`) VALUES
('prj_ecom', 'usr_me', 'Tugas Besar: Portal E-Commerce Kampus', 'Aplikasi fullstack e-commerce untuk kantin dan koperasi mahasiswa.', '2026-11-06 23:59:00', 'Sedang Berjalan'),
('prj_ai_img', 'usr_me', 'Mini Project: Klasifikasi Citra Medis', 'Model CNN transfer learning menggunakan PyTorch untuk deteksi paru-paru.', '2026-11-13 23:59:00', 'Perencanaan');

-- Tasks
INSERT IGNORE INTO `tasks` (`id`, `course_id`, `project_id`, `status_id`, `judul`, `deskripsi`, `prioritas`, `deadline`, `urutan`, `tags`, `custom_url`, `dihapus_pada`) VALUES
('tsk_1', 'crs_web', 'prj_ecom', 'st_prog', 'Implementasi REST API Autentikasi JWT & Role Admin', 'Membuat endpoint login, register, refresh token, dan middleware role authorization.', 'Tinggi', DATE_ADD(CURRENT_DATE(), INTERVAL '23:59' HOUR_MINUTE), 0, '["Backend","Tugas Besar"]', 'https://github.com/tugasin/api-core', NULL),
('tsk_2', 'crs_db', NULL, 'st_todo', 'Laporan Praktikum 4: Optimasi Query & Normalisasi BCNF', 'Menganalisis query plan EXPLAIN pada tabel 1 juta baris dan membuat indeks komposit.', 'Mendesak', DATE_ADD(CURRENT_DATE(), INTERVAL '1 17:00' DAY_MINUTE), 1, '["Praktikum","Laporan"]', NULL, NULL),
('tsk_3', 'crs_ai', 'prj_ai_img', 'st_prog', 'Pembersihan Dataset Citra & Augmentasi Data (PyTorch)', 'Melakukan resize 224x224, rotasi acak, flip horizontal, dan normalisasi mean/std ImageNet.', 'Sedang', DATE_ADD(CURRENT_DATE(), INTERVAL '3 21:00' DAY_MINUTE), 2, '["Kecerdasan Buatan","Machine Learning"]', 'https://kaggle.com/datasets/medical-chest', NULL),
('tsk_4', 'crs_uiux', 'prj_ecom', 'st_rev', 'Hi-Fi Prototyping & Usability Testing Alur Checkout', 'Menyelesaikan prototype interaktif Figma alur checkout payment gateway dan tes ke 5 responden.', 'Tinggi', DATE_ADD(CURRENT_DATE(), INTERVAL '2 12:00' DAY_MINUTE), 3, '["UI/UX","Figma"]', 'https://figma.com/file/checkout-prototype', NULL),
('tsk_5', 'crs_dist', NULL, 'st_todo', 'Tugas Mandiri: Simulasi Algoritma Konsensus Raft', 'Membaca paper Ongaro (2014) dan membuat ringkasan mekanisme leader election & log replication.', 'Rendah', DATE_ADD(CURRENT_DATE(), INTERVAL '6 23:59' DAY_MINUTE), 4, '["Tugas Teori"]', NULL, NULL);

-- Subtasks
INSERT IGNORE INTO `subtasks` (`id`, `task_id`, `judul`, `selesai`, `urutan`) VALUES
('sub_1', 'tsk_1', 'Setup schema User dan Token', 1, 0),
('sub_2', 'tsk_1', 'Implementasi route login & hashing bcrypt', 1, 1),
('sub_3', 'tsk_1', 'Middleware verifikasi JWT access token', 0, 2),
('sub_4', 'tsk_1', 'Unit testing authorization admin', 0, 3),
('sub_5', 'tsk_2', 'Jalankan EXPLAIN ANALYZE query lambat', 1, 0),
('sub_6', 'tsk_2', 'Buat B-Tree composite index', 0, 1),
('sub_7', 'tsk_2', 'Tulis pembahasan perbandingan execution time di laporan', 0, 2),
('sub_8', 'tsk_3', 'Download raw DICOM / PNG images', 1, 0),
('sub_9', 'tsk_3', 'Buat custom PyTorch Dataset & DataLoader', 0, 1),
('sub_10', 'tsk_4', 'Selesaikan layout mobile screen checkout', 1, 0),
('sub_11', 'tsk_4', 'Hubungkan micro-interaction feedback bayar', 1, 1),
('sub_12', 'tsk_4', 'Susun lembar usability testing (SUS score)', 0, 2);

-- Default Settings (Light Mode Glassline as requested)
INSERT IGNORE INTO `settings` (`kunci`, `nilai`) VALUES
('theme', 'light'),
('telegram_bot_token', ''),
('telegram_chat_id', ''),
('telegram_enabled', '0'),
('default_reminder_hours', '[72, 24, 2]'),
('snooze_minutes', '15'),
('timezone', 'Asia/Jakarta');
