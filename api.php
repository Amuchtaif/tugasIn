<?php
/**
 * TugasIn - MySQL Backend REST API (PHP PDO)
 * Provides real-time persistence, relational integrity, and Telegram proxy
 */

// Matikan display_errors HTML agar respon API selalu berupa JSON murni tanpa tercampur pesan error/warning PHP
@ini_set('display_errors', '0');
error_reporting(0);
if (!ob_get_level()) {
    @ob_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

// Helper to read incoming JSON
function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Helper to communicate with Telegram Bot API
function callTelegramApi($token, $method, $params = []) {
    $url = "https://api.telegram.org/bot{$token}/{$method}";
    $response = false;
    $err = '';

    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        if (defined('CURL_IPRESOLVE_V4')) {
            curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
        }
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 6);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; TugasInBot/2.2)');

        if (!empty($params)) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        }
        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
    }

    // Fallback using stream context if cURL returned false or timed out
    if ($response === false) {
        $options = [
            'http' => [
                'method' => !empty($params) ? 'POST' : 'GET',
                'header' => "Content-Type: application/json\r\nUser-Agent: Mozilla/5.0 (compatible; TugasInBot/2.2)\r\n",
                'content' => !empty($params) ? json_encode($params) : '',
                'timeout' => 8,
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false
            ]
        ];
        $context = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);
    }

    if ($response === false) {
        return [
            'ok' => false,
            'error' => $err ?: 'Server hosting gagal terhubung ke api.telegram.org (Koneksi keluar mungkin diblokir oleh firewall hosting Anda).'
        ];
    }

    $data = json_decode($response, true);
    return $data ?: ['ok' => false, 'error' => 'Respon Telegram tidak dapat dibaca.', 'raw' => $response];
}

// Helper to remove physical attachment and thumbnail files from disk
function deletePhysicalAttachmentFiles($storagePath, $id) {
    $baseUploadDir = __DIR__ . '/uploads/attachments/';
    if (!empty($storagePath) && file_exists($baseUploadDir . $storagePath)) {
        @unlink($baseUploadDir . $storagePath);
    }
    $thumbPath = $baseUploadDir . 'thumbnails/' . $id . '_thumb.webp';
    if (file_exists($thumbPath)) {
        @unlink($thumbPath);
    }
}

