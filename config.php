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
@date_default_timezone_set('Asia/Jakarta');

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
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

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
        PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
    ];

    // Daftar host percobaan: jika 127.0.0.1 gagal (misal hosting hanya mengizinkan socket Unix),
    // otomatis mencoba localhost, atau sebaliknya.
    $hostsToTry = [DB_HOST];
    if (DB_HOST === '127.0.0.1') {
        $hostsToTry[] = 'localhost';
    } elseif (DB_HOST === 'localhost') {
        $hostsToTry[] = '127.0.0.1';
    }

    $credentialsToTry = [
        ['user' => DB_USER, 'pass' => DB_PASS],
        ['user' => 'amuchtaif', 'pass' => 'qurmutun']
    ];

    $lastException = null;

    foreach ($hostsToTry as $host) {
        foreach ($credentialsToTry as $cred) {
            $currentUser = $cred['user'];
            $currentPass = $cred['pass'];

            try {
                if ($host === 'localhost') {
                    $dsn = "mysql:host=localhost;dbname=" . DB_NAME . ";charset=utf8mb4";
                } else {
                    $dsn = "mysql:host=" . $host . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                }

                $pdo = new PDO($dsn, $currentUser, $currentPass, $options);
                return $pdo;
            } catch (PDOException $e) {
                $lastException = $e;

                // Jika error adalah database belum ada (error code 1049)
                if ($e->getCode() == 1049) {
                    try {
                        $rootDsn = ($host === 'localhost') 
                            ? "mysql:host=localhost;charset=utf8mb4" 
                            : "mysql:host=" . $host . ";port=" . DB_PORT . ";charset=utf8mb4";
                        $rootPdo = new PDO($rootDsn, $currentUser, $currentPass, $options);
                        $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");

                        $sqlFile = __DIR__ . '/database.sql';
                        if (file_exists($sqlFile)) {
                            $rootPdo->exec("USE `" . DB_NAME . "`;");
                            $rootPdo->exec(file_get_contents($sqlFile));
                        }

                        $pdo = new PDO($dsn, $currentUser, $currentPass, $options);
                        return $pdo;
                    } catch (Exception $inner) {
                        // Coba kredensial berikutnya
                    }
                }

                // Jika akses ditolak (1045), lanjut ke percobaan kredensial berikutnya
                if ($e->getCode() == 1045) {
                    continue;
                }
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
