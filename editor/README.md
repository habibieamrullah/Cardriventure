# Level Editor — Drift Maze

Editor level berbasis **PHP** untuk mengelola level game Drift Maze
(`assets/js/leveltiles.js`) secara visual — tanpa perlu menulis kode.

Editor ini membaca dan menulis **file level yang sama** dengan yang dipakai game,
jadi hasil edit langsung terpakai begitu file disimpan dan halaman game di-refresh.

---

## Menjalankan

Cara termudah memakai server bawaan PHP. Buka terminal di **root project**
(folder yang berisi `assets/` dan `editor/`), lalu:

```bash
php -S localhost:8000
```

Buka di browser:

```
http://localhost:8000/editor/
```

> Editor juga bisa ditaruh di server web (Apache/Nginx dsb.) selama folder
> `editor/` berada langsung di dalam root project, sehingga URL relatif
> `../assets/assets/` menuju gambar tile tetap benar.

Kebutuhan: **PHP 7.4+** (diuji pada PHP 8.3).

---

## Tampilan

```
┌──────────────────────── Toolbar (Simpan, Undo, Export, ...) ─────────────────────┐
│ Daftar Level     │            Kanvas editor (visual)         │  Palet Tile       │
│  1  1024×1024    │                                            │   Properti Tile   │
│  2  1024×2048    │                                            │   Properti Level  │
│  ...             │                                            │                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

* **Palet Tile** — klik sebuah tile untuk dijadikan "kuas". Warna label menunjukkan
  jenis tile: *jalur* (road), *dinding* (collision), *teleport* (tile9), *hiasan*.
* **Kanvas** — tempat menyusun level. Tile digambar sesuai rotasi & flip seperti di game.
* **Properti Tile** — muncul saat sebuah tile dipilih (alat *Pilih*).
* **Properti Level** — ukuran (lebar/tinggi), tilesize, jumlah tile.

---

## Cara pakai singkat

1. Pilih level di panel kiri (atau klik **＋ Level Baru**).
2. Pilih tile di palet, lalu klik di kanvas untuk menaruhnya.
3. Atur posisi/rotasi/gambar tile lewat **Properti Tile**.
4. Tekan **💾 Simpan** untuk menulis perubahan ke `assets/js/leveltiles.js`.
5. Buka game untuk mencoba hasilnya.

### Alat (tools)

| Alat      | Fungsi                                                        |
|-----------|---------------------------------------------------------------|
| **Kuas**  | Klik kanvas → menaruh tile terpilih pada grid.               |
| **Pilih** | Klik tile → memilihnya; tahan & geser untuk memindahkan.     |
| **Hapus** | Klik tile → menghapusnya.                                     |

Klik kanan di kanvas selalu menghapus tile di bawah kursor (semua alat).

### Navigasi kanvas

* **Zoom**: scroll roda mouse, tombol **＋ / －**, atau tombol **Fit**.
* **Geser tampilan (pan)**: tahan **tombol tengah mouse**, atau tahan **Spasi** lalu
  seret dengan klik kiri.
* **Snap**: pilihan 32/16/8 px atau **Bebas**. Grid mengikuti `tilesize` level.

### Shortcut keyboard

| Tombol                  | Aksi                         |
|-------------------------|------------------------------|
| `B` / `S` / `E`         | Kuas / Pilih / Hapus         |
| `Ctrl+S`                | Simpan                       |
| `Ctrl+Z` / `Ctrl+Y`     | Undo / Redo                  |
| `Delete` / `Backspace`  | Hapus tile terpilih          |
| `← ↑ → ↓`               | Geser tile terpilih (per snap) |
| `+` / `-`               | Zoom in / out                |
| `Spasi` + seret         | Geser tampilan (pan)         |

---

## Mengelola level

* **＋ Level Baru** — menambah level kosong di akhir.
* Setiap item level punya tombol **▲ ▼** (pindah urutan), **⧉** (duplikat), **✕** (hapus).
* **⇩ Export** mengunduh seluruh level sebagai `leveltiles.json`.
* **⇧ Import** memuat kembali file JSON (atau file `leveltiles.js`) ke editor.
  Perubahan baru tersimpan setelah menekan **Simpan**.
* **↻ Muat Ulang** membuang perubahan yang belum disimpan dan membaca file lagi.

---

## Properti penting

* **tilesize** (default `32`) — ukuran grid kanvas dan langkah snap.
* **width / height** — ukuran dunia level dalam piksel (game memakai ini untuk
  `world.setBounds`). Sebaiknya kelipatan `tilesize`.
* **flipx** — `1` normal, `-1` cermin horizontal (`scale.setTo(flipx, 1)` di game).
* **param** — hanya berarti untuk **tile9** (teleport), dengan format
  `"levelTujuan,titikMasuk"`, mis. `"3,1"`. Di game, tile9 tidak terlihat
  (alpha 0); di editor ditampilkan semi-transparan agar mudah ditemukan.

### Kategori tile (mengikuti logika game)

| Kategori    | Tile                                   | Perilaku                                  |
|-------------|----------------------------------------|-------------------------------------------|
| **Jalur**   | tile2, tile3, tile4, tile5             | Permukaan jalan (deteksi `onRoad`).       |
| **Dinding** | tile6-8, tile10-15, tile17-24          | Objek fisika (collision).                 |
| **Teleport**| tile9                                  | Memindahkan mobil antar level (`param`).  |
| **Hiasan**  | tile1, tile16, tile25, tile26, tile27  | Tanpa fisika.                             |

---

## Format file level

`assets/js/leveltiles.js`:

```js
var levelTiles = [
	//1
	{"width":1024,"height":1024,"tilesize":"32","tiles":[{"x":96,"y":224,"flipx":1,"spritename":"tile7","rotation":0,"param":""}, ...]},
	//2
	{ ... }
];
```

Editor menulis ulang file ini dengan format yang **sama persis** (CRLF, tab,
komentar `//<nomor>` per level). Menyimpan tanpa mengubah apa pun menghasilkan
file yang identik byte-per-byte, sehingga riwayat Git tetap bersih.