function ensureScheduleTablesExist($db) {
    static $ensured = false;
    if ($ensured) return;
    try {
        $db->exec("
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

            CREATE TABLE IF NOT EXISTS `schedule_reminder_logs` (
              `id` INT AUTO_INCREMENT PRIMARY KEY,
              `schedule_id` VARCHAR(64) NOT NULL,
              `reminder_type` VARCHAR(20) NOT NULL,
              `tanggal` DATE NOT NULL,
              `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY `idx_sched_rem_unique` (`schedule_id`, `reminder_type`, `tanggal`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // Seed initial schedules if empty
        $count = $db->query("SELECT count(*) FROM `schedules`")->fetchColumn();
        if ((int)$count === 0) {
            $db->exec("
                INSERT IGNORE INTO `schedules` (`id`, `course_id`, `hari`, `jam_mulai`, `jam_selesai`, `ruangan`, `dosen`, `jenis`, `warna`, `keterangan`, `pengingat_aktif`) VALUES
                ('sch_1', 'crs_web', 'Senin', '08:00:00', '10:30:00', 'Lab Komputer 3', 'Dr. Ir. Budi Santoso', 'Praktikum', '#0284C7', 'Modul 5: REST API & Autentikasi', 1),
                ('sch_2', 'crs_db', 'Selasa', '10:00:00', '12:30:00', 'Gedung D Ruang 301', 'Siti Rahma, M.Kom', 'Kuliah', '#D97706', 'Materi Normalisasi BCNF & Indeks', 1),
                ('sch_3', 'crs_ai', 'Rabu', '13:00:00', '15:30:00', 'Lab AI & Robotika', 'Hendra Wijaya, Ph.D', 'Praktikum', '#2563EB', 'Hands-on PyTorch CNN', 1),
                ('sch_4', 'crs_uiux', 'Kamis', '08:00:00', '10:00:00', 'Studio Desain 2', 'Diana Lestari, M.Ds', 'Kuliah', '#DB2777', 'Presentasi Prototype Figma', 1),
                ('sch_5', 'crs_dist', 'Jumat', '09:00:00', '11:30:00', 'Gedung E Ruang 204', 'Agus Pratama, M.T', 'Kuliah', '#7C3AED', 'Diskusi Konsensus Raft', 1);
            ");
        }

        $ensured = true;
    } catch (Exception $e) {
        // Proceed silently
    }
}

try {
    $db = getDbConnection();

    // ---------------------------------------------------------
    // 1. PING & HEALTH CHECK
    // ---------------------------------------------------------
    if ($action === 'ping') {
        $taskCount = $db->query("SELECT count(*) FROM `tasks` WHERE `dihapus_pada` IS NULL")->fetchColumn();
        echo json_encode([
            'ok' => true,
            'database' => 'MySQL (tugasin_db)',
            'connected' => true,
            'active_tasks' => (int)$taskCount,
            'timestamp' => time()
        ]);
        exit;
    }

    // ---------------------------------------------------------
    // 2. GET ALL DATA (Complete Store Payload)
    // ---------------------------------------------------------
    if ($action === 'get_all') {
        // Semesters
        $semestersStmt = $db->query("SELECT id, nama, tanggal_mulai, tanggal_selesai, warna, ikon, (diarsipkan = 1) AS diarsipkan FROM semesters ORDER BY created_at ASC");
        $semesters = array_map(function($s) {
            $s['diarsipkan'] = (bool)$s['diarsipkan'];
            return $s;
        }, $semestersStmt->fetchAll());

        // Courses
        $coursesStmt = $db->query("SELECT id, semester_id, nama, kode, dosen, sks, warna, ikon, urutan FROM courses ORDER BY urutan ASC, created_at ASC");
        $courses = $coursesStmt->fetchAll();

        // Statuses
        $statusesStmt = $db->query("SELECT id, course_id, project_id, nama, urutan, (apakah_selesai = 1) AS apakah_selesai FROM statuses ORDER BY urutan ASC");
        $statuses = array_map(function($st) {
            $st['apakah_selesai'] = (bool)$st['apakah_selesai'];
            $st['urutan'] = (int)$st['urutan'];
            return $st;
        }, $statusesStmt->fetchAll());

        // Projects
        $projectsStmt = $db->query("SELECT id, user_id, nama, deskripsi, deadline, status FROM projects ORDER BY created_at ASC");
        $projects = $projectsStmt->fetchAll();

        // Subtasks indexed by task_id
        $subtasksStmt = $db->query("SELECT id, task_id, judul, (selesai = 1) AS selesai, urutan FROM subtasks ORDER BY urutan ASC, created_at ASC");
        $allSubtasks = $subtasksStmt->fetchAll();
        $subtasksByTask = [];
        foreach ($allSubtasks as $sub) {
            $tId = $sub['task_id'];
            if (!isset($subtasksByTask[$tId])) {
                $subtasksByTask[$tId] = [];
            }
            $subtasksByTask[$tId][] = [
                'id' => $sub['id'],
                'judul' => $sub['judul'],
                'selesai' => (bool)$sub['selesai'],
                'urutan' => (int)$sub['urutan']
            ];
        }

        // Attachments indexed by task_id
        $attachmentsStmt = $db->query("SELECT id, task_id, storage_path, file_name, mime_type, size_bytes, width, height, caption, urutan, created_at FROM task_attachments ORDER BY urutan ASC, created_at ASC");
        $allAttachments = $attachmentsStmt->fetchAll();
        $attachmentsByTask = [];
        foreach ($allAttachments as $att) {
            $tId = $att['task_id'];
            if (!isset($attachmentsByTask[$tId])) {
                $attachmentsByTask[$tId] = [];
            }
            $attachmentsByTask[$tId][] = [
                'id' => $att['id'],
                'task_id' => $att['task_id'],
                'file_name' => $att['file_name'],
                'storage_path' => $att['storage_path'],
                'url' => 'api.php?action=view_attachment&id=' . urlencode($att['id']),
                'thumb_url' => 'api.php?action=view_attachment&id=' . urlencode($att['id']) . '&thumb=1',
                'mime_type' => $att['mime_type'],
                'size_bytes' => (int)$att['size_bytes'],
                'width' => $att['width'] ? (int)$att['width'] : null,
                'height' => $att['height'] ? (int)$att['height'] : null,
                'caption' => $att['caption'] ?: '',
                'urutan' => (int)$att['urutan'],
                'created_at' => $att['created_at']
            ];
        }

        // Tasks
        $tasksStmt = $db->query("SELECT id, course_id, project_id, status_id, judul, deskripsi, prioritas, deadline, urutan, tags, custom_url, dihapus_pada FROM tasks ORDER BY urutan ASC, created_at DESC");
        $rawTasks = $tasksStmt->fetchAll();
        $tasks = [];
        foreach ($rawTasks as $t) {
            $tagsArr = [];
            if (!empty($t['tags'])) {
                $decoded = json_decode($t['tags'], true);
                $tagsArr = is_array($decoded) ? $decoded : array_filter(array_map('trim', explode(',', $t['tags'])));
            }

            // format deadline to ISO string if exists
            $deadline = null;
            if (!empty($t['deadline'])) {
                $deadline = date('c', strtotime($t['deadline']));
            }

            $dihapusPada = null;
            if (!empty($t['dihapus_pada'])) {
                $dihapusPada = date('c', strtotime($t['dihapus_pada']));
            }

            $tasks[] = [
                'id' => $t['id'],
                'course_id' => $t['course_id'] ?: '',
                'project_id' => $t['project_id'] ?: null,
                'status_id' => $t['status_id'],
                'judul' => $t['judul'],
                'deskripsi' => $t['deskripsi'] ?: '',
                'prioritas' => $t['prioritas'] ?: 'Sedang',
                'deadline' => $deadline,
                'urutan' => (int)$t['urutan'],
                'tags' => $tagsArr,
                'custom_values' => $t['custom_url'] ? ['url' => $t['custom_url']] : new stdClass(),
                'subtasks' => $subtasksByTask[$t['id']] ?? [],
                'attachments' => $attachmentsByTask[$t['id']] ?? [],
                'dihapus_pada' => $dihapusPada
            ];
        }

        // Settings
        $settingsStmt = $db->query("SELECT kunci, nilai FROM settings");
        $rawSettings = $settingsStmt->fetchAll();
        $settings = [
            'theme' => 'light',
            'telegram_bot_token' => '',
            'telegram_chat_id' => '',
            'telegram_enabled' => false,
            'default_reminder_hours' => [72, 24, 2],
            'snooze_minutes' => 15,
            'timezone' => 'Asia/Jakarta'
        ];
        foreach ($rawSettings as $s) {
            $key = $s['kunci'];
            $val = $s['nilai'];
            if ($key === 'telegram_enabled') {
                $settings[$key] = ($val === '1' || $val === 'true');
            } elseif ($key === 'default_reminder_hours') {
                $decoded = json_decode($val, true);
                if (is_array($decoded)) $settings[$key] = $decoded;
            } elseif ($key === 'snooze_minutes') {
                $settings[$key] = (int)$val;
            } else {
                $settings[$key] = $val;
            }
        }

        ensureScheduleTablesExist($db);

        // Schedules (Jadwal Kuliah Mingguan)
        $schedules = [];
        try {
            $schedulesStmt = $db->query("
                SELECT s.id, s.course_id, s.hari, s.jam_mulai, s.jam_selesai, s.ruangan, s.dosen, s.jenis, s.warna, s.keterangan,
                       (s.pengingat_aktif = 1) AS pengingat_aktif,
                       c.nama AS course_nama, c.kode AS course_kode, c.dosen AS course_dosen, c.ikon AS course_ikon, c.warna AS course_warna, c.sks, c.semester_id
                FROM schedules s
                LEFT JOIN courses c ON s.course_id = c.id
                ORDER BY FIELD(s.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), s.jam_mulai ASC
            ");
            $schedules = array_map(function($sch) {
                $sch['pengingat_aktif'] = (bool)$sch['pengingat_aktif'];
                $sch['jam_mulai_formatted'] = !empty($sch['jam_mulai']) ? substr($sch['jam_mulai'], 0, 5) : '';
                $sch['jam_selesai_formatted'] = !empty($sch['jam_selesai']) ? substr($sch['jam_selesai'], 0, 5) : '';
                return $sch;
            }, $schedulesStmt->fetchAll());
        } catch (Exception $e) {
            $schedules = [];
        }

        echo json_encode([
            'ok' => true,
            'source' => 'mysql',
            'data' => [
                'semesters' => $semesters,
                'courses' => $courses,
                'schedules' => $schedules,
                'statuses' => $statuses,
                'projects' => $projects,
                'tasks' => $tasks,
                'settings' => $settings
            ]
        ]);
        exit;
    }

    // ---------------------------------------------------------
    // 3. TASK MUTATIONS (Add, Update, Delete, Toggle)
    // ---------------------------------------------------------
    if ($action === 'save_task') {
        $task = getJsonInput();
        if (empty($task['id']) || empty($task['judul'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Data task tidak lengkap (id & judul wajib).']);
            exit;
        }

        $db->beginTransaction();

        $deadline = !empty($task['deadline']) ? date('Y-m-d H:i:s', strtotime($task['deadline'])) : null;
        $dihapusPada = !empty($task['dihapus_pada']) ? date('Y-m-d H:i:s', strtotime($task['dihapus_pada'])) : null;
        $tags = isset($task['tags']) ? json_encode(array_values($task['tags'])) : '[]';
        $customUrl = isset($task['custom_values']['url']) ? $task['custom_values']['url'] : null;
        $courseId = !empty($task['course_id']) ? $task['course_id'] : null;
        $projectId = !empty($task['project_id']) ? $task['project_id'] : null;

        // TASK 4.1: Tolak jika mengirim course_id DAN project_id bersamaan, atau tidak mengirim keduanya
        if (($courseId !== null && $projectId !== null) || ($courseId === null && $projectId === null)) {
            http_response_code(400);
            echo json_encode([
                'ok' => false,
                'error' => 'Task hanya boleh dimiliki satu mata kuliah atau satu project (tidak boleh keduanya atau kosong).'
            ]);
            exit;
        }

        // TASK 4.2 & 4.4: Validasi status_id milik mata kuliah atau project yang sama
        if ($courseId !== null) {
            $stCheck = $db->prepare("SELECT id FROM statuses WHERE id = :status_id AND course_id = :course_id");
            $stCheck->execute([':status_id' => $task['status_id'] ?? '', ':course_id' => $courseId]);
        } else {
            $stCheck = $db->prepare("SELECT id FROM statuses WHERE id = :status_id AND project_id = :project_id");
            $stCheck->execute([':status_id' => $task['status_id'] ?? '', ':project_id' => $projectId]);
        }
        $validStatus = $stCheck->fetchColumn();

        if (!$validStatus) {
            // Jika dipindah induk atau status tidak cocok, ambil status urutan pertama dari pemilik baru
            if ($courseId !== null) {
                $defaultStStmt = $db->prepare("SELECT id FROM statuses WHERE course_id = :course_id ORDER BY urutan ASC LIMIT 1");
                $defaultStStmt->execute([':course_id' => $courseId]);
            } else {
                $defaultStStmt = $db->prepare("SELECT id FROM statuses WHERE project_id = :project_id ORDER BY urutan ASC LIMIT 1");
                $defaultStStmt->execute([':project_id' => $projectId]);
            }
            $fallbackStatus = $defaultStStmt->fetchColumn();
            if ($fallbackStatus) {
                $task['status_id'] = $fallbackStatus;
            } else {
                http_response_code(400);
                echo json_encode([
                    'ok' => false,
                    'error' => 'Status tidak valid untuk mata kuliah atau project yang dipilih.'
                ]);
                exit;
            }
        }

        $stmt = $db->prepare("
            INSERT INTO tasks (id, course_id, project_id, status_id, judul, deskripsi, prioritas, deadline, urutan, tags, custom_url, dihapus_pada)
            VALUES (:id, :course_id, :project_id, :status_id, :judul, :deskripsi, :prioritas, :deadline, :urutan, :tags, :custom_url, :dihapus_pada)
            ON DUPLICATE KEY UPDATE
                course_id = VALUES(course_id),
                project_id = VALUES(project_id),
                status_id = VALUES(status_id),
                judul = VALUES(judul),
                deskripsi = VALUES(deskripsi),
                prioritas = VALUES(prioritas),
                deadline = VALUES(deadline),
                urutan = VALUES(urutan),
                tags = VALUES(tags),
                custom_url = VALUES(custom_url),
                dihapus_pada = VALUES(dihapus_pada)
        ");

        $stmt->execute([
            ':id' => $task['id'],
            ':course_id' => $courseId,
            ':project_id' => $projectId,
            ':status_id' => $task['status_id'],
            ':judul' => $task['judul'],
            ':deskripsi' => $task['deskripsi'] ?? '',
            ':prioritas' => $task['prioritas'] ?? 'Sedang',
            ':deadline' => $deadline,
            ':urutan' => (int)($task['urutan'] ?? 0),
            ':tags' => $tags,
            ':custom_url' => $customUrl,
            ':dihapus_pada' => $dihapusPada
        ]);

        // Replace subtasks
        if (isset($task['subtasks']) && is_array($task['subtasks'])) {
            $delSub = $db->prepare("DELETE FROM subtasks WHERE task_id = :task_id");
            $delSub->execute([':task_id' => $task['id']]);

            $subStmt = $db->prepare("
                INSERT INTO subtasks (id, task_id, judul, selesai, urutan)
                VALUES (:id, :task_id, :judul, :selesai, :urutan)
            ");

            foreach ($task['subtasks'] as $i => $sub) {
                $subId = !empty($sub['id']) ? $sub['id'] : ('sub_' . $task['id'] . '_' . $i);
                $subStmt->execute([
                    ':id' => $subId,
                    ':task_id' => $task['id'],
                    ':judul' => $sub['judul'] ?? '',
                    ':selesai' => !empty($sub['selesai']) ? 1 : 0,
                    ':urutan' => $i
                ]);
            }
        }

        $db->commit();
        echo json_encode(['ok' => true, 'id' => $task['id']]);
        exit;
    }

    if ($action === 'delete_task') {
        $input = getJsonInput();
        $id = $input['id'] ?? ($_GET['id'] ?? '');
        $permanent = !empty($input['permanent']);

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'ID task wajib diisi.']);
            exit;
        }

        if ($permanent) {
            // Remove physical attachment and thumbnail files from disk
            $attStmt = $db->prepare("SELECT id, storage_path FROM task_attachments WHERE task_id = :id");
            $attStmt->execute([':id' => $id]);
            $atts = $attStmt->fetchAll();
            foreach ($atts as $a) {
                deletePhysicalAttachmentFiles($a['storage_path'], $a['id']);
            }

            $stmt = $db->prepare("DELETE FROM tasks WHERE id = :id");
            $stmt->execute([':id' => $id]);
        } else {
            $stmt = $db->prepare("UPDATE tasks SET dihapus_pada = NOW() WHERE id = :id");
            $stmt->execute([':id' => $id]);
        }

        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'restore_task') {
        $input = getJsonInput();
        $id = $input['id'] ?? ($_GET['id'] ?? '');
        $stmt = $db->prepare("UPDATE tasks SET dihapus_pada = NULL WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'empty_trash') {
        // Remove physical files for all attachments belonging to trashed tasks
        $attStmt = $db->query("
            SELECT ta.id, ta.storage_path 
            FROM task_attachments ta 
            JOIN tasks t ON ta.task_id = t.id 
            WHERE t.dihapus_pada IS NOT NULL
        ");
        $trashedAtts = $attStmt->fetchAll();
        foreach ($trashedAtts as $a) {
            deletePhysicalAttachmentFiles($a['storage_path'], $a['id']);
        }

        $db->exec("DELETE FROM tasks WHERE dihapus_pada IS NOT NULL");
        echo json_encode(['ok' => true]);
        exit;
    }

    // ---------------------------------------------------------
    // 4. SEMESTER MUTATIONS
    // ---------------------------------------------------------
    if ($action === 'save_semester') {
        $sem = getJsonInput();
        if (empty($sem['id']) || empty($sem['nama'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Data semester tidak lengkap.']);
            exit;
        }

        $stmt = $db->prepare("
            INSERT INTO semesters (id, nama, tanggal_mulai, tanggal_selesai, warna, ikon, diarsipkan)
            VALUES (:id, :nama, :tanggal_mulai, :tanggal_selesai, :warna, :ikon, :diarsipkan)
            ON DUPLICATE KEY UPDATE
                nama = VALUES(nama),
                tanggal_mulai = VALUES(tanggal_mulai),
                tanggal_selesai = VALUES(tanggal_selesai),
                warna = VALUES(warna),
                ikon = VALUES(ikon),
                diarsipkan = VALUES(diarsipkan)
        ");

        $stmt->execute([
            ':id' => $sem['id'],
            ':nama' => $sem['nama'],
            ':tanggal_mulai' => !empty($sem['tanggal_mulai']) ? $sem['tanggal_mulai'] : null,
            ':tanggal_selesai' => !empty($sem['tanggal_selesai']) ? $sem['tanggal_selesai'] : null,
            ':warna' => $sem['warna'] ?? '#2C5EF5',
            ':ikon' => $sem['ikon'] ?? 'book-open',
            ':diarsipkan' => !empty($sem['diarsipkan']) ? 1 : 0
        ]);

        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'delete_semester') {
        $input = getJsonInput();
        $id = $input['id'] ?? ($_GET['id'] ?? '');
        $stmt = $db->prepare("DELETE FROM semesters WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['ok' => true]);
        exit;
    }

    // ---------------------------------------------------------
    // 5. COURSE MUTATIONS
    // ---------------------------------------------------------
    if ($action === 'save_course') {
        $crs = getJsonInput();
        if (empty($crs['id']) || empty($crs['nama']) || empty($crs['semester_id'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Data mata kuliah tidak lengkap.']);
            exit;
        }

        $stmt = $db->prepare("
            INSERT INTO courses (id, semester_id, nama, kode, dosen, sks, warna, ikon, urutan)
            VALUES (:id, :semester_id, :nama, :kode, :dosen, :sks, :warna, :ikon, :urutan)
            ON DUPLICATE KEY UPDATE
                semester_id = VALUES(semester_id),
                nama = VALUES(nama),
                kode = VALUES(kode),
                dosen = VALUES(dosen),
                sks = VALUES(sks),
                warna = VALUES(warna),
                ikon = VALUES(ikon),
                urutan = VALUES(urutan)
        ");

        $stmt->execute([
            ':id' => $crs['id'],
            ':semester_id' => $crs['semester_id'],
            ':nama' => $crs['nama'],
            ':kode' => $crs['kode'] ?? '',
            ':dosen' => $crs['dosen'] ?? '',
            ':sks' => (int)($crs['sks'] ?? 3),
            ':warna' => $crs['warna'] ?? '#2C5EF5',
            ':ikon' => $crs['ikon'] ?? 'book',
            ':urutan' => (int)($crs['urutan'] ?? 1)
        ]);

        // Pastikan mata kuliah memiliki status bawaan jika belum ada
        $checkSt = $db->prepare("SELECT COUNT(*) FROM statuses WHERE course_id = :course_id");
        $checkSt->execute([':course_id' => $crs['id']]);
        if ((int)$checkSt->fetchColumn() === 0) {
            $insertSt = $db->prepare("
                INSERT INTO statuses (id, course_id, project_id, nama, urutan, apakah_selesai)
                VALUES (:id, :course_id, NULL, :nama, :urutan, :apakah_selesai)
            ");
            $insertSt->execute([':id' => 'st_' . $crs['id'] . '_todo', ':course_id' => $crs['id'], ':nama' => 'Belum Mulai', ':urutan' => 0, ':apakah_selesai' => 0]);
            $insertSt->execute([':id' => 'st_' . $crs['id'] . '_prog', ':course_id' => $crs['id'], ':nama' => 'Sedang Dikerjakan', ':urutan' => 1, ':apakah_selesai' => 0]);
            $insertSt->execute([':id' => 'st_' . $crs['id'] . '_rev', ':course_id' => $crs['id'], ':nama' => 'Butuh Review', ':urutan' => 2, ':apakah_selesai' => 0]);
            $insertSt->execute([':id' => 'st_' . $crs['id'] . '_done', ':course_id' => $crs['id'], ':nama' => 'Selesai', ':urutan' => 3, ':apakah_selesai' => 1]);
        }

        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'delete_course') {
        $input = getJsonInput();
        $id = $input['id'] ?? ($_GET['id'] ?? '');
        $stmt = $db->prepare("DELETE FROM courses WHERE id = :id");
        $stmt->execute([':id' => $id]);
        // Cascade delete related schedules
        $stmtSch = $db->prepare("DELETE FROM schedules WHERE course_id = :id");
        $stmtSch->execute([':id' => $id]);
        echo json_encode(['ok' => true]);
        exit;
    }

    // ---------------------------------------------------------
    // 6. PROJECT MUTATIONS
    // ---------------------------------------------------------
    if ($action === 'save_project') {
        $prj = getJsonInput();
        if (empty($prj['id']) || empty($prj['nama'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Data proyek tidak lengkap.']);
            exit;
        }

        $deadline = !empty($prj['deadline']) ? date('Y-m-d H:i:s', strtotime($prj['deadline'])) : null;

        $stmt = $db->prepare("
            INSERT INTO projects (id, user_id, nama, deskripsi, deadline, status)
            VALUES (:id, :user_id, :nama, :deskripsi, :deadline, :status)
            ON DUPLICATE KEY UPDATE
                nama = VALUES(nama),
                deskripsi = VALUES(deskripsi),
                deadline = VALUES(deadline),
                status = VALUES(status)
        ");

        $stmt->execute([
            ':id' => $prj['id'],
            ':user_id' => $prj['user_id'] ?? 'usr_me',
            ':nama' => $prj['nama'],
            ':deskripsi' => $prj['deskripsi'] ?? '',
            ':deadline' => $deadline,
            ':status' => $prj['status'] ?? 'Perencanaan'
        ]);

        // Task 1.5: Saat project dibuat, buat status bawaan (Belum mulai, Dikerjakan, Review, Selesai)
        $checkSt = $db->prepare("SELECT COUNT(*) FROM statuses WHERE project_id = :project_id");
        $checkSt->execute([':project_id' => $prj['id']]);
        if ((int)$checkSt->fetchColumn() === 0) {
            $insertSt = $db->prepare("
                INSERT INTO statuses (id, course_id, project_id, nama, urutan, apakah_selesai)
                VALUES (:id, NULL, :project_id, :nama, :urutan, :apakah_selesai)
            ");
            $insertSt->execute([':id' => 'st_' . $prj['id'] . '_todo', ':project_id' => $prj['id'], ':nama' => 'Belum Mulai', ':urutan' => 0, ':apakah_selesai' => 0]);
            $insertSt->execute([':id' => 'st_' . $prj['id'] . '_prog', ':project_id' => $prj['id'], ':nama' => 'Dikerjakan', ':urutan' => 1, ':apakah_selesai' => 0]);
            $insertSt->execute([':id' => 'st_' . $prj['id'] . '_rev', ':project_id' => $prj['id'], ':nama' => 'Review', ':urutan' => 2, ':apakah_selesai' => 0]);
            $insertSt->execute([':id' => 'st_' . $prj['id'] . '_done', ':project_id' => $prj['id'], ':nama' => 'Selesai', ':urutan' => 3, ':apakah_selesai' => 1]);
        }

        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'delete_project') {
        $input = getJsonInput();
        $id = $input['id'] ?? ($_GET['id'] ?? '');
        $stmt = $db->prepare("DELETE FROM projects WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['ok' => true]);
        exit;
    }

    // ---------------------------------------------------------
    // 7. STATUS MUTATIONS
    // ---------------------------------------------------------
    if ($action === 'save_status') {
        $st = getJsonInput();
        if (empty($st['id']) || empty($st['nama'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Data status tidak lengkap.']);
            exit;
        }

        $courseId = !empty($st['course_id']) ? $st['course_id'] : null;
        $projectId = !empty($st['project_id']) ? $st['project_id'] : null;

        if (($courseId !== null && $projectId !== null) || ($courseId === null && $projectId === null)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Status harus dimiliki tepat satu mata kuliah atau satu project.']);
            exit;
        }

        $stmt = $db->prepare("
            INSERT INTO statuses (id, course_id, project_id, nama, urutan, apakah_selesai)
            VALUES (:id, :course_id, :project_id, :nama, :urutan, :apakah_selesai)
            ON DUPLICATE KEY UPDATE
                course_id = VALUES(course_id),
                project_id = VALUES(project_id),
                nama = VALUES(nama),
                urutan = VALUES(urutan),
                apakah_selesai = VALUES(apakah_selesai)
        ");

        $stmt->execute([
            ':id' => $st['id'],
            ':course_id' => $courseId,
            ':project_id' => $projectId,
            ':nama' => $st['nama'],
            ':urutan' => (int)($st['urutan'] ?? 0),
            ':apakah_selesai' => !empty($st['apakah_selesai']) ? 1 : 0
        ]);

        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'delete_status') {
        $input = getJsonInput();
        $id = $input['id'] ?? ($_GET['id'] ?? '');

        // Validasi minimal harus ada 1 status tersisa untuk pemilik status tersebut
        $ownerStmt = $db->prepare("SELECT course_id, project_id FROM statuses WHERE id = :id");
        $ownerStmt->execute([':id' => $id]);
        $owner = $ownerStmt->fetch();

        if ($owner) {
            if ($owner['course_id'] !== null) {
                $countStmt = $db->prepare("SELECT COUNT(*) FROM statuses WHERE course_id = :course_id");
                $countStmt->execute([':course_id' => $owner['course_id']]);
            } else {
                $countStmt = $db->prepare("SELECT COUNT(*) FROM statuses WHERE project_id = :project_id");
                $countStmt->execute([':project_id' => $owner['project_id']]);
            }
            if ((int)$countStmt->fetchColumn() <= 1) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Kolom status minimal harus tersisa satu.']);
                exit;
            }
        }

        $stmt = $db->prepare("DELETE FROM statuses WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['ok' => true]);
        exit;
    }

    // ---------------------------------------------------------
    // 7.5 SCHEDULE MUTATIONS (Jadwal Kuliah Mingguan)
    // ---------------------------------------------------------
    if ($action === 'save_schedule') {
        ensureScheduleTablesExist($db);
        $sch = getJsonInput();
        if (empty($sch['id']) || empty($sch['course_id']) || empty($sch['hari']) || empty($sch['jam_mulai'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Data jadwal kuliah tidak lengkap.']);
            exit;
        }

        $stmt = $db->prepare("
            INSERT INTO schedules (id, course_id, hari, jam_mulai, jam_selesai, ruangan, dosen, jenis, warna, keterangan, pengingat_aktif)
            VALUES (:id, :course_id, :hari, :jam_mulai, :jam_selesai, :ruangan, :dosen, :jenis, :warna, :keterangan, :pengingat_aktif)
            ON DUPLICATE KEY UPDATE
                course_id = VALUES(course_id),
                hari = VALUES(hari),
                jam_mulai = VALUES(jam_mulai),
                jam_selesai = VALUES(jam_selesai),
                ruangan = VALUES(ruangan),
                dosen = VALUES(dosen),
                jenis = VALUES(jenis),
                warna = VALUES(warna),
                keterangan = VALUES(keterangan),
                pengingat_aktif = VALUES(pengingat_aktif)
        ");

        $stmt->execute([
            ':id' => $sch['id'],
            ':course_id' => $sch['course_id'],
            ':hari' => $sch['hari'],
            ':jam_mulai' => $sch['jam_mulai'],
            ':jam_selesai' => !empty($sch['jam_selesai']) ? $sch['jam_selesai'] : $sch['jam_mulai'],
            ':ruangan' => $sch['ruangan'] ?? '',
            ':dosen' => $sch['dosen'] ?? '',
            ':jenis' => $sch['jenis'] ?? 'Kuliah',
            ':warna' => !empty($sch['warna']) ? $sch['warna'] : null,
            ':keterangan' => $sch['keterangan'] ?? '',
            ':pengingat_aktif' => isset($sch['pengingat_aktif']) ? ($sch['pengingat_aktif'] ? 1 : 0) : 1
        ]);

        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'delete_schedule') {
        ensureScheduleTablesExist($db);
        $input = getJsonInput();
        $id = $input['id'] ?? ($_GET['id'] ?? '');
        $stmt = $db->prepare("DELETE FROM schedules WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'test_schedule_reminder') {
        ensureScheduleTablesExist($db);
        $input = getJsonInput();
        $scheduleId = $input['schedule_id'] ?? ($_GET['schedule_id'] ?? '');
        $reminderType = $input['type'] ?? '60m';

        $stmt = $db->prepare("
            SELECT s.*, c.nama AS course_nama, c.kode AS course_kode, c.dosen AS course_dosen, c.sks, c.ikon AS course_ikon
            FROM schedules s
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE s.id = :id
        ");
        $stmt->execute([':id' => $scheduleId]);
        $sch = $stmt->fetch();

        if (!$sch) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Jadwal kuliah tidak ditemukan.']);
            exit;
        }

        $settingsStmt = $db->query("SELECT kunci, nilai FROM settings WHERE kunci IN ('telegram_bot_token', 'telegram_chat_id', 'telegram_enabled')");
        $settingsRaw = $settingsStmt->fetchAll(PDO::FETCH_KEY_PAIR);
        $token = $settingsRaw['telegram_bot_token'] ?? '';
        $chatId = $settingsRaw['telegram_chat_id'] ?? '';

        if (empty($token) || empty($chatId)) {
            echo json_encode(['ok' => false, 'error' => 'Bot Token atau Chat ID Telegram belum disetel di Pengaturan TugasIn.']);
            exit;
        }

        $typeLabel = ($reminderType === '30m') ? '⏰ 30 MENIT SEBELUM KULIAH' : '🔔 1 JAM SEBELUM KULIAH';
        $durLabel = ($reminderType === '30m') ? '30 menit lagi' : '1 jam (60 menit) lagi';
        $startTime = substr($sch['jam_mulai'], 0, 5);
        $endTime = substr($sch['jam_selesai'], 0, 5);
        $dosen = !empty($sch['dosen']) ? $sch['dosen'] : (!empty($sch['course_dosen']) ? $sch['course_dosen'] : '-');
        $ruangan = !empty($sch['ruangan']) ? $sch['ruangan'] : 'Ruang Kelas / Daring';
        $jenis = !empty($sch['jenis']) ? $sch['jenis'] : 'Kuliah';

        $msg = "<b>{$typeLabel} - PENGINGAT JADWAL KULIAH</b>\n\n"
             . "📌 <b>Mata Kuliah:</b> " . htmlspecialchars("{$sch['course_kode']} - {$sch['course_nama']}", ENT_QUOTES, 'UTF-8') . "\n"
             . "🗓️ <b>Hari & Jam:</b> {$sch['hari']}, {$startTime} - {$endTime} WIB\n"
             . "📍 <b>Ruangan:</b> " . htmlspecialchars($ruangan, ENT_QUOTES, 'UTF-8') . "\n"
             . "👨‍🏫 <b>Dosen:</b> " . htmlspecialchars($dosen, ENT_QUOTES, 'UTF-8') . "\n"
             . "🏷️ <b>Jenis:</b> " . htmlspecialchars($jenis, ENT_QUOTES, 'UTF-8') . "\n";

        if (!empty($sch['keterangan'])) {
            $msg .= "📝 <b>Catatan:</b> " . htmlspecialchars($sch['keterangan'], ENT_QUOTES, 'UTF-8') . "\n";
        }

        $msg .= "\n⏳ <i>Perkuliahan akan dimulai dalam {$durLabel} ({$startTime} WIB). Segera siapkan materi & kehadiran Anda!</i>\n\n"
             . "Buka TugasIn: http://localhost/tugasIn/";

        $result = callTelegramApi($token, 'sendMessage', [
            'chat_id' => $chatId,
            'text' => $msg,
            'parse_mode' => 'HTML'
        ]);

        echo json_encode($result);
        exit;
    }

    // ---------------------------------------------------------
    // 8. SETTINGS MUTATIONS
    // ---------------------------------------------------------
    if ($action === 'save_settings') {
        $input = getJsonInput();
        if (!empty($input) && is_array($input)) {
            $stmt = $db->prepare("
                INSERT INTO settings (kunci, nilai)
                VALUES (:kunci, :nilai)
                ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)
            ");

            foreach ($input as $k => $v) {
                if (is_array($v) || is_object($v)) {
                    $valStr = json_encode($v);
                } elseif (is_bool($v)) {
                    $valStr = $v ? '1' : '0';
                } else {
                    $valStr = (string)$v;
                }

                $stmt->execute([
                    ':kunci' => $k,
                    ':nilai' => $valStr
                ]);
            }
            echo json_encode(['ok' => true]);
            exit;
        } else {
            echo json_encode(['ok' => false, 'error' => 'Data pengaturan kosong atau tidak valid.']);
            exit;
        }
    }

    // ---------------------------------------------------------
    // 8.1 TELEGRAM BOT PROXY & CHAT ID DETECTION
    // ---------------------------------------------------------
    if ($action === 'send_telegram') {
        $input = getJsonInput();
        $token = $input['token'] ?? '';
        $chatId = $input['chat_id'] ?? '';
        $text = $input['text'] ?? '';
        $parseMode = $input['parse_mode'] ?? 'HTML';

        if (empty($token) || empty($chatId) || empty($text)) {
            echo json_encode(['ok' => false, 'error' => 'Bot Token, Chat ID, dan teks pesan wajib diisi.']);
            exit;
        }

        $res = callTelegramApi($token, 'sendMessage', [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => $parseMode
        ]);

        echo json_encode($res);
        exit;
    }

    if ($action === 'get_telegram_updates') {
        $input = getJsonInput();
        $token = $input['token'] ?? ($_GET['token'] ?? '');
        if (empty($token)) {
            echo json_encode(['ok' => false, 'error' => 'Bot Token wajib diisi.']);
            exit;
        }

        $res = callTelegramApi($token, 'getUpdates');
        if (!empty($res['ok']) && !empty($res['result']) && is_array($res['result'])) {
            $latest = null;
            // Iterate from newest updates backward
            for ($i = count($res['result']) - 1; $i >= 0; $i--) {
                $u = $res['result'][$i];
                if (!empty($u['message']['chat']['id'])) {
                    $latest = $u['message'];
                    break;
                }
            }

            if ($latest) {
                echo json_encode([
                    'ok' => true,
                    'chat_id' => (string)$latest['chat']['id'],
                    'first_name' => $latest['from']['first_name'] ?? '',
                    'username' => $latest['from']['username'] ?? '',
                    'text' => $latest['text'] ?? '',
                    'date' => $latest['date'] ?? null
                ]);
                exit;
            } else {
                echo json_encode([
                    'ok' => false,
                    'error' => 'Belum ada pesan yang masuk. Buka bot Telegram Anda, klik tombol START (atau kirim /start) lalu coba deteksi kembali!'
                ]);
                exit;
            }
        } else {
            echo json_encode($res);
            exit;
        }
    }

    if ($action === 'check_telegram_bot') {
        $input = getJsonInput();
        $token = $input['token'] ?? ($_GET['token'] ?? '');
        if (empty($token)) {
            echo json_encode(['ok' => false, 'error' => 'Bot Token wajib diisi.']);
            exit;
        }

        $res = callTelegramApi($token, 'getMe');
        echo json_encode($res);
        exit;
    }

    // ---------------------------------------------------------
    // 8.2 TASK ATTACHMENTS (Gambar Pendukung)
    // ---------------------------------------------------------
    if ($action === 'upload_attachment') {
        $taskId = $_POST['task_id'] ?? '';
        $caption = trim($_POST['caption'] ?? '');

        if (empty($taskId)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'ID task wajib diisi.']);
            exit;
        }

        // Verify task exists
        $checkTask = $db->prepare("SELECT id FROM tasks WHERE id = :id");
        $checkTask->execute([':id' => $taskId]);
        if (!$checkTask->fetch()) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Task tidak ditemukan.']);
            exit;
        }

        // Verify current attachment count (max 10)
        $countStmt = $db->prepare("SELECT COUNT(*) FROM task_attachments WHERE task_id = :task_id");
        $countStmt->execute([':task_id' => $taskId]);
        $currentCount = (int)$countStmt->fetchColumn();

        if ($currentCount >= 10) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Maksimal 10 gambar per task telah tercapai.']);
            exit;
        }

        // Handle uploaded file (support either $_FILES['file'] or multiple $_FILES['files'])
        $uploadedFiles = [];
        if (isset($_FILES['file']) && is_array($_FILES['file']['name'])) {
            $f = $_FILES['file'];
            for ($i = 0; $i < count($f['name']); $i++) {
                if ($f['error'][$i] === UPLOAD_ERR_OK) {
                    $uploadedFiles[] = [
                        'name' => $f['name'][$i],
                        'type' => $f['type'][$i],
                        'tmp_name' => $f['tmp_name'][$i],
                        'error' => $f['error'][$i],
                        'size' => $f['size'][$i]
                    ];
                }
            }
        } elseif (isset($_FILES['file']) && !empty($_FILES['file']['tmp_name'])) {
            $uploadedFiles[] = $_FILES['file'];
        } elseif (isset($_FILES['files']) && is_array($_FILES['files']['name'])) {
            $f = $_FILES['files'];
            for ($i = 0; $i < count($f['name']); $i++) {
                if ($f['error'][$i] === UPLOAD_ERR_OK) {
                    $uploadedFiles[] = [
                        'name' => $f['name'][$i],
                        'type' => $f['type'][$i],
                        'tmp_name' => $f['tmp_name'][$i],
                        'error' => $f['error'][$i],
                        'size' => $f['size'][$i]
                    ];
                }
            }
        }

        if (empty($uploadedFiles)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Tidak ada file gambar yang diunggah atau file mengalami error saat dikirim.']);
            exit;
        }

        if ($currentCount + count($uploadedFiles) > 10) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Maksimal 10 gambar per task telah tercapai (saat ini sudah ada ' . $currentCount . ' gambar).']);
            exit;
        }

        $baseUploadDir = __DIR__ . '/uploads/attachments/';
        $thumbDir = $baseUploadDir . 'thumbnails/';
        if (!is_dir($baseUploadDir)) @mkdir($baseUploadDir, 0777, true);
        if (!is_dir($thumbDir)) @mkdir($thumbDir, 0777, true);

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $createdAttachments = [];

        $db->beginTransaction();

        try {
            foreach ($uploadedFiles as $idx => $file) {
                // Check size (5 MB max)
                if ($file['size'] > 5 * 1024 * 1024) {
                    throw new Exception('Ukuran gambar "' . htmlspecialchars($file['name']) . '" melebihi batas maksimal 5 MB.');
                }

                // Check actual MIME
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mime = finfo_file($finfo, $file['tmp_name']);
                finfo_close($finfo);

                if (!in_array($mime, $allowedMimes)) {
                    throw new Exception('Format file "' . htmlspecialchars($file['name']) . '" tidak didukung. Harap unggah gambar JPG, PNG, WebP, atau GIF.');
                }

                // Generate secure random ID and filename
                $attId = 'att_' . bin2hex(random_bytes(10));
                $extMap = [
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'image/webp' => 'webp',
                    'image/gif' => 'gif'
                ];
                $ext = $extMap[$mime] ?? 'jpg';
                $destFilename = $attId . '.' . $ext;
                $destPath = $baseUploadDir . $destFilename;
                $thumbFilename = $attId . '_thumb.webp';
                $thumbPath = $thumbDir . $thumbFilename;

                // Load image into GD to strip EXIF and get dimensions
                $srcImg = null;
                switch ($mime) {
                    case 'image/jpeg':
                        $srcImg = @imagecreatefromjpeg($file['tmp_name']);
                        break;
                    case 'image/png':
                        $srcImg = @imagecreatefrompng($file['tmp_name']);
                        break;
                    case 'image/webp':
                        $srcImg = @imagecreatefromwebp($file['tmp_name']);
                        break;
                    case 'image/gif':
                        $srcImg = @imagecreatefromgif($file['tmp_name']);
                        break;
                }

                if (!$srcImg) {
                    // Fallback to move_uploaded_file if GD load failed
                    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
                        throw new Exception('Gagal menyimpan file gambar ke server.');
                    }
                    $imgSize = @getimagesize($destPath);
                    $width = $imgSize ? $imgSize[0] : null;
                    $height = $imgSize ? $imgSize[1] : null;
                } else {
                    $width = imagesx($srcImg);
                    $height = imagesy($srcImg);

                    // Re-encode cleaned without EXIF metadata
                    if ($mime === 'image/jpeg') {
                        imagejpeg($srcImg, $destPath, 92);
                    } elseif ($mime === 'image/png') {
                        imagealphablending($srcImg, false);
                        imagesavealpha($srcImg, true);
                        imagepng($srcImg, $destPath, 8);
                    } elseif ($mime === 'image/webp') {
                        imagewebp($srcImg, $destPath, 90);
                    } else {
                        imagegif($srcImg, $destPath);
                    }

                    // Generate Thumbnail (max dimension 320px)
                    $thumbW = min(320, $width);
                    $thumbH = round(($height / max(1, $width)) * $thumbW);
                    $thumbImg = imagecreatetruecolor($thumbW, $thumbH);
                    imagealphablending($thumbImg, false);
                    imagesavealpha($thumbImg, true);
                    $transparent = imagecolorallocatealpha($thumbImg, 255, 255, 255, 127);
                    imagefilledrectangle($thumbImg, 0, 0, $thumbW, $thumbH, $transparent);

                    imagecopyresampled($thumbImg, $srcImg, 0, 0, 0, 0, $thumbW, $thumbH, $width, $height);
                    imagewebp($thumbImg, $thumbPath, 85);

                    imagedestroy($thumbImg);
                    imagedestroy($srcImg);
                }

                $urutan = $currentCount + $idx;
                $originalName = htmlspecialchars(basename($file['name']), ENT_QUOTES, 'UTF-8');
                $actualSize = file_exists($destPath) ? filesize($destPath) : $file['size'];

                $insStmt = $db->prepare("
                    INSERT INTO task_attachments (id, task_id, storage_path, file_name, mime_type, size_bytes, width, height, caption, urutan)
                    VALUES (:id, :task_id, :storage_path, :file_name, :mime_type, :size_bytes, :width, :height, :caption, :urutan)
                ");
                $insStmt->execute([
                    ':id' => $attId,
                    ':task_id' => $taskId,
                    ':storage_path' => $destFilename,
                    ':file_name' => $originalName,
                    ':mime_type' => $mime,
                    ':size_bytes' => $actualSize,
                    ':width' => $width,
                    ':height' => $height,
                    ':caption' => $caption ?: null,
                    ':urutan' => $urutan
                ]);

                $createdAttachments[] = [
                    'id' => $attId,
                    'task_id' => $taskId,
                    'file_name' => $originalName,
                    'storage_path' => $destFilename,
                    'url' => 'api.php?action=view_attachment&id=' . urlencode($attId),
                    'thumb_url' => 'api.php?action=view_attachment&id=' . urlencode($attId) . '&thumb=1',
                    'mime_type' => $mime,
                    'size_bytes' => (int)$actualSize,
                    'width' => $width,
                    'height' => $height,
                    'caption' => $caption ?: '',
                    'urutan' => $urutan,
                    'created_at' => date('Y-m-d H:i:s')
                ];
            }

            $db->commit();
            echo json_encode([
                'ok' => true,
                'count' => count($createdAttachments),
                'attachments' => $createdAttachments
            ]);
            exit;

        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }

    if ($action === 'delete_attachment') {
        $input = getJsonInput();
        $id = $input['id'] ?? ($_GET['id'] ?? '');

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'ID attachment wajib diisi.']);
            exit;
        }

        $stmt = $db->prepare("SELECT id, task_id, storage_path FROM task_attachments WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $att = $stmt->fetch();

        if ($att) {
            deletePhysicalAttachmentFiles($att['storage_path'], $att['id']);
            $delStmt = $db->prepare("DELETE FROM task_attachments WHERE id = :id");
            $delStmt->execute([':id' => $id]);
        }

        echo json_encode(['ok' => true, 'id' => $id, 'task_id' => $att['task_id'] ?? null]);
        exit;
    }

    if ($action === 'update_attachment_caption') {
        $input = getJsonInput();
        $id = $input['id'] ?? '';
        $caption = trim($input['caption'] ?? '');

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'ID attachment wajib diisi.']);
            exit;
        }

        $stmt = $db->prepare("UPDATE task_attachments SET caption = :caption WHERE id = :id");
        $stmt->execute([':id' => $id, ':caption' => $caption ?: null]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'reorder_attachments') {
        $input = getJsonInput();
        $attachmentIds = $input['attachment_ids'] ?? [];

        if (is_array($attachmentIds)) {
            $stmt = $db->prepare("UPDATE task_attachments SET urutan = :urutan WHERE id = :id");
            foreach ($attachmentIds as $idx => $attId) {
                $stmt->execute([':urutan' => $idx, ':id' => $attId]);
            }
        }

        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'view_attachment') {
        $id = $_GET['id'] ?? '';
        $isThumb = !empty($_GET['thumb']);
        $isDownload = !empty($_GET['download']);

        if (empty($id)) {
            http_response_code(400);
            exit('ID attachment tidak valid.');
        }

        $stmt = $db->prepare("SELECT id, storage_path, file_name, mime_type FROM task_attachments WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $att = $stmt->fetch();

        if (!$att) {
            http_response_code(404);
            exit('Lampiran tidak ditemukan.');
        }

        $baseDir = __DIR__ . '/uploads/attachments/';
        $filePath = $baseDir . $att['storage_path'];
        $contentType = $att['mime_type'];

        if ($isThumb) {
            $thumbPath = $baseDir . 'thumbnails/' . $att['id'] . '_thumb.webp';
            if (file_exists($thumbPath)) {
                $filePath = $thumbPath;
                $contentType = 'image/webp';
            }
        }

        if (!file_exists($filePath)) {
            http_response_code(404);
            exit('File fisik tidak ditemukan pada server.');
        }

        header('Content-Type: ' . $contentType);
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: public, max-age=604800, immutable');

        if ($isDownload) {
            header('Content-Disposition: attachment; filename="' . addslashes($att['file_name']) . '"');
        } else {
            header('Content-Disposition: inline; filename="' . addslashes($att['file_name']) . '"');
        }

        readfile($filePath);
        exit;
    }

    // ---------------------------------------------------------
    // 9. BATCH SYNC ALL (Migrasi / Impor dari JSON ke MySQL)
    // ---------------------------------------------------------
    if ($action === 'sync_all' || $action === 'migrate_from_json') {
        $payload = getJsonInput();
        if (empty($payload) || !is_array($payload)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Format payload tidak valid.']);
            exit;
        }

        $db->beginTransaction();

        // 1. Semesters
        if (!empty($payload['semesters'])) {
            $semStmt = $db->prepare("
                INSERT INTO semesters (id, nama, tanggal_mulai, tanggal_selesai, warna, ikon, diarsipkan)
                VALUES (:id, :nama, :tanggal_mulai, :tanggal_selesai, :warna, :ikon, :diarsipkan)
                ON DUPLICATE KEY UPDATE
                    nama = VALUES(nama),
                    tanggal_mulai = VALUES(tanggal_mulai),
                    tanggal_selesai = VALUES(tanggal_selesai),
                    warna = VALUES(warna),
                    ikon = VALUES(ikon),
                    diarsipkan = VALUES(diarsipkan)
            ");
            foreach ($payload['semesters'] as $sem) {
                $semStmt->execute([
                    ':id' => $sem['id'],
                    ':nama' => $sem['nama'],
                    ':tanggal_mulai' => !empty($sem['tanggal_mulai']) ? $sem['tanggal_mulai'] : null,
                    ':tanggal_selesai' => !empty($sem['tanggal_selesai']) ? $sem['tanggal_selesai'] : null,
                    ':warna' => $sem['warna'] ?? '#2C5EF5',
                    ':ikon' => $sem['ikon'] ?? 'book-open',
                    ':diarsipkan' => !empty($sem['diarsipkan']) ? 1 : 0
                ]);
            }
        }

        // 2. Courses
        if (!empty($payload['courses'])) {
            $crsStmt = $db->prepare("
                INSERT INTO courses (id, semester_id, nama, kode, dosen, sks, warna, ikon, urutan)
                VALUES (:id, :semester_id, :nama, :kode, :dosen, :sks, :warna, :ikon, :urutan)
                ON DUPLICATE KEY UPDATE
                    semester_id = VALUES(semester_id),
                    nama = VALUES(nama),
                    kode = VALUES(kode),
                    dosen = VALUES(dosen),
                    sks = VALUES(sks),
                    warna = VALUES(warna),
                    ikon = VALUES(ikon),
                    urutan = VALUES(urutan)
            ");
            foreach ($payload['courses'] as $crs) {
                $crsStmt->execute([
                    ':id' => $crs['id'],
                    ':semester_id' => $crs['semester_id'],
                    ':nama' => $crs['nama'],
                    ':kode' => $crs['kode'] ?? '',
                    ':dosen' => $crs['dosen'] ?? '',
                    ':sks' => (int)($crs['sks'] ?? 3),
                    ':warna' => $crs['warna'] ?? '#2C5EF5',
                    ':ikon' => $crs['ikon'] ?? 'book',
                    ':urutan' => (int)($crs['urutan'] ?? 1)
                ]);
            }
        }

        // 3. Statuses
        if (!empty($payload['statuses'])) {
            $stStmt = $db->prepare("
                INSERT INTO statuses (id, course_id, project_id, nama, urutan, apakah_selesai)
                VALUES (:id, :course_id, :project_id, :nama, :urutan, :apakah_selesai)
                ON DUPLICATE KEY UPDATE
                    course_id = VALUES(course_id),
                    project_id = VALUES(project_id),
                    nama = VALUES(nama),
                    urutan = VALUES(urutan),
                    apakah_selesai = VALUES(apakah_selesai)
            ");
            foreach ($payload['statuses'] as $st) {
                $cId = !empty($st['course_id']) ? $st['course_id'] : null;
                $pId = !empty($st['project_id']) ? $st['project_id'] : null;
                if ($cId === null && $pId === null) continue;
                $stStmt->execute([
                    ':id' => $st['id'],
                    ':course_id' => $cId,
                    ':project_id' => $pId,
                    ':nama' => $st['nama'],
                    ':urutan' => (int)($st['urutan'] ?? 0),
                    ':apakah_selesai' => !empty($st['apakah_selesai']) ? 1 : 0
                ]);
            }
        }

        // 4. Projects
        if (!empty($payload['projects'])) {
            $prjStmt = $db->prepare("
                INSERT INTO projects (id, user_id, nama, deskripsi, deadline, status)
                VALUES (:id, :user_id, :nama, :deskripsi, :deadline, :status)
                ON DUPLICATE KEY UPDATE
                    nama = VALUES(nama),
                    deskripsi = VALUES(deskripsi),
                    deadline = VALUES(deadline),
                    status = VALUES(status)
            ");
            foreach ($payload['projects'] as $prj) {
                $prjDeadline = !empty($prj['deadline']) ? date('Y-m-d H:i:s', strtotime($prj['deadline'])) : null;
                $prjStmt->execute([
                    ':id' => $prj['id'],
                    ':user_id' => $prj['user_id'] ?? 'usr_me',
                    ':nama' => $prj['nama'],
                    ':deskripsi' => $prj['deskripsi'] ?? '',
                    ':deadline' => $prjDeadline,
                    ':status' => $prj['status'] ?? 'Perencanaan'
                ]);
            }
        }

        // 5. Tasks & Subtasks
        if (!empty($payload['tasks'])) {
            $tskStmt = $db->prepare("
                INSERT INTO tasks (id, course_id, project_id, status_id, judul, deskripsi, prioritas, deadline, urutan, tags, custom_url, dihapus_pada)
                VALUES (:id, :course_id, :project_id, :status_id, :judul, :deskripsi, :prioritas, :deadline, :urutan, :tags, :custom_url, :dihapus_pada)
                ON DUPLICATE KEY UPDATE
                    course_id = VALUES(course_id),
                    project_id = VALUES(project_id),
                    status_id = VALUES(status_id),
                    judul = VALUES(judul),
                    deskripsi = VALUES(deskripsi),
                    prioritas = VALUES(prioritas),
                    deadline = VALUES(deadline),
                    urutan = VALUES(urutan),
                    tags = VALUES(tags),
                    custom_url = VALUES(custom_url),
                    dihapus_pada = VALUES(dihapus_pada)
            ");

            $subStmt = $db->prepare("
                INSERT INTO subtasks (id, task_id, judul, selesai, urutan)
                VALUES (:id, :task_id, :judul, :selesai, :urutan)
                ON DUPLICATE KEY UPDATE
                    judul = VALUES(judul),
                    selesai = VALUES(selesai),
                    urutan = VALUES(urutan)
            ");

            foreach ($payload['tasks'] as $t) {
                $deadline = !empty($t['deadline']) ? date('Y-m-d H:i:s', strtotime($t['deadline'])) : null;
                $dihapus = !empty($t['dihapus_pada']) ? date('Y-m-d H:i:s', strtotime($t['dihapus_pada'])) : null;
                $tags = isset($t['tags']) ? json_encode(array_values($t['tags'])) : '[]';
                $customUrl = isset($t['custom_values']['url']) ? $t['custom_values']['url'] : null;

                $tskStmt->execute([
                    ':id' => $t['id'],
                    ':course_id' => !empty($t['course_id']) ? $t['course_id'] : null,
                    ':project_id' => !empty($t['project_id']) ? $t['project_id'] : null,
                    ':status_id' => !empty($t['status_id']) ? $t['status_id'] : 'st_todo',
                    ':judul' => $t['judul'] ?? 'Task',
                    ':deskripsi' => $t['deskripsi'] ?? '',
                    ':prioritas' => $t['prioritas'] ?? 'Sedang',
                    ':deadline' => $deadline,
                    ':urutan' => (int)($t['urutan'] ?? 0),
                    ':tags' => $tags,
                    ':custom_url' => $customUrl,
                    ':dihapus_pada' => $dihapus
                ]);

                if (!empty($t['subtasks']) && is_array($t['subtasks'])) {
                    foreach ($t['subtasks'] as $idx => $sb) {
                        $sbId = !empty($sb['id']) ? $sb['id'] : ('sub_' . $t['id'] . '_' . $idx);
                        $subStmt->execute([
                            ':id' => $sbId,
                            ':task_id' => $t['id'],
                            ':judul' => $sb['judul'] ?? '',
                            ':selesai' => !empty($sb['selesai']) ? 1 : 0,
                            ':urutan' => $idx
                        ]);
                    }
                }
            }
        }

        // 6. Settings
        if (!empty($payload['settings']) && is_array($payload['settings'])) {
            $setStmt = $db->prepare("
                INSERT INTO settings (kunci, nilai)
                VALUES (:kunci, :nilai)
                ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)
            ");
            foreach ($payload['settings'] as $k => $v) {
                $valStr = (is_array($v) || is_object($v)) ? json_encode($v) : (is_bool($v) ? ($v ? '1' : '0') : (string)$v);
                $setStmt->execute([':kunci' => $k, ':nilai' => $valStr]);
            }
        }

        $db->commit();
        echo json_encode(['ok' => true, 'message' => 'Migrasi seluruh data ke MySQL berhasil.']);
        exit;
    }

    // ---------------------------------------------------------
    // 10. RESET DATABASE (Ke Null Data / Kosongkan Semua)
    // ---------------------------------------------------------
    if ($action === 'clear_all_data') {
        // Hapus berkas fisik lampiran dari disk
        $attStmt = $db->query("SELECT id, storage_path FROM task_attachments");
        $atts = $attStmt->fetchAll();
        foreach ($atts as $a) {
            deletePhysicalAttachmentFiles($a['storage_path'], $a['id']);
        }

        $db->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $db->exec("DELETE FROM `task_attachments`;");
        $db->exec("DELETE FROM `subtasks`;");
        $db->exec("DELETE FROM `tasks`;");
        $db->exec("DELETE FROM `projects`;");
        $db->exec("DELETE FROM `courses`;");
        $db->exec("DELETE FROM `semesters`;");
        $db->exec("DELETE FROM `schedules`;");
        $db->exec("DELETE FROM `schedule_reminder_logs`;");
        
        // Statuses akan dibuat otomatis saat mata kuliah atau proyek baru dibuat
        $db->exec("DELETE FROM `statuses`;");

        // Reset settings ke nilai default bawaan
        $db->exec("DELETE FROM `settings`;");
        $db->exec("
            INSERT INTO `settings` (`kunci`, `nilai`) VALUES
            ('theme', 'light'),
            ('telegram_bot_token', ''),
            ('telegram_chat_id', ''),
            ('telegram_enabled', '0'),
            ('default_reminder_hours', '[72, 24, 2]'),
            ('snooze_minutes', '15'),
            ('timezone', 'Asia/Jakarta');
        ");
        $db->exec("SET FOREIGN_KEY_CHECKS = 1;");

        echo json_encode(['ok' => true, 'message' => 'Seluruh data tugas, matakuliah, semester, dan proyek berhasil dikosongkan (null data).']);
        exit;
    }

    // ---------------------------------------------------------
    // 10.1 RESET DATABASE KE SEED DEMO (database.sql)
    // ---------------------------------------------------------
    if ($action === 'reset_database') {
        $sqlFile = __DIR__ . '/database.sql';
        if (file_exists($sqlFile)) {
            // Hapus berkas fisik lampiran lama
            $attStmt = $db->query("SELECT id, storage_path FROM task_attachments");
            $atts = $attStmt->fetchAll();
            foreach ($atts as $a) {
                deletePhysicalAttachmentFiles($a['storage_path'], $a['id']);
            }

            $db->exec("SET FOREIGN_KEY_CHECKS = 0;");
            $db->exec("DELETE FROM `task_attachments`;");
            $db->exec("DELETE FROM `subtasks`;");
            $db->exec("DELETE FROM `tasks`;");
            $db->exec("DELETE FROM `projects`;");
            $db->exec("DELETE FROM `courses`;");
            $db->exec("DELETE FROM `semesters`;");
            $db->exec("DELETE FROM `statuses`;");
            $db->exec("DELETE FROM `settings`;");
            $db->exec("DELETE FROM `schedules`;");
            $db->exec("DELETE FROM `schedule_reminder_logs`;");
            $db->exec("SET FOREIGN_KEY_CHECKS = 1;");

            $sql = file_get_contents($sqlFile);
            $db->exec($sql);
            echo json_encode(['ok' => true, 'message' => 'Database MySQL berhasil diatur ulang ke data demo bawaan.']);
            exit;
        } else {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Berkas database.sql tidak ditemukan.']);
            exit;
        }
    }

    // ---------------------------------------------------------
    // 10.2 BACKUP DATABASE KE BERKAS SQL (.sql)
    // ---------------------------------------------------------
    if ($action === 'backup_sql') {
        ensureScheduleTablesExist($db);

        $tables = [
            'semesters',
            'courses',
            'statuses',
            'projects',
            'tasks',
            'subtasks',
            'task_attachments',
            'schedules',
            'schedule_reminder_logs',
            'settings'
        ];

        $out = "-- ========================================================\n";
        $out .= "-- TugasIn Database Backup (MySQL / MariaDB Dump)\n";
        $out .= "-- Versi Generator: TugasIn Pure PHP PDO Engine\n";
        $out .= "-- Waktu Pembuatan: " . date('Y-m-d H:i:s') . "\n";
        $out .= "-- Nama Database  : " . DB_NAME . "\n";
        $out .= "-- ========================================================\n\n";
        $out .= "SET NAMES utf8mb4;\n";
        $out .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";

        foreach ($tables as $table) {
            $chk = $db->query("SHOW TABLES LIKE " . $db->quote($table))->fetch();
            if (!$chk) continue;

            $out .= "-- --------------------------------------------------------\n";
            $out .= "-- Struktur & Data Tabel `{$table}`\n";
            $out .= "-- --------------------------------------------------------\n";
            $out .= "DROP TABLE IF EXISTS `{$table}`;\n";

            $createRow = $db->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_NUM);
            if ($createRow && isset($createRow[1])) {
                $out .= $createRow[1] . ";\n\n";
            }

            $rows = $db->query("SELECT * FROM `{$table}`")->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($rows)) {
                $cols = array_keys($rows[0]);
                $colList = implode('`, `', $cols);

                $chunkSize = 50;
                $chunks = array_chunk($rows, $chunkSize);
                foreach ($chunks as $chunk) {
                    $valueRows = [];
                    foreach ($chunk as $row) {
                        $vals = [];
                        foreach ($cols as $col) {
                            $val = $row[$col];
                            if ($val === null) {
                                $vals[] = "NULL";
                            } else {
                                $vals[] = $db->quote((string)$val);
                            }
                        }
                        $valueRows[] = "(" . implode(', ', $vals) . ")";
                    }
                    $out .= "INSERT INTO `{$table}` (`{$colList}`) VALUES\n" . implode(",\n", $valueRows) . ";\n\n";
                }
            } else {
                $out .= "-- Tabel `{$table}` kosong.\n\n";
            }
        }

        $out .= "SET FOREIGN_KEY_CHECKS = 1;\n";
        $out .= "-- Selesai menghasilkan berkas backup TugasIn.\n";

        while (ob_get_level()) {
            @ob_end_clean();
        }

        $filename = 'tugasin_backup_' . date('Y-m-d_His') . '.sql';
        header('Content-Type: application/sql; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . strlen($out));
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        echo $out;
        exit;
    }

    // ---------------------------------------------------------
    // 10.3 RESTORE DATABASE DARI BERKAS SQL (.sql)
    // ---------------------------------------------------------
    if ($action === 'restore_sql') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'Metode HTTP tidak diizinkan. Gunakan POST.']);
            exit;
        }

        if (!isset($_FILES['sql_file']) || $_FILES['sql_file']['error'] !== UPLOAD_ERR_OK) {
            $errMap = [
                UPLOAD_ERR_INI_SIZE => 'Ukuran berkas melebihi batas upload_max_filesize di php.ini.',
                UPLOAD_ERR_FORM_SIZE => 'Ukuran berkas melebihi batas MAX_FILE_SIZE formulir.',
                UPLOAD_ERR_PARTIAL => 'Berkas hanya terunggah sebagian.',
                UPLOAD_ERR_NO_FILE => 'Tidak ada berkas yang dipilih untuk diunggah.',
                UPLOAD_ERR_NO_TMP_DIR => 'Folder temporary server tidak ditemukan.',
                UPLOAD_ERR_CANT_WRITE => 'Gagal menulis berkas ke penyimpanan server.',
                UPLOAD_ERR_EXTENSION => 'Upload dihentikan oleh ekstensi PHP.'
            ];
            $errCode = $_FILES['sql_file']['error'] ?? UPLOAD_ERR_NO_FILE;
            $msg = $errMap[$errCode] ?? 'Gagal mengunggah berkas SQL.';
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $msg]);
            exit;
        }

        $uploadedFile = $_FILES['sql_file']['tmp_name'];
        $fileName = $_FILES['sql_file']['name'];
        $fileSize = $_FILES['sql_file']['size'];

        // Validasi ekstensi
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        if ($ext !== 'sql') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Format berkas tidak valid. Hanya berkas .sql yang diizinkan.']);
            exit;
        }

        $sqlContent = file_get_contents($uploadedFile);
        if ($sqlContent === false || strlen(trim($sqlContent)) < 10) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Berkas SQL kosong atau tidak dapat dibaca.']);
            exit;
        }

        try {
            $db->exec("SET FOREIGN_KEY_CHECKS = 0;");
            $db->exec($sqlContent);
            $db->exec("SET FOREIGN_KEY_CHECKS = 1;");

            ensureScheduleTablesExist($db);

            $formattedSize = number_format($fileSize / 1024, 1) . ' KB';
            echo json_encode([
                'ok' => true,
                'message' => "Database TugasIn berhasil dipulihkan dari berkas '{$fileName}' ({$formattedSize})."
            ]);
            exit;
        } catch (PDOException $e) {
            $db->exec("SET FOREIGN_KEY_CHECKS = 1;");
            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'error' => 'Gagal mengeksekusi script SQL: ' . $e->getMessage()
            ]);
            exit;
        }
    }

    // ---------------------------------------------------------
    // 11. TELEGRAM PROXY (Preserved for reminders)
    // ---------------------------------------------------------
    if ($action === 'send_telegram') {
        $input = getJsonInput();
        $token = $input['token'] ?? '';
        $chatId = $input['chat_id'] ?? '';
        $text = $input['text'] ?? '';

        if (empty($token) || empty($chatId) || empty($text)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Parameter token, chat_id, dan text wajib diisi.']);
            exit;
        }

        $url = "https://api.telegram.org/bot{$token}/sendMessage";
        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML'
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => $curlError]);
            exit;
        }

        http_response_code($httpCode);
        echo $response;
        exit;
    }

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    if (ob_get_length()) {
        @ob_clean();
    }
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
    }
    echo json_encode([
        'ok' => false,
        'error' => 'Server database error: ' . $e->getMessage()
    ]);
    exit;
}

if (ob_get_length()) {
    @ob_clean();
}
if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}
echo json_encode(['ok' => false, 'error' => 'Aksi endpoint tidak ditemukan.']);
