<?php

declare(strict_types=1);

final class SessionStore
{
    public function __construct(private PDO $db)
    {
    }

    public function tokenHash(): ?string
    {
        $token = $_COOKIE[SESSION_COOKIE] ?? '';
        if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            return null;
        }
        return hash('sha256', $token);
    }

    public function start(): void
    {
        $hash = $this->tokenHash();
        if ($hash !== null && $this->find($hash)) {
            return;
        }
        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $expires = date('Y-m-d H:i:s', time() + SESSION_TTL);
        $stmt = $this->db->prepare('INSERT INTO msf_sessions (token_hash, draft, expires_at) VALUES (?, NULL, ?)');
        $stmt->execute([$hash, $expires]);
        $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        setcookie(SESSION_COOKIE, $token, [
            'expires' => time() + SESSION_TTL,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => $secure,
        ]);
        $_COOKIE[SESSION_COOKIE] = $token;
    }

    public function read(): ?array
    {
        $hash = $this->requireHash();
        $row = $this->find($hash);
        if (!$row || $row['draft'] === null || $row['draft'] === '') {
            return null;
        }
        $json = DraftCrypto::open((string) $row['draft']);
        if ($json === null) {
            return null;
        }
        $data = json_decode($json, true);
        return is_array($data) ? $data : null;
    }

    public function write(array $draft): void
    {
        $hash = $this->requireHash();
        $json = json_encode($draft, JSON_UNESCAPED_UNICODE);
        if ($json === false || strlen($json) > 262144) {
            Response::send('failed', null, 'Draft is too large', null, 413);
        }
        $expires = date('Y-m-d H:i:s', time() + SESSION_TTL);
        $stmt = $this->db->prepare('UPDATE msf_sessions SET draft = ?, expires_at = ? WHERE token_hash = ?');
        $stmt->execute([DraftCrypto::seal($json), $expires, $hash]);
    }

    public function destroy(): void
    {
        $hash = $this->tokenHash();
        if ($hash === null) {
            return;
        }
        $stmt = $this->db->prepare('DELETE FROM msf_sessions WHERE token_hash = ?');
        $stmt->execute([$hash]);
        setcookie(SESSION_COOKIE, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    private function requireHash(): string
    {
        $hash = $this->tokenHash();
        if ($hash === null || !$this->find($hash)) {
            Response::send('failed', null, 'Session required', null, 401);
        }
        return $hash;
    }

    private function find(string $hash): ?array
    {
        $stmt = $this->db->prepare('SELECT token_hash, draft, expires_at FROM msf_sessions WHERE token_hash = ? LIMIT 1');
        $stmt->execute([$hash]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        if (strtotime((string) $row['expires_at']) < time()) {
            $delete = $this->db->prepare('DELETE FROM msf_sessions WHERE token_hash = ?');
            $delete->execute([$hash]);
            return null;
        }
        return $row;
    }
}
