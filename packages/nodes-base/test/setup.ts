import 'reflect-metadata';

process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'false';
process.env.N8N_VERSION = '0.0.0-test';
// Disable file access restrictions for tests so they can read/write test files
process.env.N8N_RESTRICT_FILE_ACCESS_TO = '';
