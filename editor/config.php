<?php
/**
 * Konfigurasi Level Editor "Drift Maze".
 *
 * Ubah nilai di bawah ini bila struktur folder game berbeda.
 * File ini sengaja dibuat sederhana (plain PHP array) agar mudah disesuaikan.
 */

$root = dirname(__DIR__); // folder root project (satu level di atas folder editor/)

return [
    // File JavaScript yang menyimpan seluruh data level.
    'level_file' => $root . '/assets/js/leveltiles.js',

    // Folder yang berisi gambar tile (tile1.png ... tile27.png) dan grass.jpg.
    'tiles_dir'  => $root . '/assets/assets',

    // URL (relatif dari folder editor/) untuk gambar tile & background.
    'assets_url' => '../assets/assets/',

    // URL game supaya bisa dibuka langsung dari editor.
    'game_url'   => '../assets/index.html',

    // Nama variabel JavaScript yang diekspor (harus sama dengan yang dipakai game).
    'var_name'   => 'levelTiles',

    // Password opsional. Kosongkan ('') untuk menonaktifkan login.
    'password'   => '',

    // Bila false, editor hanya dapat diakses dari komputer lokal (localhost).
    'allow_remote' => false,

    // Membuat file backup otomatis setiap kali menyimpan.
    'backups'      => true,
    'backup_dir'   => __DIR__ . '/backups',
];
