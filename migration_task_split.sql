-- =============================================================================
-- Migration: Pemisahan Task & Status Mata Kuliah vs Proyek
-- Database: tugasin_db
-- =============================================================================

-- 1. Tabel Statuses: Tambahkan course_id dan project_id
ALTER TABLE `statuses`
  ADD COLUMN `course_id` VARCHAR(64) NULL AFTER `id`,
  ADD COLUMN `project_id` VARCHAR(64) NULL AFTER `course_id`,
  ADD KEY `idx_statuses_course` (`course_id`),
  ADD KEY `idx_statuses_project` (`project_id`);

-- 2. Tambahkan Foreign Key & Check Constraint pada Statuses
ALTER TABLE `statuses`
  ADD CONSTRAINT `fk_statuses_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_statuses_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `chk_status_owner` CHECK (
    (`course_id` IS NOT NULL AND `project_id` IS NULL) OR
    (`course_id` IS NULL AND `project_id` IS NOT NULL)
  );

-- 3. Tabel Tasks: Ubah Foreign Key ke CASCADE dan tambahkan Check Constraint
ALTER TABLE `tasks` DROP FOREIGN KEY `fk_tasks_course`;
ALTER TABLE `tasks` DROP FOREIGN KEY `fk_tasks_project`;

ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_tasks_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `chk_task_owner` CHECK (
    (`course_id` IS NOT NULL AND `project_id` IS NULL) OR
    (`course_id` IS NULL AND `project_id` IS NOT NULL)
  );

-- 4. Tabel Custom Fields (Task 1.4)
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
  KEY `idx_custom_fields_project` (`project_id`),
  CONSTRAINT `fk_custom_fields_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_custom_fields_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_customfield_owner` CHECK (
    (`course_id` IS NOT NULL AND `project_id` IS NULL) OR
    (`course_id` IS NULL AND `project_id` IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
