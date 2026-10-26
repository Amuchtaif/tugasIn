-- =============================================================================
-- TugasIn - Script Migrasi Perubahan Skema Database (ALTER SCHEMA)
-- Database: tugasin_db
-- Deskripsi: Menstandarkan skema database ke versi terbaru:
-- 1. Penyatuan Status Kanban menjadi GLOBAL (hapus course_id & project_id di statuses)
-- 2. Penambahan kolom-kolom baru (custom_url, tags, dihapus_pada, attachment, schedule, dll)
-- 3. Perbaikan integritas relasi foreign key dan data awal (seed)
-- Aman dijalankan di phpMyAdmin atau MySQL CLI (Idempotent / tidak merusak data lama)
-- =============================================================================

USE `tugasin_db`;

-- -----------------------------------------------------------------------------
-- 1. MIGRATION PROCEDURE: ALTER KOLOM & CONSTRAINT DINAMIS
-- -----------------------------------------------------------------------------
DELIMITER $$

DROP PROCEDURE IF EXISTS `MigrateTugasInSchema`$$
CREATE PROCEDURE `MigrateTugasInSchema`()
BEGIN
    DECLARE current_db VARCHAR(64);
    SELECT DATABASE() INTO current_db;

    -- =========================================================================
    -- A. TABEL STATUSES (JADIKAN STATUS GLOBAL)
    -- =========================================================================
    
    -- 1. Hapus Foreign Key lama pada statuses jika ada
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'statuses' AND CONSTRAINT_NAME = 'fk_statuses_course'
    ) THEN
        ALTER TABLE `statuses` DROP FOREIGN KEY `fk_statuses_course`;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'statuses' AND CONSTRAINT_NAME = 'fk_statuses_project'
    ) THEN
        ALTER TABLE `statuses` DROP FOREIGN KEY `fk_statuses_project`;
    END IF;

    -- 2. Hapus Index lama pada statuses jika ada
    IF EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'statuses' AND INDEX_NAME = 'idx_statuses_course'
    ) THEN
        ALTER TABLE `statuses` DROP INDEX `idx_statuses_course`;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'statuses' AND INDEX_NAME = 'idx_statuses_project'
    ) THEN
        ALTER TABLE `statuses` DROP INDEX `idx_statuses_project`;
    END IF;

    -- 3. Hapus kolom course_id dan project_id pada statuses agar status bersifat global
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'statuses' AND COLUMN_NAME = 'course_id'
    ) THEN
        ALTER TABLE `statuses` DROP COLUMN `course_id`;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'statuses' AND COLUMN_NAME = 'project_id'
    ) THEN
        ALTER TABLE `statuses` DROP COLUMN `project_id`;
    END IF;

    -- 4. Pastikan kolom dasar statuses lengkap
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'statuses' AND COLUMN_NAME = 'urutan'
    ) THEN
        ALTER TABLE `statuses` ADD COLUMN `urutan` INT NOT NULL DEFAULT 0 AFTER `nama`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'statuses' AND COLUMN_NAME = 'apakah_selesai'
    ) THEN
        ALTER TABLE `statuses` ADD COLUMN `apakah_selesai` TINYINT(1) NOT NULL DEFAULT 0 AFTER `urutan`;
    END IF;


    -- =========================================================================
    -- B. TABEL TASKS
    -- =========================================================================

    -- 1. Tambah project_id jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'project_id'
    ) THEN
        ALTER TABLE `tasks` ADD COLUMN `project_id` VARCHAR(64) NULL AFTER `course_id`;
    END IF;

    -- 2. Tambah urutan jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'urutan'
    ) THEN
        ALTER TABLE `tasks` ADD COLUMN `urutan` INT NOT NULL DEFAULT 0 AFTER `deadline`;
    END IF;

    -- 3. Tambah tags jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'tags'
    ) THEN
        ALTER TABLE `tasks` ADD COLUMN `tags` TEXT NULL AFTER `urutan`;
    END IF;

    -- 4. Tambah custom_url jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'custom_url'
    ) THEN
        ALTER TABLE `tasks` ADD COLUMN `custom_url` TEXT NULL AFTER `tags`;
    END IF;

    -- 5. Tambah dihapus_pada (soft delete / sampah) jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'dihapus_pada'
    ) THEN
        ALTER TABLE `tasks` ADD COLUMN `dihapus_pada` DATETIME NULL AFTER `custom_url`;
    END IF;

    -- 6. Buat indeks untuk dihapus_pada jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'tasks' AND INDEX_NAME = 'idx_tasks_dihapus'
    ) THEN
        ALTER TABLE `tasks` ADD INDEX `idx_tasks_dihapus` (`dihapus_pada`);
    END IF;


    -- =========================================================================
    -- C. TABEL COURSES
    -- =========================================================================

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'semester_id'
    ) THEN
        ALTER TABLE `courses` ADD COLUMN `semester_id` VARCHAR(64) NULL AFTER `id`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'kode'
    ) THEN
        ALTER TABLE `courses` ADD COLUMN `kode` VARCHAR(64) DEFAULT '' AFTER `nama`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'dosen'
    ) THEN
        ALTER TABLE `courses` ADD COLUMN `dosen` VARCHAR(255) DEFAULT '' AFTER `kode`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'sks'
    ) THEN
        ALTER TABLE `courses` ADD COLUMN `sks` INT NOT NULL DEFAULT 3 AFTER `dosen`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'warna'
    ) THEN
        ALTER TABLE `courses` ADD COLUMN `warna` VARCHAR(32) DEFAULT '#2C5EF5' AFTER `sks`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'ikon'
    ) THEN
        ALTER TABLE `courses` ADD COLUMN `ikon` VARCHAR(64) DEFAULT 'book' AFTER `warna`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'urutan'
    ) THEN
        ALTER TABLE `courses` ADD COLUMN `urutan` INT NOT NULL DEFAULT 1 AFTER `ikon`;
    END IF;


    -- =========================================================================
    -- D. TABEL SEMESTERS
    -- =========================================================================

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'diarsipkan'
    ) THEN
        ALTER TABLE `semesters` ADD COLUMN `diarsipkan` TINYINT(1) NOT NULL DEFAULT 0 AFTER `ikon`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'tanggal_mulai'
    ) THEN
        ALTER TABLE `semesters` ADD COLUMN `tanggal_mulai` DATE NULL AFTER `nama`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'tanggal_selesai'
    ) THEN
        ALTER TABLE `semesters` ADD COLUMN `tanggal_selesai` DATE NULL AFTER `tanggal_mulai`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'warna'
    ) THEN
        ALTER TABLE `semesters` ADD COLUMN `warna` VARCHAR(32) DEFAULT '#2C5EF5' AFTER `tanggal_selesai`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = current_db AND TABLE_NAME = 'semesters' AND COLUMN_NAME = 'ikon'
    ) THEN
        ALTER TABLE `semesters` ADD COLUMN `ikon` VARCHAR(64) DEFAULT 'book-open' AFTER `warna`;
    END IF;

