<?php
/**
 * TugasIn - Backend Helper API (PHP)
 * Provides Telegram webhook proxy and optional JSON backup synchronization
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? '';

if ($action === 'ping') {
    echo json_encode(['ok' => true, 'timestamp' => time(), 'app' => 'TugasIn API']);
    exit;
}

if ($action === 'send_telegram') {
    $input = json_decode(file_get_contents('php://input'), true);
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

if ($action === 'save_backup') {
    $input = file_get_contents('php://input');
    if (!empty($input)) {
        $backupDir = __DIR__ . '/data';
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0777, true);
        }
        file_put_contents($backupDir . '/backup.json', $input);
        echo json_encode(['ok' => true, 'message' => 'Backup berhasil disimpan.']);
        exit;
    }
}

if ($action === 'load_backup') {
    $file = __DIR__ . '/data/backup.json';
    if (file_exists($file)) {
        echo file_get_contents($file);
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Berkas backup belum tersedia.']);
        exit;
    }
}

http_response_code(404);
echo json_encode(['ok' => false, 'error' => 'Endpoint tidak ditemukan.']);
