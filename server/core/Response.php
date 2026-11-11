<?php

declare(strict_types=1);

final class Response
{
    public static function send(string $status, mixed $data = null, ?string $message = null, ?array $errors = null, int $http = 200): never
    {
        http_response_code($http);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => $status,
            'message' => $message,
            'data' => $data,
            'errors' => $errors,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
