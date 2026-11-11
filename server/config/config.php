<?php

declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_NAME = 'msf';
const DB_USER = 'root';
const DB_PASS = '';
const DB_CHARSET = 'utf8mb4';

const API_KEY = 'dev-api-key-change-me';

const DRAFT_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const SESSION_TTL = 604800;
const SESSION_COOKIE = 'msf_session';
const STORAGE_DIR = __DIR__ . '/../storage';

const TABLES = [
    'registration' => [
        'name' => 'registration_applications',
        'key' => 'public_key',
        'columns' => [
            'firstname' => 'string',
            'lastname' => 'string',
            'phone' => 'string',
            'gender' => 'string',
            'terms' => 'bool',
            'city' => 'string',
            'district' => 'string',
            'birth_date' => 'string',
            'need_photos' => 'string',
            'doc_type' => 'string',
            'doc_front' => 'file',
            'doc_back' => 'file',
            'profile_photo' => 'file',
            'verification_video' => 'file',
            'page' => 'int',
            'submitted' => 'bool',
        ],
    ],
];
