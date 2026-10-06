<?php
declare(strict_types=1);

/**
 * Level Editor "Drift Maze" — halaman utama.
 *
 * Editor ini membaca & menulis file data level game (assets/js/leveltiles.js)
 * sehingga level dapat dikelola secara visual tanpa menyentuh kode.
 */

session_start();
require __DIR__ . '/lib/LevelStore.php';

$config = require __DIR__ . '/config.php';
$store  = new LevelStore($config['level_file'], $config['var_name'], $config['tiles_dir']);

$needLogin  = $config['password'] !== '';
$isLoggedIn = ($_SESSION['level_editor_ok'] ?? false) === true;
$loginError = '';

if (isset($_POST['action']) && $_POST['action'] === 'login') {
    if (hash_equals((string) $config['password'], (string) ($_POST['password'] ?? ''))) {
        $_SESSION['level_editor_ok'] = true;
        $isLoggedIn = true;
    } else {
        $loginError = 'Password salah.';
    }
}
if (isset($_GET['logout'])) {
    unset($_SESSION['level_editor_ok']);
    $isLoggedIn = false;
}

if ($needLogin && !$isLoggedIn) {
    ?>
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Login — Level Editor</title>
    <link rel="stylesheet" href="assets/editor.css">
</head>
<body class="login-body">
    <form class="login-box" method="post">
        <h1>Level Editor</h1>
        <p>Masukkan password untuk melanjutkan.</p>
        <?php if ($loginError !== ''): ?>
            <div class="login-error"><?= htmlspecialchars($loginError, ENT_QUOTES) ?></div>
        <?php endif; ?>
        <input type="hidden" name="action" value="login">
        <input type="password" name="password" placeholder="Password" autofocus>
        <button type="submit" class="primary">Masuk</button>
    </form>
</body>
</html>
    <?php
    exit;
}

$jsConfig = [
    'apiUrl'    => 'api.php',
    'assetsUrl' => $config['assets_url'],
    'gameUrl'   => $config['game_url'],
];
?>
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Level Editor — Drift Maze</title>
    <link rel="stylesheet" href="assets/editor.css">
</head>
<body>
<header class="topbar">
    <div class="brand">
        <span class="brand-car">🚗</span>
        <span>Level Editor</span>
        <small>Drift Maze</small>
    </div>
    <div class="toolbar">
        <button id="btnNew"    type="button" title="Tambah level baru">＋ Level Baru</button>
        <button id="btnSave"   type="button" class="primary" title="Simpan (Ctrl+S)">💾 Simpan</button>
        <button id="btnReload" type="button" title="Muat ulang dari file">↻ Muat Ulang</button>
        <span class="sep"></span>
        <button id="btnUndo" type="button" title="Undo (Ctrl+Z)">↶ Undo</button>
        <button id="btnRedo" type="button" title="Redo (Ctrl+Y)">↷ Redo</button>
        <span class="sep"></span>
        <button id="btnExport" type="button" title="Unduh data level (JSON)">⇩ Export</button>
        <button id="btnImport" type="button" title="Unggah data level (JSON)">⇧ Import</button>
        <input  id="importFile" type="file" accept="application/json,.json,.js" hidden>
        <?php if ($needLogin): ?>
            <a class="linkbtn" href="?logout=1" title="Keluar">Keluar</a>
        <?php endif; ?>
        <a class="linkbtn play" id="playLink" href="<?= htmlspecialchars($config['game_url'], ENT_QUOTES) ?>" target="_blank" rel="noopener">▶ Buka Game</a>
    </div>
</header>

<main>
    <aside class="panel-left">
        <div class="panel-head">
            <span>Daftar Level</span>
            <span id="levelCount" class="badge">0</span>
        </div>
        <div id="levelList" class="level-list"></div>
    </aside>

    <section class="stage">
        <div class="stage-tools">
            <div class="toolgroup">
                <button class="tool" data-tool="brush"  type="button" title="Kuas (B)">🖌 Kuas</button>
                <button class="tool" data-tool="select" type="button" title="Pilih/Pindah (S)">➚ Pilih</button>
                <button class="tool" data-tool="erase"  type="button" title="Hapus (E)">⌫ Hapus</button>
            </div>
            <div class="toolgroup">
                <label>Snap
                    <select id="snapSelect">
                        <option value="32" selected>32 px</option>
                        <option value="16">16 px</option>
                        <option value="8">8 px</option>
                        <option value="0">Bebas</option>
                    </select>
                </label>
                <label><input type="checkbox" id="gridToggle" checked> Grid</label>
            </div>
            <div class="toolgroup">
                <button id="btnZoomOut" type="button" title="Perkecil">－</button>
                <span id="zoomLabel">100%</span>
                <button id="btnZoomIn" type="button" title="Perbesar">＋</button>
                <button id="btnFit" type="button" title="Sesuaikan layar">Fit</button>
            </div>
        </div>
        <div id="canvasWrap" class="canvas-wrap">
            <canvas id="board"></canvas>
            <div id="hoverInfo" class="hover-info"></div>
        </div>
    </section>

    <aside class="panel-right">
        <div class="panel-head"><span>Palet Tile</span></div>
        <div id="palette" class="palette"></div>

        <div class="panel-head"><span>Properti Tile</span></div>
        <div id="tileProps" class="props"></div>

        <div class="panel-head"><span>Properti Level</span></div>
        <div id="levelProps" class="props"></div>
    </aside>
</main>

<div id="toast" class="toast"></div>
<div id="statusBar" class="statusbar">Memuat…</div>

<script>window.EDITOR_CONFIG = <?= json_encode($jsConfig, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>;</script>
<script src="assets/editor.js"></script>
</body>
</html>
