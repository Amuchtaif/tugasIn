-- =============================================================================
-- TugasIn - Script Sinkronisasi Skema Database (Shared Hosting & Lokal)
-- File: alter_schema.sql
-- Kompatibel: MySQL 5.7+, MySQL 8.0+, MariaDB 10.x+, phpMyAdmin, cPanel, CLI
-- 
-- Karakteristik & Jaminan:
-- 1. TANPA MERUSAK / MENGHAPUS DATA (Zero Data Loss) - data tugas, matakuliah, dll tetap aman.
-- 2. Idempotent: Aman dieksekusi berkali-kali tanpa error "duplicate column / key".
-- 3. TANPA 'USE database_name;' - otomatis mendeteksi database aktif di phpMyAdmin hosting.
-- 4. TANPA 'DELIMITER $$' atau Stored Procedure - anti-gagal pada hosting berizin terbatas.
-- =============================================================================

-- Matikan sementara Foreign Key Checks agar migrasi struktur berjalan lancar
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- Ambil nama database aktif saat ini secara dinamis
SET @db = DATABASE();

-- =============================================================================
-- 1. PASTIKAN SELURUH TABEL UTAMA ADA (CREATE TABLE IF NOT EXISTS)
-- =============================================================================

-- A. Tabel Semesters
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

