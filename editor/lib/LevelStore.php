<?php
/**
 * LevelStore
 *
 * Membaca dan menulis file `assets/js/leveltiles.js`.
 *
 * File tersebut berbentuk:
 *
 *     var levelTiles = [
 *         //1
 *         {"width":1024,"height":1024,"tilesize":"32","tiles":[ ... ]},
 *         //2
 *         { ... }
 *     ];
 *
 * Setiap level ditulis pada satu baris (JSON kompak) dan didahului komentar
 * `//<nomor>`. Koma dipakai sebagai pemisah antar level (bukan di akhir).
 */
class LevelStore
{
    private string $file;
    private string $varName;
    private string $tilesDir;
    private ?string $error = null;

    public function __construct(string $file, string $varName = 'levelTiles', string $tilesDir = '')
    {
        $this->file     = $file;
        $this->varName  = $varName;
        $this->tilesDir = $tilesDir;
    }

    public function file(): string
    {
        return $this->file;
    }

    public function exists(): bool
    {
        return is_file($this->file);
    }

    public function error(): ?string
    {
        return $this->error;
    }

    /**
     * Membaca seluruh level dari file.
     *
     * @return array<int,array> Daftar level (array kosong bila gagal).
     */
    public function load(): array
    {
        if (!$this->exists()) {
            $this->error = 'File level tidak ditemukan: ' . $this->file;
            return [];
        }

        $raw = file_get_contents($this->file);
        if ($raw === false) {
            $this->error = 'Tidak dapat membaca file level.';
            return [];
        }

        $inner = $this->extractArray($raw);
        if ($inner === null) {
            $this->error = 'Format file level tidak dikenali (tidak menemukan array).';
            return [];
        }

        // Buang baris komentar (//1, //2, ...).
        $lines = preg_split('/\r\n|\r|\n/', $inner);
        $lines = array_filter($lines, static function ($line) {
            return !preg_match('#^\s*//#', $line);
        });
        $json = '[' . implode("\n", $lines) . ']';

        $decoded = json_decode($json, true);
        if (!is_array($decoded)) {
            $this->error = 'JSON tidak valid: ' . json_last_error_msg();
            return [];
        }

        $levels = [];
        foreach ($decoded as $lv) {
            if (is_array($lv)) {
                $levels[] = $this->normalizeLevel($lv);
            }
        }
        return $levels;
    }

    /**
     * Menyimpan seluruh level ke file.
     *
     * @param array<int,array> $levels
     * @return bool true bila berhasil.
     */
    public function save(array $levels): bool
    {
        $normalized = [];
        foreach ($levels as $lv) {
            if (is_array($lv)) {
                $normalized[] = $this->normalizeLevel($lv);
            }
        }

        $count = count($normalized);
        if ($count === 0) {
            $this->error = 'Tidak ada level untuk disimpan.';
            return false;
        }

        $nl  = "\r\n";
        $out = 'var ' . $this->varName . ' = [' . $nl;
        foreach ($normalized as $i => $lv) {
            $out .= "\t//" . ($i + 1) . $nl;
            $out .= "\t" . json_encode($lv, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($i < $count - 1) {
                $out .= ',';
            }
            $out .= $nl;
        }
        $out .= '];';

        // Tulis ke file sementara lalu pindahkan, supaya file asli tidak rusak
        // bila proses gagal di tengah jalan.
        $tmp = $this->file . '.tmp';
        if (@file_put_contents($tmp, $out) === false) {
            $this->error = 'Tidak dapat menulis file (periksa izin folder).';
            return false;
        }
        if (!@rename($tmp, $this->file)) {
            if (@file_put_contents($this->file, $out) === false) {
                $this->error = 'Tidak dapat mengganti file level.';
                @unlink($tmp);
                return false;
            }
            @unlink($tmp);
        }
        return true;
    }

    /**
     * Membuat backup file level.
     *
     * @return string|null path backup, atau null bila gagal.
     */
    public function backup(string $backupDir): ?string
    {
        if (!$this->exists()) {
            return null;
        }
        if (!is_dir($backupDir) && !@mkdir($backupDir, 0777, true) && !is_dir($backupDir)) {
            return null;
        }
        $target = $backupDir . '/leveltiles-' . date('Ymd-His') . '-' . substr((string) microtime(true), -4) . '.js';
        return @copy($this->file, $target) ? $target : null;
    }

    /**
     * Daftar nama tile yang tersedia (tile1 ... tileN) berdasarkan gambar di disk.
     *
     * @return string[]
     */
    public function tiles(): array
    {
        if (!is_dir($this->tilesDir)) {
            return [];
        }
        $names = [];
        foreach (glob($this->tilesDir . '/tile*.png') ?: [] as $f) {
            if (preg_match('/^(tile\d+)\.png$/i', basename($f), $m)) {
                $names[] = strtolower($m[1]);
            }
        }
        usort($names, static function ($a, $b) {
            return (int) substr($a, 4) <=> (int) substr($b, 4);
        });
        return $names;
    }

    // ------------------------------------------------------------------ //

    /**
     * Mengubah nilai menjadi int bila benar-benar bilangan bulat, atau
     * membiarkannya sebagai float. Ini menjaga file tetap byte-identik dengan
     * aslinya (mis. rotasi 1.4210854715202004e-14 tetap dipertahankan).
     *
     * @param mixed $v
     * @return int|float
     */
    private function num($v)
    {
        if (is_int($v)) {
            return $v;
        }
        $f = (float) $v;
        return ($f === (float) (int) $f) ? (int) $f : $f;
    }

    private function extractArray(string $raw): ?string
    {
        $start = strpos($raw, '[');
        $end   = strrpos($raw, ']');
        if ($start === false || $end === false || $end <= $start) {
            return null;
        }
        return substr($raw, $start + 1, $end - $start - 1);
    }

    /**
     * Merapikan satu level agar kunci & tipe datanya konsisten dengan format game.
     */
    private function normalizeLevel(array $lv): array
    {
        $tiles = [];
        $rawTiles = isset($lv['tiles']) && is_array($lv['tiles']) ? $lv['tiles'] : [];
        foreach ($rawTiles as $t) {
            if (!is_array($t)) {
                continue;
            }
            $name = isset($t['spritename']) ? trim((string) $t['spritename']) : '';
            if ($name === '') {
                continue;
            }
            $tiles[] = [
                'x'          => $this->num($t['x'] ?? 0),
                'y'          => $this->num($t['y'] ?? 0),
                'flipx'      => ((int) ($t['flipx'] ?? 1)) === -1 ? -1 : 1,
                'spritename' => $name,
                'rotation'   => $this->num($t['rotation'] ?? 0),
                'param'      => isset($t['param']) ? (string) $t['param'] : '',
            ];
        }

        return [
            'width'    => max(1, (int) ($lv['width'] ?? 1024)),
            'height'   => max(1, (int) ($lv['height'] ?? 1024)),
            'tilesize' => (string) ((int) ($lv['tilesize'] ?? 32)),
            'tiles'    => $tiles,
        ];
    }
}
