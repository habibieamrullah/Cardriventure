<?php
declare(strict_types=1);

/**
 * API Level Editor.
 *
 * Semua komunikasi editor <-> server lewat file ini dan berbentuk JSON.
 * Aksi yang tersedia (parameter `action`):
 *   - state    : ambil semua data level, daftar tile, dan konfigurasi.
 *   - save     : simpan seluruh level (body: {"action":"save","levels":[...]}).
 *   - backups  : daftar file backup.
 *   - restore  : pulihkan level dari sebuah backup.
 */

session_start();
require __DIR__ . '/lib/LevelStore.php';

$config = require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 400): void
{
    respond(['ok' => false, 'error' => $message], $code);
}

// --- Pembatasan akses ------------------------------------------------- //
$remote  = $_SERVER['REMOTE_ADDR'] ?? '';
$isLocal = in_array($remote, ['127.0.0.1', '::1', 'localhost'], true);
if (empty($config['allow_remote']) && !$isLocal) {
    fail('Akses ditolak: editor ini hanya dapat dibuka dari localhost.', 403);
}
if ($config['password'] !== '' && ($_SESSION['level_editor_ok'] ?? false) !== true) {
    fail('Silakan login terlebih dahulu.', 401);
}

$store  = new LevelStore($config['level_file'], $config['var_name'], $config['tiles_dir']);
$raw    = file_get_contents('php://input') ?: '';
$input  = json_decode($raw, true);
$input  = is_array($input) ? $input : [];
$action = $_GET['action'] ?? ($_POST['action'] ?? ($input['action'] ?? ''));

switch ($action) {
    case 'state':
        if (!$store->exists()) {
            fail('File level tidak ditemukan di ' . $store->file(), 500);
        }
        $levels = $store->load();
        if ($store->error() !== null && $levels === []) {
            fail($store->error(), 500);
        }
        respond([
            'ok'         => true,
            'file'       => $store->file(),
            'assetsUrl'  => $config['assets_url'],
            'gameUrl'    => $config['game_url'],
            'tiles'      => $store->tiles(),
            'levels'     => $levels,
            'backups'    => count(glob(($config['backup_dir'] ?? '') . '/*.js') ?: []),
        ]);
        break;

    case 'save':
        $levels = $input['levels'] ?? null;
        if (!is_array($levels) || $levels === []) {
            fail('Data level kosong atau tidak valid.');
        }
        $backupPath = null;
        if (!empty($config['backups'])) {
            $backupPath = $store->backup($config['backup_dir']);
        }
        if (!$store->save($levels)) {
            fail($store->error() ?? 'Gagal menyimpan file level.', 500);
        }
        respond([
            'ok'      => true,
            'saved'   => count($levels),
            'backup'  => $backupPath ? basename($backupPath) : null,
        ]);
        break;

    case 'backups':
        $dir = $config['backup_dir'] ?? '';
        $list = [];
        foreach (glob($dir . '/*.js') ?: [] as $f) {
            $list[] = ['name' => basename($f), 'time' => date('Y-m-d H:i:s', filemtime($f)), 'size' => filesize($f)];
        }
        usort($list, static fn($a, $b) => strcmp($b['name'], $a['name']));
        respond(['ok' => true, 'backups' => $list]);
        break;

    case 'restore':
        $name = basename((string) ($input['name'] ?? ''));
        $dir  = $config['backup_dir'] ?? '';
        $src  = $dir . '/' . $name;
        if ($name === '' || !is_file($src)) {
            fail('Backup tidak ditemukan.');
        }
        if (!empty($config['backups'])) {
            $store->backup($config['backup_dir']); // simpan kondisi terbaru dulu
        }
        if (!@copy($src, $store->file())) {
            fail('Gagal memulihkan backup.', 500);
        }
        respond(['ok' => true]);
        break;

    default:
        fail('Aksi tidak dikenal: ' . htmlspecialchars((string) $action), 404);
}