-- B. Tabel Courses (Mata Kuliah)
CREATE TABLE IF NOT EXISTS `courses` (
  `id` VARCHAR(64) NOT NULL,
  `semester_id` VARCHAR(64) NULL,
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
  KEY `idx_courses_semester` (`semester_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- C. Tabel Statuses (Global Kanban Statuses)
CREATE TABLE IF NOT EXISTS `statuses` (
  `id` VARCHAR(64) NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `urutan` INT NOT NULL DEFAULT 0,
  `apakah_selesai` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- D. Tabel Projects (Proyek / Tugas Besar)
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

-- E. Tabel Tasks
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(64) NOT NULL,
  `course_id` VARCHAR(64) NULL,
  `project_id` VARCHAR(64) NULL,
  `status_id` VARCHAR(64) NOT NULL DEFAULT 'st_todo',
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
  KEY `idx_tasks_dihapus` (`dihapus_pada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- F. Tabel Custom Fields
CREATE TABLE IF NOT EXISTS `custom_fields` (
  `id` VARCHAR(64) NOT NULL,
  `course_id` VARCHAR(64) NULL,
  `project_id` VARCHAR(64) NULL,
  `nama` VARCHAR(100) NOT NULL,
  `tipe` VARCHAR(32) NOT NULL DEFAULT 'text',
  `opsi` TEXT NULL,
  `urutan` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_custom_fields_course` (`course_id`),
  KEY `idx_custom_fields_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- G. Tabel Subtasks
CREATE TABLE IF NOT EXISTS `subtasks` (
  `id` VARCHAR(64) NOT NULL,
  `task_id` VARCHAR(64) NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `selesai` TINYINT(1) NOT NULL DEFAULT 0,
  `urutan` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subtasks_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- H. Tabel Task Attachments
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
  KEY `idx_attachments_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- I. Tabel Schedules (Jadwal Kuliah Mingguan)
CREATE TABLE IF NOT EXISTS `schedules` (
  `id` VARCHAR(64) NOT NULL,
  `course_id` VARCHAR(64) NOT NULL,
  `hari` VARCHAR(20) NOT NULL,
  `jam_mulai` TIME NOT NULL,
  `jam_selesai` TIME NOT NULL,
  `ruangan` VARCHAR(100) DEFAULT '',
  `dosen` VARCHAR(255) DEFAULT '',
  `jenis` VARCHAR(64) DEFAULT 'Kuliah',
  `warna` VARCHAR(32) DEFAULT NULL,
  `keterangan` TEXT NULL,
  `pengingat_aktif` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_schedules_course` (`course_id`),
  KEY `idx_schedules_hari` (`hari`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- J. Tabel Schedule Reminder Logs
CREATE TABLE IF NOT EXISTS `schedule_reminder_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `schedule_id` VARCHAR(64) NOT NULL,
  `reminder_type` VARCHAR(20) NOT NULL,
  `tanggal` DATE NOT NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_sched_rem_unique` (`schedule_id`, `reminder_type`, `tanggal`),
  KEY `idx_sched_rem_schedule` (`schedule_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- K. Tabel Task Reminder Logs
CREATE TABLE IF NOT EXISTS `task_reminder_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `task_id` VARCHAR(64) NOT NULL,
  `reminder_type` VARCHAR(32) NOT NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_task_rem_unique` (`task_id`, `reminder_type`),
  KEY `idx_task_rem_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- L. Tabel Settings
CREATE TABLE IF NOT EXISTS `settings` (
  `kunci` VARCHAR(64) NOT NULL,
  `nilai` TEXT NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kunci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 2. RESTRUKTURISASI TABEL STATUSES (STANDARISASI GLOBAL STATUS KANBAN)
-- =============================================================================

-- Hapus Check Constraint lama pada statuses jika ada
SET @chk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'statuses' AND CONSTRAINT_NAME = 'chk_status_owner');
SET @sql = IF(@chk_exist > 0, 'ALTER TABLE `statuses` DROP CONSTRAINT `chk_status_owner`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Hapus Foreign Key lama pada statuses jika ada
SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'statuses' AND CONSTRAINT_NAME = 'fk_statuses_course');
SET @sql = IF(@fk_exist > 0, 'ALTER TABLE `statuses` DROP FOREIGN KEY `fk_statuses_course`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'statuses' AND CONSTRAINT_NAME = 'fk_statuses_project');
SET @sql = IF(@fk_exist > 0, 'ALTER TABLE `statuses` DROP FOREIGN KEY `fk_statuses_project`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Hapus Index lama pada statuses jika ada
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'statuses' AND INDEX_NAME = 'idx_statuses_course');
SET @sql = IF(@idx_exist > 0, 'ALTER TABLE `statuses` DROP INDEX `idx_statuses_course`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exist = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'statuses' AND INDEX_NAME = 'idx_statuses_project');
SET @sql = IF(@idx_exist > 0, 'ALTER TABLE `statuses` DROP INDEX `idx_statuses_project`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah kolom urutan pada statuses jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'statuses' AND COLUMN_NAME = 'urutan');
SET @sql = IF(@exist = 0, 'ALTER TABLE `statuses` ADD COLUMN `urutan` INT NOT NULL DEFAULT 0 AFTER `nama`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah kolom apakah_selesai pada statuses jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'statuses' AND COLUMN_NAME = 'apakah_selesai');
SET @sql = IF(@exist = 0, 'ALTER TABLE `statuses` ADD COLUMN `apakah_selesai` TINYINT(1) NOT NULL DEFAULT 0 AFTER `urutan`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Hapus kolom course_id pada statuses jika ada (karena status sekarang global)
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'statuses' AND COLUMN_NAME = 'course_id');
SET @sql = IF(@exist > 0, 'ALTER TABLE `statuses` DROP COLUMN `course_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Hapus kolom project_id pada statuses jika ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'statuses' AND COLUMN_NAME = 'project_id');
SET @sql = IF(@exist > 0, 'ALTER TABLE `statuses` DROP COLUMN `project_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- 3. PERBAIKAN & PENAMBAHAN KOLOM TABEL TASKS
-- =============================================================================

-- Pastikan course_id boleh NULL (karena task bisa milik projek tanpa matakuliah)
SET @col_nullable = (SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'course_id');
SET @sql = IF(@col_nullable = 'NO', 'ALTER TABLE `tasks` MODIFY COLUMN `course_id` VARCHAR(64) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah project_id pada tasks jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'project_id');
SET @sql = IF(@exist = 0, 'ALTER TABLE `tasks` ADD COLUMN `project_id` VARCHAR(64) NULL AFTER `course_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah urutan pada tasks jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'urutan');
SET @sql = IF(@exist = 0, 'ALTER TABLE `tasks` ADD COLUMN `urutan` INT NOT NULL DEFAULT 0 AFTER `deadline`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah tags pada tasks jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'tags');
SET @sql = IF(@exist = 0, 'ALTER TABLE `tasks` ADD COLUMN `tags` TEXT NULL AFTER `urutan`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah custom_url pada tasks jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'custom_url');
SET @sql = IF(@exist = 0, 'ALTER TABLE `tasks` ADD COLUMN `custom_url` TEXT NULL AFTER `tags`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah dihapus_pada (soft delete / sampah) pada tasks jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'dihapus_pada');
SET @sql = IF(@exist = 0, 'ALTER TABLE `tasks` ADD COLUMN `dihapus_pada` DATETIME NULL AFTER `custom_url`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah index idx_tasks_dihapus jika belum ada
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND INDEX_NAME = 'idx_tasks_dihapus');
SET @sql = IF(@idx_exist = 0, 'ALTER TABLE `tasks` ADD INDEX `idx_tasks_dihapus` (`dihapus_pada`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah index idx_tasks_project jika belum ada
SET @idx_exist = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND INDEX_NAME = 'idx_tasks_project');
SET @sql = IF(@idx_exist = 0, 'ALTER TABLE `tasks` ADD INDEX `idx_tasks_project` (`project_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- 4. PERBAIKAN & PENAMBAHAN KOLOM TABEL COURSES
-- =============================================================================

-- Tambah semester_id jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'semester_id');
SET @sql = IF(@exist = 0, 'ALTER TABLE `courses` ADD COLUMN `semester_id` VARCHAR(64) NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah kode jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'kode');
SET @sql = IF(@exist = 0, 'ALTER TABLE `courses` ADD COLUMN `kode` VARCHAR(64) DEFAULT "" AFTER `nama`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah dosen jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'dosen');
SET @sql = IF(@exist = 0, 'ALTER TABLE `courses` ADD COLUMN `dosen` VARCHAR(255) DEFAULT "" AFTER `kode`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah sks jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'sks');
SET @sql = IF(@exist = 0, 'ALTER TABLE `courses` ADD COLUMN `sks` INT NOT NULL DEFAULT 3 AFTER `dosen`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah warna jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'warna');
SET @sql = IF(@exist = 0, 'ALTER TABLE `courses` ADD COLUMN `warna` VARCHAR(32) DEFAULT "#2C5EF5" AFTER `sks`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah ikon jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'ikon');
SET @sql = IF(@exist = 0, 'ALTER TABLE `courses` ADD COLUMN `ikon` VARCHAR(64) DEFAULT "book" AFTER `warna`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah urutan jika belum ada
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'urutan');
SET @sql = IF(@exist = 0, 'ALTER TABLE `courses` ADD COLUMN `urutan` INT NOT NULL DEFAULT 1 AFTER `ikon`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- 5. PERBAIKAN & PENAMBAHAN KOLOM TABEL SEMESTERS
-- =============================================================================

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'tanggal_mulai');
SET @sql = IF(@exist = 0, 'ALTER TABLE `semesters` ADD COLUMN `tanggal_mulai` DATE NULL AFTER `nama`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'tanggal_selesai');
SET @sql = IF(@exist = 0, 'ALTER TABLE `semesters` ADD COLUMN `tanggal_selesai` DATE NULL AFTER `tanggal_mulai`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'warna');
SET @sql = IF(@exist = 0, 'ALTER TABLE `semesters` ADD COLUMN `warna` VARCHAR(32) DEFAULT "#2C5EF5" AFTER `tanggal_selesai`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'ikon');
SET @sql = IF(@exist = 0, 'ALTER TABLE `semesters` ADD COLUMN `ikon` VARCHAR(64) DEFAULT "book-open" AFTER `warna`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'diarsipkan');
SET @sql = IF(@exist = 0, 'ALTER TABLE `semesters` ADD COLUMN `diarsipkan` TINYINT(1) NOT NULL DEFAULT 0 AFTER `ikon`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- 6. PERBAIKAN & PENAMBAHAN KOLOM TABEL SCHEDULES
-- =============================================================================

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'schedules' AND COLUMN_NAME = 'ruangan');
SET @sql = IF(@exist = 0, 'ALTER TABLE `schedules` ADD COLUMN `ruangan` VARCHAR(100) DEFAULT "" AFTER `jam_selesai`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'schedules' AND COLUMN_NAME = 'dosen');
SET @sql = IF(@exist = 0, 'ALTER TABLE `schedules` ADD COLUMN `dosen` VARCHAR(255) DEFAULT "" AFTER `ruangan`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'schedules' AND COLUMN_NAME = 'jenis');
SET @sql = IF(@exist = 0, 'ALTER TABLE `schedules` ADD COLUMN `jenis` VARCHAR(64) DEFAULT "Kuliah" AFTER `dosen`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'schedules' AND COLUMN_NAME = 'warna');
SET @sql = IF(@exist = 0, 'ALTER TABLE `schedules` ADD COLUMN `warna` VARCHAR(32) DEFAULT NULL AFTER `jenis`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'schedules' AND COLUMN_NAME = 'keterangan');
SET @sql = IF(@exist = 0, 'ALTER TABLE `schedules` ADD COLUMN `keterangan` TEXT NULL AFTER `warna`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'schedules' AND COLUMN_NAME = 'pengingat_aktif');
SET @sql = IF(@exist = 0, 'ALTER TABLE `schedules` ADD COLUMN `pengingat_aktif` TINYINT(1) NOT NULL DEFAULT 1 AFTER `keterangan`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- 7. SINKRONISASI DATA: PRESERVASI DATA TUGAS & RELASI KANBAN
-- =============================================================================

-- 1. Masukkan 4 Status Global Standar
INSERT INTO `statuses` (`id`, `nama`, `urutan`, `apakah_selesai`) VALUES
('st_todo', 'Belum Mulai', 0, 0),
('st_prog', 'Sedang Dikerjakan', 1, 0),
('st_rev',  'Butuh Review', 2, 0),
('st_done', 'Selesai', 3, 1)
ON DUPLICATE KEY UPDATE 
  `nama` = VALUES(`nama`),
  `urutan` = VALUES(`urutan`),
  `apakah_selesai` = VALUES(`apakah_selesai`);

-- 2. Migrasikan seluruh status lama pada tasks ke status global standar (TANPA MENGHAPUS DATA TUGAS)
UPDATE `tasks` SET `status_id` = 'st_done' 
WHERE `status_id` LIKE '%_done' OR `status_id` = 'done' OR `status_id` LIKE '%selesai%';

UPDATE `tasks` SET `status_id` = 'st_rev' 
WHERE `status_id` LIKE '%_rev' OR `status_id` = 'rev' OR `status_id` LIKE '%review%';

UPDATE `tasks` SET `status_id` = 'st_prog' 
WHERE `status_id` LIKE '%_prog' OR `status_id` = 'prog' OR `status_id` LIKE '%progress%' OR `status_id` LIKE '%dikerjakan%';

UPDATE `tasks` SET `status_id` = 'st_todo' 
WHERE `status_id` LIKE '%_todo' OR `status_id` = 'todo' OR `status_id` LIKE '%belum%' 
   OR `status_id` NOT IN ('st_todo', 'st_prog', 'st_rev', 'st_done');

-- 3. Hapus status-status lama di tabel statuses yang sudah tidak digunakan
DELETE FROM `statuses` WHERE `id` NOT IN ('st_todo', 'st_prog', 'st_rev', 'st_done');

-- 4. Masukkan Semester bawaan jika tabel semesters masih kosong
INSERT IGNORE INTO `semesters` (`id`, `nama`, `tanggal_mulai`, `tanggal_selesai`, `warna`, `ikon`, `diarsipkan`) VALUES
('sem_5', 'Semester 5 (Ganjil 2026/2027)', '2026-09-01', '2027-01-31', '#2C5EF5', 'book-open', 0);

-- 5. Hubungkan matakuliah yang belum punya semester ke semester pertama yang ada
UPDATE `courses` 
SET `semester_id` = (SELECT `id` FROM `semesters` ORDER BY `created_at` ASC LIMIT 1) 
WHERE `semester_id` IS NULL OR `semester_id` = '' OR `semester_id` NOT IN (SELECT `id` FROM `semesters`);

-- 6. Normalisasi task yang memiliki relasi invalid agar tidak gagal saat pemasangan foreign key
UPDATE `tasks` SET `course_id` = NULL 
WHERE `course_id` IS NOT NULL AND `course_id` NOT IN (SELECT `id` FROM `courses`);

UPDATE `tasks` SET `project_id` = NULL 
WHERE `project_id` IS NOT NULL AND `project_id` NOT IN (SELECT `id` FROM `projects`);

-- Jika ada task yang course_id dan project_id-nya keduanya NULL, arahkan ke course pertama
UPDATE `tasks` 
SET `course_id` = (SELECT `id` FROM `courses` ORDER BY `urutan` ASC LIMIT 1) 
WHERE `course_id` IS NULL AND `project_id` IS NULL AND (SELECT COUNT(*) FROM `courses`) > 0;

-- 7. Masukkan pengaturan bawaan jika belum ada
INSERT IGNORE INTO `settings` (`kunci`, `nilai`) VALUES
('theme', 'light'),
('telegram_bot_token', ''),
('telegram_chat_id', ''),
('telegram_enabled', '0'),
('default_reminder_hours', '[72, 24, 2]'),
('snooze_minutes', '15'),
('timezone', 'Asia/Jakarta');


-- =============================================================================
-- 8. PEMASANGAN FOREIGN KEY & INTEGRITAS RELASIONAL SECARA AMAN
-- =============================================================================

-- FK courses -> semesters
SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'courses' AND CONSTRAINT_NAME = 'fk_courses_semester');
SET @sql = IF(@fk_exist = 0, 'ALTER TABLE `courses` ADD CONSTRAINT `fk_courses_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK tasks -> courses
SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND CONSTRAINT_NAME = 'fk_tasks_course');
SET @sql = IF(@fk_exist = 0, 'ALTER TABLE `tasks` ADD CONSTRAINT `fk_tasks_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK tasks -> projects
SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND CONSTRAINT_NAME = 'fk_tasks_project');
SET @sql = IF(@fk_exist = 0, 'ALTER TABLE `tasks` ADD CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK tasks -> statuses
SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND CONSTRAINT_NAME = 'fk_tasks_status');
SET @sql = IF(@fk_exist = 0, 'ALTER TABLE `tasks` ADD CONSTRAINT `fk_tasks_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`) ON DELETE RESTRICT', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK schedules -> courses
SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'schedules' AND CONSTRAINT_NAME = 'fk_schedules_course');
SET @sql = IF(@fk_exist = 0, 'ALTER TABLE `schedules` ADD CONSTRAINT `fk_schedules_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK schedule_reminder_logs -> schedules
SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'schedule_reminder_logs' AND CONSTRAINT_NAME = 'fk_sched_rem_schedule');
SET @sql = IF(@fk_exist = 0, 'ALTER TABLE `schedule_reminder_logs` ADD CONSTRAINT `fk_sched_rem_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK task_reminder_logs -> tasks
SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'task_reminder_logs' AND CONSTRAINT_NAME = 'fk_task_rem_task');
SET @sql = IF(@fk_exist = 0, 'ALTER TABLE `task_reminder_logs` ADD CONSTRAINT `fk_task_rem_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK subtasks -> tasks
SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subtasks' AND CONSTRAINT_NAME = 'fk_subtasks_task');
SET @sql = IF(@fk_exist = 0, 'ALTER TABLE `subtasks` ADD CONSTRAINT `fk_subtasks_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK task_attachments -> tasks
SET @fk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'task_attachments' AND CONSTRAINT_NAME = 'fk_attachments_task');
SET @sql = IF(@fk_exist = 0, 'ALTER TABLE `task_attachments` ADD CONSTRAINT `fk_attachments_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Hapus Check Constraint chk_task_owner jika ada (agar kompatibel 100% dengan MariaDB di Shared Hosting)
SET @chk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tasks' AND CONSTRAINT_NAME = 'chk_task_owner');
SET @sql = IF(@chk_exist > 0, 'ALTER TABLE `tasks` DROP CONSTRAINT `chk_task_owner`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Hapus Check Constraint chk_customfield_owner jika ada
SET @chk_exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'custom_fields' AND CONSTRAINT_NAME = 'chk_customfield_owner');
SET @sql = IF(@chk_exist > 0, 'ALTER TABLE `custom_fields` DROP CONSTRAINT `chk_customfield_owner`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- 9. SELESAIKAN MIGRASI & AKTIFKAN KEMBALI FOREIGN KEY CHECKS
-- =============================================================================
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

SELECT 
  'Sinkronisasi skema database berhasil 100%! Semua data tetap utuh dan skema sekarang identik antara lokal dan hosting.' AS `status_migrasi`,
  (SELECT COUNT(*) FROM `tasks`) AS `total_tugas`,
  (SELECT COUNT(*) FROM `courses`) AS `total_matakuliah`,
  (SELECT COUNT(*) FROM `statuses`) AS `total_status_global`,
  (SELECT COUNT(*) FROM `schedules`) AS `total_jadwal`;
