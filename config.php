<?php
/**
 * TugasIn - MySQL Database Configuration & Connection
 * Environment: XAMPP MySQL (127.0.0.1:3306)
 */

define('DB_HOST', '127.0.0.1');
define('DB_PORT', 3306);
define('DB_NAME', 'tugasin_db');
define('DB_USER', 'root');
define('DB_PASS', '');

function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // If database doesn't exist yet, attempt auto-creation
        if ($e->getCode() == 1049) {
            try {
                $rootDsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
                $rootPdo = new PDO($rootDsn, DB_USER, DB_PASS);
                $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                
                $sqlFile = __DIR__ . '/database.sql';
                if (file_exists($sqlFile)) {
                    $rootPdo->exec("USE `" . DB_NAME . "`;");
                    $rootPdo->exec(file_get_contents($sqlFile));
                }

                $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                return $pdo;
            } catch (Exception $inner) {
                http_response_code(500);
                echo json_encode(['ok' => false, 'error' => 'Database connection failed: ' . $inner->getMessage()]);
                exit;
            }
        }

        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Koneksi database MySQL gagal: ' . $e->getMessage()]);
        exit;
    }
}
