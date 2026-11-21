import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { getTimescaleDbConfig } from '../TimescaleDb.node';

describe('TimescaleDb connection config', () => {
	const credentials: ICredentialDataDecryptedObject = {
		host: 'tsdb.example.com',
		port: 5432,
		database: 'metrics',
		user: 'reader',
		password: 'pw',
	};

	it('passes the connection fields through', () => {
		expect(getTimescaleDbConfig({ ...credentials, ssl: 'require' })).toMatchObject(credentials);
	});

	it.each<[string, ICredentialDataDecryptedObject, boolean]>([
		['allow', { ssl: 'allow' }, true],
		['require', { ssl: 'require' }, true],
		['disable', { ssl: 'disable' }, false],
		['no stored value', {}, false],
	])('reads SSL %s with Ignore SSL Issues off', (_name, ssl, expectedSsl) => {
		const config = getTimescaleDbConfig({ ...credentials, allowUnauthorizedCerts: false, ...ssl });

		expect(config.ssl).toBe(expectedSsl);
	});

	it.each<[string, ICredentialDataDecryptedObject]>([
		['no stored value', {}],
		['disable', { ssl: 'disable' }],
		['allow', { ssl: 'allow' }],
		['require', { ssl: 'require' }],
	])(
		'keeps TLS and skips verification with Ignore SSL Issues on, whatever SSL holds (%s)',
		(_name, ssl) => {
			const config = getTimescaleDbConfig({ ...credentials, allowUnauthorizedCerts: true, ...ssl });

			expect(config.ssl).toEqual({ rejectUnauthorized: false });
		},
	);

	// pg reads sslmode only when it builds a libpq connection string, never from a
	// config object, so sending it told the server nothing.
	it('sends no sslmode', () => {
		expect(getTimescaleDbConfig({ ...credentials, ssl: 'require' })).not.toHaveProperty('sslmode');
	});
});
