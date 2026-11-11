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

        foreach (TABLES as $slug => $table) {
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
        }
    }

    public static function table(string $slug): array
    {
        if (!isset(TABLES[$slug])) {
            Response::send('failed', null, 'Unknown table', null, 404);
        }
        return TABLES[$slug];
    }
}
