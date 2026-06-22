<?php
/**
 * gallery-images.php — Khai Studio Photography
 * ─────────────────────────────────────────────
 * Place this file in your website ROOT (same folder as gallery.html).
 *
 * It scans ALL sub-folders inside images/albums/ and returns every
 * image as a JSON array — no filenames needed anywhere.
 *
 * gallery.html JS calls this automatically and builds the grid.
 *
 * SUPPORTED FORMATS: jpg  jpeg  png  webp  gif
 *
 * TO ADD PHOTOS: just drop them into any folder inside images/albums/
 * The page picks them up on next load — no code changes needed.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$albums_dir   = __DIR__ . '/images/albums/';
$albums_url   = 'images/albums/';
$allowed_exts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
$images       = [];

if (!is_dir($albums_dir)) {
    echo json_encode([]);
    exit;
}

/* Scan every sub-folder inside images/albums/ */
foreach (scandir($albums_dir) as $folder) {
    if ($folder === '.' || $folder === '..') continue;
    $folder_path = $albums_dir . $folder;
    if (!is_dir($folder_path)) continue;

    foreach (scandir($folder_path) as $file) {
        if ($file === '.' || $file === '..') continue;
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed_exts, true)) continue;

        /* Auto-generate a clean SEO alt text from the filename */
        $name = pathinfo($file, PATHINFO_FILENAME);
        $name = preg_replace('/[-_]+/', ' ', $name);   // hyphens/underscores → spaces
        $name = preg_replace('/\s*\d+$/', '', $name);  // strip trailing numbers
        $name = trim(ucwords(strtolower($name)));
        $alt  = 'Khai Studio Photography' . ($name ? ' – ' . $name : '') . ' | Surrey & Metro Vancouver';

        $images[] = [
            'src' => $albums_url . $folder . '/' . $file,
            'alt' => $alt,
        ];
    }
}

/* Sort by folder then filename for consistent order */
usort($images, function ($a, $b) { return strcmp($a['src'], $b['src']); });

echo json_encode(array_values($images), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);