END$$

DELIMITER ;

-- Eksekusi Prosedur Migrasi
CALL `MigrateTugasInSchema`();

-- Hapus prosedur setelah migrasi selesai agar database tetap bersih
DROP PROCEDURE IF EXISTS `MigrateTugasInSchema`;

-- =============================================================================
-- 2. TABEL BARU JIKA BELUM ADA (CREATE IF NOT EXISTS)
-- =============================================================================

-- Pastikan tabel Semesters ada
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

-- Pastikan tabel Projects ada
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

-- Pastikan tabel Schedules ada
CREATE TABLE IF NOT EXISTS `schedules` (
  `id` VARCHAR(64) NOT NULL,
  `course_id` VARCHAR(64) NULL,
  `hari` VARCHAR(20) NOT NULL,
  `jam_mulai` TIME NOT NULL,
  `jam_selesai` TIME NOT NULL,
  `ruangan` VARCHAR(100) DEFAULT '',
  `dosen` VARCHAR(255) DEFAULT '',
  `jenis` VARCHAR(64) DEFAULT 'Kuliah',
  `warna` VARCHAR(32) DEFAULT '#2C5EF5',
  `keterangan` TEXT NULL,
  `pengingat_aktif` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_schedules_course` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pastikan tabel Schedule Reminder Logs ada
CREATE TABLE IF NOT EXISTS `schedule_reminder_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `schedule_id` VARCHAR(64) NOT NULL,
  `reminder_type` VARCHAR(20) NOT NULL,
  `tanggal` DATE NOT NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_sched_rem_unique` (`schedule_id`, `reminder_type`, `tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pastikan tabel Task Attachments ada
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

-- Pastikan tabel Subtasks ada
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

-- Pastikan tabel Settings ada
CREATE TABLE IF NOT EXISTS `settings` (
  `kunci` VARCHAR(64) NOT NULL,
  `nilai` TEXT NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`kunci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. SINKRONISASI DATA STATUS GLOBAL & INTEGRITAS DATA TASK
-- =============================================================================

-- Masukkan 4 status kanban global standar jika belum ada
INSERT INTO `statuses` (`id`, `nama`, `urutan`, `apakah_selesai`) VALUES
('st_todo', 'Belum Mulai', 0, 0),
('st_prog', 'Sedang Dikerjakan', 1, 0),
('st_rev', 'Butuh Review', 2, 0),
('st_done', 'Selesai', 3, 1)
ON DUPLICATE KEY UPDATE 
  `nama` = VALUES(`nama`),
  `urutan` = VALUES(`urutan`),
  `apakah_selesai` = VALUES(`apakah_selesai`);

-- Bersihkan / perbaiki task yang memiliki status_id tidak terdaftar di statuses
UPDATE `tasks` 
SET `status_id` = 'st_todo' 
WHERE `status_id` NOT IN (SELECT `id` FROM `statuses`);

-- Pastikan Foreign Key tasks -> statuses aktif dan valid
SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND CONSTRAINT_NAME = 'fk_tasks_status'
);

SET @sql_add_fk = IF(@fk_exists = 0, 
    'ALTER TABLE `tasks` ADD CONSTRAINT `fk_tasks_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`) ON DELETE RESTRICT', 
    'SELECT "FK fk_tasks_status sudah aktif" AS info'
);
PREPARE stmt FROM @sql_add_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Masukkan default settings jika belum ada
INSERT IGNORE INTO `settings` (`kunci`, `nilai`) VALUES
('theme', 'light'),
('telegram_bot_token', ''),
('telegram_chat_id', ''),
('telegram_enabled', '0'),
('default_reminder_hours', '[72, 24, 2]'),
('snooze_minutes', '15'),
('timezone', 'Asia/Jakarta');
