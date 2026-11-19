import type { IExecuteFunctions } from 'n8n-workflow';

import type { MysqlNodeCredentials } from '../../v2/helpers/interfaces';

const { createPoolMock } = vi.hoisted(() => ({ createPoolMock: vi.fn().mockReturnValue({}) }));

vi.mock('mysql2/promise', () => ({
	default: { createPool: createPoolMock },
}));

import { createPool } from '../../v2/transport';

const credentials = (overrides: Partial<MysqlNodeCredentials> = {}): MysqlNodeCredentials =>
	({
		host: 'localhost',
		port: 3306,
		database: 'test_db',
		user: 'root',
		password: 'password',
		...overrides,
	}) as MysqlNodeCredentials;

const ctx = {} as IExecuteFunctions;

const poolOptions = () => createPoolMock.mock.calls[0][0] as { connectTimeout?: number };

describe('MySQL v2 / transport / createPool', () => {
	beforeEach(() => {
		createPoolMock.mockClear();
	});

	it('sends the Connection Timeout the user set, converted from seconds', async () => {
		await createPool.call(ctx, credentials(), { connectionTimeout: 45 });

		expect(poolOptions().connectTimeout).toBe(45_000);
	});

	it('falls back to the Connect Timeout of the credential, which is already milliseconds', async () => {
		await createPool.call(ctx, credentials({ connectTimeout: 2_500 }), {});

		expect(poolOptions().connectTimeout).toBe(2_500);
	});

	it('lets the option of the node beat the credential', async () => {
		await createPool.call(ctx, credentials({ connectTimeout: 2_500 }), { connectionTimeout: 45 });

		expect(poolOptions().connectTimeout).toBe(45_000);
	});

	it('leaves the deadline to mysql2 when neither is set', async () => {
		await createPool.call(ctx, credentials(), {});

		expect(poolOptions().connectTimeout).toBeUndefined();
	});
});
