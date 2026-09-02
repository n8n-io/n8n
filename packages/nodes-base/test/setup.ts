import 'reflect-metadata';
import nock from 'nock';

process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'false';
process.env.N8N_VERSION = '0.0.0-test';
// Disable file access restrictions for tests so they can read/write test files
process.env.N8N_RESTRICT_FILE_ACCESS_TO = '';

// Block real network access. Runs per worker (setupFiles), unlike a global setup which
// would only configure nock in the main process and leave workers able to hit the network.
nock.disableNetConnect();
nock.emitter.on('no match', (req) => {
	console.error('No mock for network request: ', req);
});
