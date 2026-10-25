<?php
/**
 * TugasIn - Server-Side Background Deadline Reminder
 * Can be run via Windows Task Scheduler, Cron, or HTTP request.
 * Automatically checks MySQL database for approaching or overdue deadlines
 * and sends instant notifications to Telegram without needing a browser open.
 *
 * Usage via CLI:
 *   php cron_reminders.php
 *
 * Usage via Browser / HTTP:
 *   http://localhost/tugasIn/cron_reminders.php
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

try {
    $db = getDbConnection();

    // 1. Fetch Telegram Settings
    $settingsStmt = $db->query("SELECT kunci, nilai FROM settings WHERE kunci IN ('telegram_bot_token', 'telegram_chat_id', 'telegram_enabled')");
    $settingsRaw = $settingsStmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $token = $settingsRaw['telegram_bot_token'] ?? '';
    $chatId = $settingsRaw['telegram_chat_id'] ?? '';
    $enabled = ($settingsRaw['telegram_enabled'] ?? '') === '1';

    if (!$enabled || empty($token) || empty($chatId)) {
        echo json_encode([
            'ok' => false,
            'message' => 'Integrasi Telegram dinonaktifkan atau belum dikonfigurasi lengkap (token / chat_id kosong).'
        ]);
        exit;
    }

    // 2. Fetch Active, Incomplete Tasks with Deadlines
    $stmt = $db->query("
        SELECT 
            t.id, t.judul, t.deadline, t.prioritas,
            c.nama AS course_nama, c.kode AS course_kode,
            s.apakah_selesai
        FROM tasks t
        LEFT JOIN courses c ON t.course_id = c.id
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.dihapus_pada IS NULL
          AND t.deadline IS NOT NULL
          AND (s.apakah_selesai = 0 OR s.apakah_selesai IS NULL)
        ORDER BY t.deadline ASC
    ");
    $tasks = $stmt->fetchAll();

    $now = time();
    $alertsSent = 0;
    $details = [];

    foreach ($tasks as $task) {
        $deadlineTime = strtotime($task['deadline']);
        if (!$deadlineTime) continue;

        $diffSec = $deadlineTime - $now;
        $diffHours = $diffSec / 3600;
        $diffMins = round($diffSec / 60);

        $shouldAlert = false;
        $alertType = '';
        $subtitle = '';

        // Overdue (passed within last 12 hours)
        if ($diffSec < 0 && abs($diffSec) <= 12 * 3600) {
            $shouldAlert = true;
            $alertType = 'overdue';
            $subtitle = '⚠️ Tugas ini telah melewati batas deadline!';
        }
        // Imminent (under 2 hours remaining)
        elseif ($diffSec > 0 && $diffHours <= 2) {
            $shouldAlert = true;
            $alertType = 'imminent';
            $subtitle = "⏳ Deadline tersisa {$diffMins} menit lagi!";
        }

        if ($shouldAlert) {
            $courseLabel = !empty($task['course_nama']) ? "{$task['course_kode']} - {$task['course_nama']}" : 'Umum';
            $deadlineStr = date('d M Y, H:i', $deadlineTime);

            $msg = "<b>⚠️ PENGINGAT DEADLINE TUGASIN</b>\n\n"
                 . "📌 <b>Tugas:</b> " . htmlspecialchars($task['judul'], ENT_QUOTES, 'UTF-8') . "\n"
                 . "📚 <b>Mata Kuliah:</b> " . htmlspecialchars($courseLabel, ENT_QUOTES, 'UTF-8') . "\n"
                 . "⏳ <b>Deadline:</b> {$deadlineStr}\n"
                 . "🔥 <b>Prioritas:</b> " . htmlspecialchars($task['prioritas'], ENT_QUOTES, 'UTF-8') . "\n"
                 . "ℹ️ <i>{$subtitle}</i>\n\n"
                 . "Buka TugasIn: http://localhost/tugasIn/";

            $url = "https://api.telegram.org/bot{$token}/sendMessage";
            $payload = [
                'chat_id' => $chatId,
                'text' => $msg,
                'parse_mode' => 'HTML'
            ];

            // Send via cURL
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            if (defined('CURL_IPRESOLVE_V4')) {
                curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
            }
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 6);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            $res = curl_exec($ch);
            curl_close($ch);

            $alertsSent++;
            $details[] = [
                'task_id' => $task['id'],
                'judul' => $task['judul'],
                'type' => $alertType
            ];
        }
    }

    // 3. Fetch Active Schedules for Today (Jadwal Kuliah Mingguan)
    $daysMap = [0 => 'Minggu', 1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu'];
    $currentDayName = $daysMap[(int)date('w')];
    $todayDateStr = date('Y-m-d');

    // Ensure table schedule_reminder_logs exists
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS `schedule_reminder_logs` (
              `id` INT AUTO_INCREMENT PRIMARY KEY,
              `schedule_id` VARCHAR(64) NOT NULL,
              `reminder_type` VARCHAR(20) NOT NULL,
              `tanggal` DATE NOT NULL,
              `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY `idx_sched_rem_unique` (`schedule_id`, `reminder_type`, `tanggal`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Exception $e) {}

    $schedStmt = $db->prepare("
        SELECT s.*, c.nama AS course_nama, c.kode AS course_kode, c.dosen AS course_dosen, c.ikon AS course_ikon
        FROM schedules s
        JOIN courses c ON s.course_id = c.id
        WHERE s.hari = :hari AND (s.pengingat_aktif = 1 OR s.pengingat_aktif IS NULL)
        ORDER BY s.jam_mulai ASC
    ");
    $schedStmt->execute([':hari' => $currentDayName]);
    $todaySchedules = $schedStmt->fetchAll();

    $scheduleAlertsSent = 0;
    $scheduleDetails = [];

    foreach ($todaySchedules as $sched) {
        $startTimeStr = $todayDateStr . ' ' . $sched['jam_mulai'];
        $startTime = strtotime($startTimeStr);
        if (!$startTime) continue;

        $diffSec = $startTime - $now;
        $diffMins = round($diffSec / 60);

        // Reminder slots:
        // Slot 1: 1 Jam sebelum jadwal (31 - 60 menit)
        // Slot 2: 30 Menit sebelum jadwal (0 - 30 menit)
        $reminderType = null;
        $reminderTitle = '';
        $subtitle = '';

        if ($diffMins > 30 && $diffMins <= 60) {
            $reminderType = '60m';
            $reminderTitle = '🔔 PENGINGAT JADWAL KULIAH (1 JAM LAGI)';
            $subtitle = "Perkuliahan akan dimulai dalam {$diffMins} menit ({$sched['jam_mulai']}). Segera persiapkan materi dan perlengkapan Anda!";
        } elseif ($diffMins >= 0 && $diffMins <= 30) {
            $reminderType = '30m';
            $reminderTitle = '⏰ PENGINGAT JADWAL KULIAH (30 MENIT LAGI)';
            $subtitle = "Perkuliahan akan dimulai dalam {$diffMins} menit ({$sched['jam_mulai']}). Segera bersiap menuju ruangan atau login kelas!";
        }

        if ($reminderType !== null) {
            // Check if already sent today
            $checkStmt = $db->prepare("SELECT COUNT(*) FROM schedule_reminder_logs WHERE schedule_id = :sid AND reminder_type = :rtype AND tanggal = :tgl");
            $checkStmt->execute([
                ':sid' => $sched['id'],
                ':rtype' => $reminderType,
                ':tgl' => $todayDateStr
            ]);
            $alreadySent = (int)$checkStmt->fetchColumn() > 0;

            if (!$alreadySent) {
                $startTimeFormatted = substr($sched['jam_mulai'], 0, 5);
                $endTimeFormatted = substr($sched['jam_selesai'], 0, 5);
                $dosen = !empty($sched['dosen']) ? $sched['dosen'] : (!empty($sched['course_dosen']) ? $sched['course_dosen'] : '-');
                $ruangan = !empty($sched['ruangan']) ? $sched['ruangan'] : 'Ruang Kelas / Daring';
                $jenis = !empty($sched['jenis']) ? $sched['jenis'] : 'Kuliah';

                $msg = "<b>{$reminderTitle}</b>\n\n"
                     . "📌 <b>Mata Kuliah:</b> " . htmlspecialchars("{$sched['course_kode']} - {$sched['course_nama']}", ENT_QUOTES, 'UTF-8') . "\n"
                     . "🗓️ <b>Waktu:</b> {$sched['hari']}, {$startTimeFormatted} - {$endTimeFormatted} WIB\n"
                     . "📍 <b>Ruangan:</b> " . htmlspecialchars($ruangan, ENT_QUOTES, 'UTF-8') . "\n"
                     . "👨‍🏫 <b>Dosen:</b> " . htmlspecialchars($dosen, ENT_QUOTES, 'UTF-8') . "\n"
                     . "🏷️ <b>Jenis:</b> " . htmlspecialchars($jenis, ENT_QUOTES, 'UTF-8') . "\n";

                if (!empty($sched['keterangan'])) {
                    $msg .= "📝 <b>Catatan:</b> " . htmlspecialchars($sched['keterangan'], ENT_QUOTES, 'UTF-8') . "\n";
                }

                $msg .= "\nℹ️ <i>{$subtitle}</i>\n\n"
                     . "Buka TugasIn: http://localhost/tugasIn/";

                $url = "https://api.telegram.org/bot{$token}/sendMessage";
                $payload = [
                    'chat_id' => $chatId,
                    'text' => $msg,
                    'parse_mode' => 'HTML'
                ];

                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                if (defined('CURL_IPRESOLVE_V4')) {
                    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
                }
                curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 6);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                $res = curl_exec($ch);
                curl_close($ch);

                // Record in log to avoid duplicate spamming
                $logStmt = $db->prepare("INSERT IGNORE INTO schedule_reminder_logs (schedule_id, reminder_type, tanggal) VALUES (:sid, :rtype, :tgl)");
                $logStmt->execute([
                    ':sid' => $sched['id'],
                    ':rtype' => $reminderType,
                    ':tgl' => $todayDateStr
                ]);

                $scheduleAlertsSent++;
                $scheduleDetails[] = [
                    'schedule_id' => $sched['id'],
                    'course' => $sched['course_nama'],
                    'type' => $reminderType,
                    'diff_minutes' => $diffMins
                ];
            }
        }
    }

    echo json_encode([
        'ok' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'total_tasks_checked' => count($tasks),
        'task_alerts_sent' => $alertsSent,
        'task_details' => $details,
        'today_schedules_checked' => count($todaySchedules),
        'schedule_alerts_sent' => $scheduleAlertsSent,
        'schedule_details' => $scheduleDetails
    ]);

} catch (Exception $e) {
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage()
    ]);
}
