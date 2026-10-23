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

    echo json_encode([
        'ok' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'total_checked' => count($tasks),
        'alerts_sent' => $alertsSent,
        'details' => $details
    ]);

} catch (Exception $e) {
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage()
    ]);
}
