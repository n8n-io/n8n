import 'reflect-metadata';

// Disable task runners until we have fixed the "run test workflows" test
// to mock the Code Node execution
process.env.N8N_RUNNERS_ENABLED = 'false';
process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'false';
process.env.N8N_VERSION = '0.0.0-test';

// Vitest Compatibility Shim
if (typeof (globalThis as any).vi !== 'undefined') {
	(globalThis as any).jest = (globalThis as any).vi;
}
