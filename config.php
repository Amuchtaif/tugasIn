<?php
/**
 * TugasIn - MySQL Database Configuration & Connection
 * Kompatibel untuk lingkungan Lokal (XAMPP/MariaDB) dan Hosting (cPanel/DirectAdmin/VPS/Cloud)
 */

// Cegah error/notice PHP mencemari respon JSON
@ini_set('display_errors', '0');
error_reporting(0);
if (!ob_get_level()) {
    @ob_start();
}

/**
 * ============================================================================
 * PANDUAN PENGATURAN DATABASE UNTUK HOSTING (cPanel / DirectAdmin / VPS)
 * ============================================================================
 * Saat upload ke hosting:
 * 1. DB_HOST: Biasanya gunakan 'localhost' (jika shared hosting) atau '127.0.0.1'.
 * 2. DB_NAME: Di cPanel biasanya ada awalan username, contoh: 'cpaneluser_tugasin'.
 * 3. DB_USER: User database di cPanel, contoh: 'cpaneluser_admin'.
 * 4. DB_PASS: Password user database yang dibuat di cPanel.
 * 5. PENTING: Di cPanel MySQL Databases, pastikan user sudah ditambahkan ke database
 *    dan dicentang "ALL PRIVILEGES".
 * 6. Jangan lupa IMPORT file 'database.sql' melalui phpMyAdmin di hosting.
 * ============================================================================
 */

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', (int)(getenv('DB_PORT') ?: 3306));
define('DB_NAME', getenv('DB_NAME') ?: 'tugasin_db');
define('DB_USER', getenv('DB_USER') ?: 'amuchtaif');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : 'qurmutun');

/**
 * Mengirim respon JSON error yang aman tanpa memicu penggantian halaman oleh web server
 */
function sendJsonErrorResponse($message, $hint = '', $code = 500) {
    if (ob_get_length()) {
        @ob_clean();
    }
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        // Gunakan HTTP 200 agar Apache/LiteSpeed/cPanel tidak mengganti respon dengan halaman HTML 500.shtml
        http_response_code(200);
    }
    echo json_encode([
        'ok' => false,
        'error' => $message,
        'hint' => $hint,
        'code' => $code
    ]);
    exit;
}

/**
 * Mendapatkan koneksi PDO MySQL dengan auto-fallback (127.0.0.1 <-> localhost socket)
 */
function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    if (!extension_loaded('pdo_mysql')) {
        sendJsonErrorResponse(
            'Ekstensi PHP PDO MySQL (pdo_mysql) belum aktif di hosting/server Anda.',
            'Buka cPanel > Select PHP Version > Extensions, lalu centang ekstensi pdo_mysql.'
        );
    }

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    // Daftar host percobaan: jika 127.0.0.1 gagal (misal hosting hanya mengizinkan socket Unix),
    // otomatis mencoba localhost, atau sebaliknya.
    $hostsToTry = [DB_HOST];
    if (DB_HOST === '127.0.0.1') {
        $hostsToTry[] = 'localhost';
    } elseif (DB_HOST === 'localhost') {
        $hostsToTry[] = '127.0.0.1';
    }

    $lastException = null;

    foreach ($hostsToTry as $host) {
        try {
            // Pada shared hosting, host 'localhost' tanpa port menghubungkan langsung lewat Unix domain socket
            if ($host === 'localhost') {
                $dsn = "mysql:host=localhost;dbname=" . DB_NAME . ";charset=utf8mb4";
            } else {
                $dsn = "mysql:host=" . $host . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            }

            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            return $pdo;
        } catch (PDOException $e) {
            $lastException = $e;

            // Jika error adalah database belum ada (error code 1049)
            if ($e->getCode() == 1049) {
                // Coba auto-create database (hanya berhasil di root/localhost; pada shared hosting cPanel ditolak)
                try {
                    $rootDsn = ($host === 'localhost') 
                        ? "mysql:host=localhost;charset=utf8mb4" 
                        : "mysql:host=" . $host . ";port=" . DB_PORT . ";charset=utf8mb4";
                    $rootPdo = new PDO($rootDsn, DB_USER, DB_PASS, $options);
                    $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");

                    $sqlFile = __DIR__ . '/database.sql';
                    if (file_exists($sqlFile)) {
                        $rootPdo->exec("USE `" . DB_NAME . "`;");
                        $rootPdo->exec(file_get_contents($sqlFile));
                    }

                    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                    return $pdo;
                } catch (Exception $inner) {
                    sendJsonErrorResponse(
                        "Database '" . DB_NAME . "' tidak ditemukan di server MySQL.",
                        "Buat database bernama '" . DB_NAME . "' melalui cPanel hosting Anda, lalu import tabel dari file database.sql melalui phpMyAdmin."
                    );
                }
            }

            // Jika error adalah akses ditolak / kredensial salah (error code 1045)
            if ($e->getCode() == 1045) {
                sendJsonErrorResponse(
                    "Autentikasi MySQL ditolak untuk user '" . DB_USER . "': " . $e->getMessage(),
                    "Kredensial di file config.php belum sesuai dengan hosting. Pastikan DB_USER, DB_PASS, dan DB_NAME di config.php sudah sesuai dengan user database yang dibuat di cPanel hosting dan sudah diberi izin (All Privileges)."
                );
            }
        }
    }

    // Jika seluruh host gagal dihubungi
    $errMsg = $lastException ? $lastException->getMessage() : 'Gagal menghubungi server database.';
    sendJsonErrorResponse(
        "Koneksi database MySQL gagal: " . $errMsg,
        "Periksa pengaturan DB_HOST, DB_NAME, DB_USER, dan DB_PASS di file config.php pada hosting Anda. Untuk cPanel hosting, biasanya gunakan DB_HOST = 'localhost'."
    );
}
