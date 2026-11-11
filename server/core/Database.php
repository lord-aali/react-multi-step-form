<?php

declare(strict_types=1);

final class Database
{
    public static function connect(): PDO
    {
        ini_set('default_socket_timeout', '3');
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 3,
        ];
        $server = new PDO(
            'mysql:host=' . DB_HOST . ';charset=' . DB_CHARSET,
            DB_USER,
            DB_PASS,
            $options
        );
        $name = self::ident(DB_NAME, true);
        $server->exec("CREATE DATABASE IF NOT EXISTS {$name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        return new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET,
            DB_USER,
            DB_PASS,
            $options
        );
    }

    public static function ident(string $name, bool $quoted = false): string
    {
        if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $name)) {
            throw new InvalidArgumentException('Invalid identifier');
        }
        return $quoted ? '`' . $name . '`' : $name;
    }
}
