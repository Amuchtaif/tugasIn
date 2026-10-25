-- =============================================================================
-- Migration Script: Penambahan Fitur Jadwal Kuliah & Pengingat Telegram
-- Database: tugasin_db
-- Aman dijalankan pada database yang sudah berisi data (tidak menghapus data lama)
-- =============================================================================

-- Pastikan database aktif
-- USE `tugasin_db`; -- Buka komentar jika diperlukan

-- 1. Buat Tabel Schedules (Jadwal Kuliah Mingguan)
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
  KEY `idx_schedules_hari` (`hari`),
  CONSTRAINT `fk_schedules_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Buat Tabel Schedule Reminder Logs (Tracking Riwayat Pengingat Jadwal)
CREATE TABLE IF NOT EXISTS `schedule_reminder_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `schedule_id` VARCHAR(64) NOT NULL,
  `reminder_type` VARCHAR(20) NOT NULL,
  `tanggal` DATE NOT NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_sched_rem_unique` (`schedule_id`, `reminder_type`, `tanggal`),
  KEY `idx_sched_rem_schedule` (`schedule_id`),
  CONSTRAINT `fk_sched_rem_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. (Opsional) Perbarui Nama Ikon FontAwesome pada Kursus Bawaan
UPDATE `courses` SET `ikon` = 'brain' WHERE `id` = 'crs_ai';
UPDATE `courses` SET `ikon` = 'palette' WHERE `id` = 'crs_uiux';

-- 4. (Opsional) Tambahkan Contoh Data Jadwal Kuliah Awal (Akan dilewati jika ID sudah ada)
INSERT IGNORE INTO `schedules` (`id`, `course_id`, `hari`, `jam_mulai`, `jam_selesai`, `ruangan`, `dosen`, `jenis`, `warna`, `keterangan`, `pengingat_aktif`) VALUES
('sch_1', 'crs_web', 'Senin', '08:00:00', '10:30:00', 'Lab Komputer 3', 'Dr. Ir. Budi Santoso', 'Praktikum', '#0284C7', 'Modul 5: REST API & Autentikasi', 1),
('sch_2', 'crs_db', 'Selasa', '10:00:00', '12:30:00', 'Gedung D Ruang 301', 'Siti Rahma, M.Kom', 'Kuliah', '#D97706', 'Materi Normalisasi BCNF & Indeks', 1),
('sch_3', 'crs_ai', 'Rabu', '13:00:00', '15:30:00', 'Lab AI & Robotika', 'Hendra Wijaya, Ph.D', 'Praktikum', '#2563EB', 'Hands-on PyTorch CNN', 1),
('sch_4', 'crs_uiux', 'Kamis', '08:00:00', '10:00:00', 'Studio Desain 2', 'Diana Lestari, M.Ds', 'Kuliah', '#DB2777', 'Presentasi Prototype Figma', 1),
('sch_5', 'crs_dist', 'Jumat', '09:00:00', '11:30:00', 'Gedung E Ruang 204', 'Agus Pratama, M.T', 'Kuliah', '#7C3AED', 'Diskusi Konsensus Raft', 1);
