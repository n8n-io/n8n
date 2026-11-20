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

	it('refuses a CA together with skipped verification, which would ignore it', () => {
		expect(() =>
			configFor({ ssl: 'require', caCertificate: CA, allowUnauthorizedCerts: true }),
		).toThrow('Set a CA Certificate or Ignore SSL Issues, not both');
	});

	it.each([
		['blank', ''],
		['only whitespace', '   '],
	])('treats a %s CA as unset', (_case, caCertificate) => {
		expect(configFor({ ssl: 'require', caCertificate }).ssl).toBe(true);
	});

	it.each([
		['a fingerprint', 'AA:BB:CC:DD'],
		['a truncated paste', '-----BEGIN CERTIFICATE-----\nMIIBkTCB'],
	])(
		'refuses a CA that is %s, instead of failing later in the handshake',
		(_case, caCertificate) => {
			expect(() => configFor({ ssl: 'require', caCertificate })).toThrow('not a valid PEM block');
		},
	);

	// pg only reads sslmode when it builds a libpq connection string, never from a
	// config object, so sending it told the server nothing.
	it('sends no sslmode', () => {
		expect(configFor({ ssl: 'require' })).not.toHaveProperty('sslmode');
	});
});
