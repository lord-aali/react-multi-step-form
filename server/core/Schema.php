<?php

declare(strict_types=1);

final class Schema
{
    public static function columnSql(string $type): string
    {
        return match ($type) {
            'string' => 'VARCHAR(255) NULL',
            'text' => 'TEXT NULL',
            'int' => 'INT NULL',
            'float' => 'DOUBLE NULL',
            'bool' => 'TINYINT(1) NULL',
            'date' => 'DATE NULL',
            'datetime' => 'DATETIME NULL',
            'json' => 'JSON NULL',
            'file' => 'VARCHAR(512) NULL',
            default => throw new InvalidArgumentException('Unknown column type ' . $type),
        };
    }

    public static function ensure(PDO $db): void
    {
        $db->exec(
            'CREATE TABLE IF NOT EXISTS msf_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                token_hash CHAR(64) NOT NULL,
                draft MEDIUMBLOB NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_msf_token (token_hash)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        foreach (TABLES as $table) {
            $slug = self::slugOf($table);
            Database::ident($slug);
            $physical = Database::ident($table['name']);
            $key = Database::ident($table['key']);
            $quotedTable = '`' . $physical . '`';
            $quotedKey = '`' . $key . '`';
            $db->exec(
                "CREATE TABLE IF NOT EXISTS {$quotedTable} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    {$quotedKey} CHAR(32) NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_{$physical}_{$key} ({$quotedKey})
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
            );
            $existing = [];
            foreach ($db->query('SHOW COLUMNS FROM ' . $quotedTable) as $column) {
                $existing[$column['Field']] = true;
            }
            foreach ($table['columns'] as $column => $type) {
                Database::ident($column);
                if ($column === 'id' || $column === $key) {
                    continue;
                }
                if (!isset($existing[$column])) {
                    $db->exec('ALTER TABLE ' . $quotedTable . ' ADD COLUMN `' . $column . '` ' . self::columnSql($type));
                }
            }
            self::ensureResumeIndex($db, $table, $physical, $quotedTable);
        }
    }

    private static function ensureResumeIndex(PDO $db, array $table, string $physical, string $quotedTable): void
    {
        $resume = $table['resumeColumn'] ?? null;
        if (!is_string($resume) || $resume === '') {
            return;
        }
        if (!isset($table['columns'][$resume])) {
            throw new InvalidArgumentException('resumeColumn must exist in columns for ' . $physical);
        }
        Database::ident($resume);
        $index = 'uq_' . $physical . '_resume';
        $existing = [];
        foreach ($db->query('SHOW INDEX FROM ' . $quotedTable) as $row) {
            $existing[$row['Key_name']] = true;
        }
        if (!isset($existing[$index])) {
            $db->exec('ALTER TABLE ' . $quotedTable . ' ADD UNIQUE KEY `' . $index . '` (`' . $resume . '`)');
        }
    }

    public static function table(string $slug): array
    {
        foreach (TABLES as $table) {
            if (self::slugOf($table) === $slug) {
                return $table;
            }
        }
        Response::send('failed', null, 'Unknown table', null, 404);
    }

    public static function slugOf(array $table): string
    {
        $slug = $table['slug'] ?? null;
        if (!is_string($slug) || $slug === '') {
            throw new InvalidArgumentException('Each TABLES entry must define a non-empty slug');
        }
        return $slug;
    }
}
