import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { optionsCollection } from '../../v2/actions/common.descriptions';
import type { MysqlNodeCredentials } from '../../v2/helpers/interfaces';

const { createPoolMock } = vi.hoisted(() => ({ createPoolMock: vi.fn().mockReturnValue({}) }));

vi.mock('mysql2/promise', () => ({
	default: { createPool: createPoolMock },
}));

import { createPool } from '../../v2/transport';

const timeoutKey = (optionsCollection.options as INodeProperties[]).find(
	(option) => option.displayName === 'Connection Timeout',
)?.name;

const credentials = (connectTimeout?: number): MysqlNodeCredentials =>
	({
		host: 'localhost',
		port: 3306,
		database: 'db',
		user: 'u',
		password: 'p',
		connectTimeout,
	}) as MysqlNodeCredentials;

const ctx = {} as IExecuteFunctions;

const connectTimeoutSentToMysql2 = () =>
	(createPoolMock.mock.calls[0][0] as { connectTimeout?: number }).connectTimeout;

describe('MySQL v2 / transport / createPool', () => {
	beforeEach(() => {
		createPoolMock.mockClear();
	});

	it('takes the option key from the node description', () => {
		expect(timeoutKey).toBe('connectionTimeout');
	});

	it.each([
		['the option, converted from seconds', undefined, 45, 45_000],
		['the credential, which is already milliseconds', 2_500, undefined, 2_500],
		['the option, over the credential', 2_500, 45, 45_000],
		['nothing, leaving the deadline to mysql2', undefined, undefined, undefined],
		['the credential, because zero is not a deadline', 2_500, 0, 2_500],
		['the credential, because a negative is not a deadline', 2_500, -5, 2_500],
		['the credential, because an expression gave no number', 2_500, NaN, 2_500],
		['the credential, because Infinity is coerced to a 1ms deadline', 2_500, Infinity, 2_500],
	])('sends %s', async (_name, credentialMs, optionSeconds, expected) => {
		await createPool.call(ctx, credentials(credentialMs), {
			...(optionSeconds === undefined ? {} : { [timeoutKey!]: optionSeconds }),
		});

		expect(connectTimeoutSentToMysql2()).toBe(expected);
	});
});
