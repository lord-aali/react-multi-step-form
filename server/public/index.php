<?php

declare(strict_types=1);

require dirname(__DIR__) . '/config/config.php';
require dirname(__DIR__) . '/core/Response.php';
require dirname(__DIR__) . '/core/Database.php';
require dirname(__DIR__) . '/core/Schema.php';
require dirname(__DIR__) . '/core/DraftCrypto.php';
require dirname(__DIR__) . '/core/SessionStore.php';
require dirname(__DIR__) . '/core/DatasetRepository.php';

if (!is_dir(STORAGE_DIR)) {
    mkdir(STORAGE_DIR, 0775, true);
}

try {
    $db = Database::connect();
    Schema::ensure($db);
} catch (Throwable $error) {
    Response::send('failed', null, 'Database connection failed', null, 500);
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#^/api#', '', $path) ?? '/';
if ($path === '') {
    $path = '/';
}
$path = '/' . trim($path, '/');
if ($path === '/') {
    $path = '/';
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$sessions = new SessionStore($db);
$datasets = new DatasetRepository($db);

try {
route($method, $path, $sessions, $datasets);
} catch (Throwable $error) {
    Response::send('failed', null, $error->getMessage(), null, 500);
}

function route(string $method, string $path, SessionStore $sessions, DatasetRepository $datasets): void
{
if ($method === 'POST' && $path === '/session') {
    $sessions->start();
    Response::send('ok', ['ok' => true]);
}

if ($method === 'GET' && $path === '/session') {
    Response::send('ok', $sessions->read());
}

if ($method === 'PUT' && $path === '/session') {
    $body = readJson();
    $sessions->write($body);
    Response::send('ok', ['ok' => true]);
}

if ($method === 'DELETE' && $path === '/session') {
    $sessions->destroy();
    Response::send('ok', ['ok' => true]);
}

if ($method === 'POST' && $path === '/datasets') {
    $body = readJson();
    $slug = (string) ($body['table'] ?? '');
    $values = is_array($body['values'] ?? null) ? $body['values'] : [];
    $created = $datasets->insert($slug, $values);
    Response::send('ok', $created, null, null, 201);
}

if (preg_match('#^/datasets/([A-Za-z0-9_]+)/([a-f0-9]{32})/files/([A-Za-z0-9_]+)$#', $path, $match)) {
    [, $slug, $key, $column] = $match;
    if ($method === 'POST') {
        $datasets->storeFile($slug, $key, $column, $_FILES['file'] ?? []);
        Response::send('ok', [
            'url' => '/api/datasets/' . rawurlencode($slug) . '/' . $key . '/files/' . rawurlencode($column),
        ]);
    }
    if ($method === 'GET') {
        $file = $datasets->filePath($slug, $key, $column);
        if ($file === null) {
            Response::send('failed', null, 'File not found', null, 404);
        }
        $mime = mime_content_type($file) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . (string) filesize($file));
        header('X-Content-Type-Options: nosniff');
        readfile($file);
        exit;
    }
}

if (preg_match('#^/datasets/([A-Za-z0-9_]+)/([a-f0-9]{32})$#', $path, $match)) {
    [, $slug, $key] = $match;
    if ($method === 'GET') {
        $row = $datasets->find($slug, $key);
        if ($row === null) {
            Response::send('failed', null, 'Row not found', null, 404);
        }
        Response::send('ok', $row);
    }
    if ($method === 'PUT') {
        $body = readJson();
        $values = is_array($body['values'] ?? null) ? $body['values'] : [];
        $datasets->update($slug, $key, $values);
        Response::send('ok', $datasets->find($slug, $key));
    }
    if ($method === 'DELETE') {
        requireApiKey();
        $datasets->delete($slug, $key);
        Response::send('ok', ['ok' => true]);
    }
}

if (preg_match('#^/datasets/([A-Za-z0-9_]+)$#', $path, $match)) {
    $slug = $match[1];
    if ($method === 'GET') {
        requireApiKey();
        $limit = max(1, min(200, (int) ($_GET['limit'] ?? 50)));
        $offset = max(0, (int) ($_GET['offset'] ?? 0));
        Response::send('ok', $datasets->list($slug, $limit, $offset));
    }
    if ($method === 'DELETE') {
        requireApiKey();
        $body = readJson();
        $keys = is_array($body['keys'] ?? null) ? $body['keys'] : [];
        foreach ($keys as $key) {
            if (is_string($key)) {
                $datasets->delete($slug, $key);
            }
        }
        Response::send('ok', ['ok' => true]);
    }
}

Response::send('failed', null, 'Not found', null, 404);
}

function readJson(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function requireApiKey(): void
{
    $given = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if (!is_string($given) || !hash_equals(API_KEY, $given)) {
        Response::send('failed', null, 'API key required', null, 401);
    }
}