---

## Backup otomatis

Setiap kali menyimpan, editor menyalin file level lama ke `editor/backups/`
(nama: `leveltiles-YYYYmmdd-His-xxxx.js`) bila `backups` aktif. Folder ini
di-abaikan Git. Aksi **restore** juga tersedia pada endpoint `api.php`
(`action=restore`).

---

## Konfigurasi (`editor/config.php`)

| Kunci          | Default                        | Keterangan                                        |
|----------------|--------------------------------|---------------------------------------------------|
| `level_file`   | `../assets/js/leveltiles.js`   | Path file data level (dibaca & ditulis).          |
| `tiles_dir`    | `../assets/assets`             | Folder gambar tile (`tile*.png`) & `grass.jpg`.   |
| `assets_url`   | `../assets/assets/`            | URL gambar tile dari halaman editor.              |
| `game_url`     | `../assets/index.html`         | URL tombol "Buka Game".                           |
| `var_name`     | `levelTiles`                   | Nama variabel JS yang ditulis.                    |
| `password`     | *(kosong)*                     | Bila diisi, editor meminta login.                 |
| `allow_remote` | `false`                        | Bila `true`, editor boleh diakses dari luar localhost. |
| `backups`      | `true`                         | Aktifkan backup otomatis saat menyimpan.          |

---

## API singkat (`editor/api.php`)

| Aksi      | Metode | Keterangan                                          |
|-----------|--------|-----------------------------------------------------|
| `state`   | GET    | Ambil semua level, daftar tile, dan konfigurasi.    |
| `save`    | POST   | Simpan seluruh level: `{"action":"save","levels":[...]}`. |
| `backups` | GET    | Daftar file backup.                                 |
| `restore` | POST   | Pulihkan level dari backup: `{"action":"restore","name":"..."}`. |

---

## Struktur folder

```
editor/
├─ index.php          # Halaman editor (UI)
├─ api.php            # Endpoint JSON
├─ config.php         # Konfigurasi
├─ lib/LevelStore.php # Baca/tulis assets/js/leveltiles.js
├─ assets/
│  ├─ editor.css
│  └─ editor.js
├─ backups/           # Backup otomatis (di-abaikan Git)
└─ README.md
```

---

## Catatan keamanan

Editor ini adalah alat pengembangan yang **dapat menulis file di server**.

* Secara default hanya bisa diakses dari `localhost` (`allow_remote = false`).
* Jika perlu diakses dari jarak jauh, isi `password` pada `config.php` dan/atau
  batasi akses folder `editor/` lewat konfigurasi web server.
* Jangan menaruh folder `editor/` di lingkungan produksi publik tanpa proteksi.

