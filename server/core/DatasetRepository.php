<?php

declare(strict_types=1);

final class DatasetRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function insert(string $slug, array $values): array
    {
        $table = Schema::table($slug);
        $key = bin2hex(random_bytes(16));
        [$columns, $params] = $this->assignments($table, $values, true);
        $columns[] = '`' . Database::ident($table['key']) . '`';
        $params[] = $key;
        $physical = '`' . Database::ident($table['name']) . '`';
        $placeholders = implode(', ', array_fill(0, count($params), '?'));
        $sql = 'INSERT INTO ' . $physical . ' (' . implode(', ', $columns) . ') VALUES (' . $placeholders . ')';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return ['id' => (int) $this->db->lastInsertId(), 'key' => $key];
    }

    public function update(string $slug, string $key, array $values): void
    {
        $table = Schema::table($slug);
        $this->assertKey($key);
        $row = $this->findRow($table, $key);
        if (!$row) {
            Response::send('failed', null, 'Row not found', null, 404);
        }
        [$columns, $params] = $this->assignments($table, $values, false);
        $this->clearRemovedFiles($table, $row, $values);
        if ($columns === []) {
            return;
        }
        $params[] = $key;
        $physical = '`' . Database::ident($table['name']) . '`';
        $keyColumn = '`' . Database::ident($table['key']) . '`';
        $sql = 'UPDATE ' . $physical . ' SET ' . implode(', ', $columns) . ' WHERE ' . $keyColumn . ' = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
    }

    public function find(string $slug, string $key): ?array
    {
        $table = Schema::table($slug);
        $this->assertKey($key);
        $row = $this->findRow($table, $key);
        if (!$row) {
            return null;
        }
        return $this->present($slug, $table, $row);
    }

    public function list(string $slug, int $limit, int $offset): array
    {
        $table = Schema::table($slug);
        $physical = '`' . Database::ident($table['name']) . '`';
        $stmt = $this->db->prepare('SELECT * FROM ' . $physical . ' ORDER BY id DESC LIMIT ' . $limit . ' OFFSET ' . $offset);
        $stmt->execute();
        $rows = [];
        foreach ($stmt->fetchAll() as $row) {
            $rows[] = $this->present($slug, $table, $row);
        }
        return $rows;
    }

    public function delete(string $slug, string $key): void
    {
        $table = Schema::table($slug);
        $this->assertKey($key);
        $row = $this->findRow($table, $key);
        if (!$row) {
            Response::send('failed', null, 'Row not found', null, 404);
        }
        $this->deleteFiles($table, $row);
        $physical = '`' . Database::ident($table['name']) . '`';
        $keyColumn = '`' . Database::ident($table['key']) . '`';
        $stmt = $this->db->prepare('DELETE FROM ' . $physical . ' WHERE ' . $keyColumn . ' = ?');
        $stmt->execute([$key]);
    }

    public function storeFile(string $slug, string $key, string $column, array $file): string
    {
        $table = Schema::table($slug);
        $this->assertKey($key);
        if (!isset($table['columns'][$column]) || $table['columns'][$column] !== 'file') {
            Response::send('failed', null, 'Unknown file column', null, 404);
        }
        $row = $this->findRow($table, $key);
        if (!$row) {
            Response::send('failed', null, 'Row not found', null, 404);
        }
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::send('failed', null, 'Upload failed', null, 400);
        }
        if (($file['size'] ?? 0) > 80 * 1024 * 1024) {
            Response::send('failed', null, 'File is too large', null, 413);
        }
        $ext = $this->extension((string) ($file['name'] ?? ''), (string) ($file['type'] ?? ''));
        $dir = STORAGE_DIR . DIRECTORY_SEPARATOR . $slug . DIRECTORY_SEPARATOR . $key;
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            Response::send('failed', null, 'Storage is not writable', null, 500);
        }
        $relative = $slug . '/' . $key . '/' . $column . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
        $target = STORAGE_DIR . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
        if (!move_uploaded_file((string) $file['tmp_name'], $target)) {
            Response::send('failed', null, 'Upload failed', null, 400);
        }
        $this->deleteStoredPath(isset($row[$column]) ? (string) $row[$column] : null);
        $physical = '`' . Database::ident($table['name']) . '`';
        $keyColumn = '`' . Database::ident($table['key']) . '`';
        $stmt = $this->db->prepare('UPDATE ' . $physical . ' SET `' . Database::ident($column) . '` = ? WHERE ' . $keyColumn . ' = ?');
        $stmt->execute([$relative, $key]);
        return $relative;
    }

    public function filePath(string $slug, string $key, string $column): ?string
    {
        $table = Schema::table($slug);
        $this->assertKey($key);
        if (!isset($table['columns'][$column]) || $table['columns'][$column] !== 'file') {
            return null;
        }
        $row = $this->findRow($table, $key);
        if (!$row || empty($row[$column])) {
            return null;
        }
        $relative = str_replace(['\\', "\0"], ['/', ''], (string) $row[$column]);
        if (str_contains($relative, '..')) {
            return null;
        }
        $full = STORAGE_DIR . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
        $root = realpath(STORAGE_DIR);
        $real = realpath($full);
        if ($root === false || $real === false || !str_starts_with($real, $root)) {
            return null;
        }
        return $real;
    }

    private function assignments(array $table, array $values, bool $insert): array
    {
        $columns = [];
        $params = [];
        foreach ($table['columns'] as $column => $type) {
            if (!array_key_exists($column, $values)) {
                continue;
            }
            if ($type === 'file' && $values[$column] !== null && $values[$column] !== '') {
                continue;
            }
            $columns[] = '`' . Database::ident($column) . '` = ?';
            $params[] = $this->cast($values[$column], $type);
        }
        if ($insert) {
            $columns = array_map(static fn (string $set) => trim(explode('=', $set)[0]), $columns);
        }
        return [$columns, $params];
    }

    private function cast(mixed $value, string $type): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }
        return match ($type) {
            'int' => (int) $value,
            'float' => (float) $value,
            'bool' => $this->bool($value),
            'json' => is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE),
            default => is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE),
        };
    }

    private function bool(mixed $value): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        $text = strtolower((string) $value);
        return in_array($text, ['1', 'true', 'yes', 'بله'], true) ? 1 : 0;
    }

    private function present(string $slug, array $table, array $row): array
    {
        $keyName = $table['key'];
        $out = [
            'id' => (int) $row['id'],
            'key' => $row[$keyName],
        ];
        foreach ($table['columns'] as $column => $type) {
            $value = $row[$column] ?? null;
            if ($type === 'bool') {
                $out[$column] = $value === null ? null : ((int) $value === 1);
            } elseif ($type === 'file') {
                $out[$column] = $value
                    ? '/api/datasets/' . rawurlencode($slug) . '/' . $row[$keyName] . '/files/' . rawurlencode($column)
                    : null;
            } elseif ($type === 'int') {
                $out[$column] = $value === null ? null : (int) $value;
            } elseif ($type === 'float') {
                $out[$column] = $value === null ? null : (float) $value;
            } else {
                $out[$column] = $value;
            }
        }
        return $out;
    }

    private function findRow(array $table, string $key): ?array
    {
        $physical = '`' . Database::ident($table['name']) . '`';
        $keyColumn = '`' . Database::ident($table['key']) . '`';
        $stmt = $this->db->prepare('SELECT * FROM ' . $physical . ' WHERE ' . $keyColumn . ' = ? LIMIT 1');
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    private function clearRemovedFiles(array $table, array $row, array $values): void
    {
        foreach ($table['columns'] as $column => $type) {
            if ($type !== 'file' || !array_key_exists($column, $values)) {
                continue;
            }
            if ($values[$column] === null || $values[$column] === '') {
                $this->deleteStoredPath(isset($row[$column]) ? (string) $row[$column] : null);
            }
        }
    }

    private function deleteFiles(array $table, array $row): void
    {
        foreach ($table['columns'] as $column => $type) {
            if ($type === 'file') {
                $this->deleteStoredPath(isset($row[$column]) ? (string) $row[$column] : null);
            }
        }
    }

    private function deleteStoredPath(?string $relative): void
    {
        if ($relative === null || $relative === '' || str_contains($relative, '..')) {
            return;
        }
        $full = STORAGE_DIR . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
        if (is_file($full)) {
            unlink($full);
        }
    }

    private function extension(string $name, string $mime): string
    {
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'heic', 'mp4', 'mov', 'webm', 'bin'];
        if (in_array($ext, $allowed, true)) {
            return $ext === 'jpeg' ? 'jpg' : $ext;
        }
        return match (true) {
            str_contains($mime, 'png') => 'png',
            str_contains($mime, 'heic') => 'heic',
            str_contains($mime, 'webm') => 'webm',
            str_contains($mime, 'mp4') => 'mp4',
            str_contains($mime, 'jpeg') => 'jpg',
            default => 'bin',
        };
    }

    private function assertKey(string $key): void
    {
        if (!preg_match('/^[a-f0-9]{32}$/', $key)) {
            Response::send('failed', null, 'Row not found', null, 404);
        }
    }
}
