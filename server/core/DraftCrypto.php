<?php

declare(strict_types=1);

final class DraftCrypto
{
    public static function seal(string $plain): string
    {
        $key = self::key();
        if (self::sodiumReady()) {
            $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
            return 's' . $nonce . sodium_crypto_secretbox($plain, $nonce, $key);
        }
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipher === false) {
            throw new RuntimeException('Unable to seal the draft');
        }
        return 'o' . $iv . $tag . $cipher;
    }

    public static function open(string $blob): ?string
    {
        if ($blob === '') {
            return null;
        }
        $key = self::key();
        $prefix = $blob[0];
        $body = substr($blob, 1);
        if ($prefix === 's') {
            if (!self::sodiumReady()) {
                return null;
            }
            $nonceLength = SODIUM_CRYPTO_SECRETBOX_NONCEBYTES;
            if (strlen($body) <= $nonceLength) {
                return null;
            }
            $plain = sodium_crypto_secretbox_open(
                substr($body, $nonceLength),
                substr($body, 0, $nonceLength),
                $key
            );
            return $plain === false ? null : $plain;
        }
        if ($prefix === 'o') {
            if (strlen($body) <= 28) {
                return null;
            }
            $plain = openssl_decrypt(
                substr($body, 28),
                'aes-256-gcm',
                $key,
                OPENSSL_RAW_DATA,
                substr($body, 0, 12),
                substr($body, 12, 16)
            );
            return $plain === false ? null : $plain;
        }
        return null;
    }

    private static function sodiumReady(): bool
    {
        return extension_loaded('sodium') && defined('SODIUM_CRYPTO_SECRETBOX_NONCEBYTES');
    }

    private static function key(): string
    {
        $key = hex2bin(DRAFT_KEY);
        if ($key === false || strlen($key) !== 32) {
            throw new RuntimeException('DRAFT_KEY must be 64 hex characters');
        }
        if (!self::sodiumReady() && !function_exists('openssl_encrypt')) {
            throw new RuntimeException('The sodium or openssl PHP extension is required');
        }
        return $key;
    }
}
