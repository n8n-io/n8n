import type { ICredentialDataDecryptedObject, IExecuteFunctions, INode } from 'n8n-workflow';

const { pgpMock, capturedConfig } = vi.hoisted(() => {
	const capturedConfig: Array<Record<string, unknown>> = [];
	const pgp = Object.assign(
		vi.fn((config: Record<string, unknown>) => {
			capturedConfig.push(config);
			return { $pool: { end: vi.fn() } };
		}),
		{ pg: { types: { builtins: { DATE: 1082, TIMESTAMP: 1114, TIMESTAMPTZ: 1184 } } } },
	);
	return { pgpMock: vi.fn(() => pgp), capturedConfig };
});

vi.mock('pg-promise', () => ({ default: pgpMock }));
vi.mock('../../Postgres/v1/genericFunctions', () => ({
	pgInsert: vi.fn(),
	pgQueryV2: vi.fn().mockResolvedValue([]),
	pgUpdate: vi.fn(),
}));

import { getQuestDbConfig, QuestDb } from '../QuestDb.node';

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
		['a private key', '-----BEGIN PRIVATE KEY-----\nMIIBkTCB\n-----END PRIVATE KEY-----'],
	])(
		'refuses a CA that is %s, instead of failing later in the handshake',
		(_case, caCertificate) => {
			expect(() => configFor({ ssl: 'require', caCertificate })).toThrow(
				'not a valid PEM certificate',
			);
		},
	);

	// pg only reads sslmode when it builds a libpq connection string, never from a
	// config object, so sending it told the server nothing.
	it('sends no sslmode', () => {
		expect(configFor({ ssl: 'require' })).not.toHaveProperty('sslmode');
	});

	describe('through the node', () => {
		const run = async (credentialOverrides: ICredentialDataDecryptedObject) => {
			capturedConfig.length = 0;
			const ctx = {
				getCredentials: vi.fn().mockResolvedValue({ ...credentials, ...credentialOverrides }),
				getNode: vi.fn().mockReturnValue({ typeVersion: 1 } as INode),
				getInputData: vi.fn().mockReturnValue([]),
				getNodeParameter: vi.fn().mockReturnValue('executeQuery'),
				continueOnFail: vi.fn().mockReturnValue(false),
				helpers: { returnJsonArray: vi.fn().mockReturnValue([]) },
			} as unknown as IExecuteFunctions;

			await new QuestDb().execute.call(ctx);
			return capturedConfig.at(-1) as Record<string, unknown>;
		};

		// The helper is only half the contract: what pg-promise receives is what connects.
		it.each<[string, ICredentialDataDecryptedObject, unknown]>([
			['a CA on Require', { ssl: 'require', caCertificate: CA }, { ca: CA }],
			['Disable', { ssl: 'disable' }, false],
			['neither field', { ssl: 'allow' }, true],
		])('hands pg-promise the ssl for %s', async (_case, overrides, expected) => {
			const config = await run(overrides);

			expect(config.ssl).toEqual(expected);
			expect(config).not.toHaveProperty('sslmode');
		});
	});
});
