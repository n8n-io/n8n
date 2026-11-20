import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { getQuestDbConfig } from '../QuestDb.node';

const CA = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAJ3kO1xVQ1ZiMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnRl
-----END CERTIFICATE-----`;

describe('QuestDb connection config', () => {
	const credentials: ICredentialDataDecryptedObject = {
		host: 'questdb.example.com',
		port: 8812,
		database: 'qdb',
		user: 'admin',
		password: 'quest',
	};

	const configFor = (overrides: ICredentialDataDecryptedObject) =>
		getQuestDbConfig({ ...credentials, ...overrides });

	it('passes the connection fields through', () => {
		expect(configFor({ ssl: 'require' })).toMatchObject(credentials);
	});

	it.each<[string, ICredentialDataDecryptedObject]>([
		['disable', { ssl: 'disable' }],
		['no stored value', {}],
	])('attempts no TLS on SSL %s', (_name, ssl) => {
		expect(configFor({ ...ssl, caCertificate: CA, allowUnauthorizedCerts: true }).ssl).toBe(false);
	});

	it.each(['allow', 'require'])(
		'keeps the plain boolean on SSL %s with neither field set',
		(ssl) => {
			expect(configFor({ ssl }).ssl).toBe(true);
		},
	);

	it.each(['allow', 'require'])('verifies against a supplied CA on SSL %s', (ssl) => {
		expect(configFor({ ssl, caCertificate: CA }).ssl).toEqual({ ca: CA });
	});

	it('normalizes a CA pasted as a single line', () => {
		const singleLine = '-----BEGIN CERTIFICATE-----MIIBkTCB-----END CERTIFICATE-----';

		expect(configFor({ ssl: 'require', caCertificate: singleLine }).ssl).toEqual({
			ca: '-----BEGIN CERTIFICATE-----\nMIIBkTCB\n-----END CERTIFICATE-----',
		});
	});

	it('skips verification but keeps TLS when Ignore SSL Issues is on', () => {
		expect(configFor({ ssl: 'require', allowUnauthorizedCerts: true }).ssl).toEqual({
			rejectUnauthorized: false,
		});
	});

	it('carries a CA and skipped verification together', () => {
		expect(
			configFor({ ssl: 'require', caCertificate: CA, allowUnauthorizedCerts: true }).ssl,
		).toEqual({ ca: CA, rejectUnauthorized: false });
	});

	// pg only reads sslmode when it builds a libpq connection string, never from a
	// config object, so sending it told the server nothing.
	it('sends no sslmode', () => {
		expect(configFor({ ssl: 'require' })).not.toHaveProperty('sslmode');
	});
});
