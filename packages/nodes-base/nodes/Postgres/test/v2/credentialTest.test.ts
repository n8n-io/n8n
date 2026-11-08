import type { ICredentialTestFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { configurePostgres } from '../../transport';
import type { PgpConnection, PgpDatabase } from '../../v2/helpers/interfaces';
import { postgresConnectionTest } from '../../v2/methods/credentialTest';

vi.mock('../../transport', () => ({ configurePostgres: vi.fn() }));

describe('postgresConnectionTest', () => {
	const context = mockDeep<ICredentialTestFunctions>();
	const db = mockDeep<PgpDatabase>();
	const credential = { id: 'test', name: 'Postgres', type: 'postgres', data: {} };
	const certificateErrorCodes = [
		'DEPTH_ZERO_SELF_SIGNED_CERT',
		'SELF_SIGNED_CERT_IN_CHAIN',
		'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
		'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
	];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(configurePostgres).mockResolvedValue({ db, pgp: {} } as never);
	});

	it.each(certificateErrorCodes)(
		'should explain how to configure the CA certificate for %s',
		async (code) => {
			db.connect.mockRejectedValueOnce(Object.assign(new Error('Certificate error'), { code }));

			const result = await postgresConnectionTest.call(context, credential);

			expect(result).toEqual({
				status: 'Error',
				message:
					'The SSL certificate is not trusted. Add the CA certificate from your database provider to the CA Certificate field.',
			});
		},
	);

	it.each(certificateErrorCodes)(
		'should preserve %s when a CA certificate is configured',
		async (code) => {
			db.connect.mockRejectedValueOnce(Object.assign(new Error('Certificate error'), { code }));

			const result = await postgresConnectionTest.call(context, {
				...credential,
				data: { caCertificate: '-----BEGIN CERTIFICATE----- dGVzdA== -----END CERTIFICATE-----' },
			});

			expect(result).toEqual({ status: 'Error', message: 'Certificate error' });
		},
	);

	it('should explain how to configure the CA certificate when the field is empty', async () => {
		const code = certificateErrorCodes[0];
		db.connect.mockRejectedValueOnce(Object.assign(new Error('Certificate error'), { code }));

		const result = await postgresConnectionTest.call(context, {
			...credential,
			data: { caCertificate: '' },
		});

		expect(result).toEqual({
			status: 'Error',
			message:
				'The SSL certificate is not trusted. Add the CA certificate from your database provider to the CA Certificate field.',
		});
	});

	it('should preserve other TLS errors', async () => {
		db.connect.mockRejectedValueOnce(
			Object.assign(new Error('Certificate has expired'), { code: 'CERT_HAS_EXPIRED' }),
		);

		expect(await postgresConnectionTest.call(context, credential)).toEqual({
			status: 'Error',
			message: 'Certificate has expired',
		});
	});

	it('should release a successful connection', async () => {
		const connection = mockDeep<PgpConnection>();
		db.connect.mockResolvedValueOnce(connection);

		expect(await postgresConnectionTest.call(context, credential)).toEqual({
			status: 'OK',
			message: 'Connection successful!',
		});
		expect(connection.done).toHaveBeenCalledOnce();
	});
});
