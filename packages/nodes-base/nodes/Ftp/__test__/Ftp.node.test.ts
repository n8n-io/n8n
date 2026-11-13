import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, NodeExecutionWithMetadata } from 'n8n-workflow';
import type PromiseFtp from 'promise-ftp';
import * as ftpModule from 'promise-ftp';
import type sftp from 'ssh2-sftp-client';
import * as sftpModule from 'ssh2-sftp-client';

import { Ftp } from '../Ftp.node';

vi.mock('promise-ftp');
vi.mock('ssh2-sftp-client');

describe('Ftp', () => {
	const executeFunctions = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		vi.resetAllMocks();

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNode.mockReturnValue({ typeVersion: 1 } as never);
		executeFunctions.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as NodeExecutionWithMetadata[],
		);
	});

	it('should add timeout option with ftp', async () => {
		const connect = vi.fn();
		vi.spyOn(ftpModule, 'default').mockImplementation(function () {
			return {
				connect,
				delete: vi.fn(),
				end: vi.fn(),
			} as unknown as PromiseFtp;
		});
		executeFunctions.getCredentials.mockResolvedValue({
			host: 'test.com',
			port: 21,
			user: 'test',
			password: 'test',
		});
		executeFunctions.getNodeParameter.mockImplementation((parameterName, _idx, defaultValue) => {
			switch (parameterName) {
				case 'operation':
					return 'delete';
				case 'protocol':
					return 'ftp';
				case 'options.timeout':
					return 12345;
				case 'path':
					return '/test/path';
				case 'options':
					return {};
				default:
					return defaultValue;
			}
		});

		await new Ftp().execute.call(executeFunctions);

		expect(connect).toHaveBeenCalledWith(
			expect.objectContaining({
				connTimeout: 12345,
			}),
		);
	});

	it('should add timeout option with sftp without private key', async () => {
		const connect = vi.fn();
		vi.spyOn(sftpModule, 'default').mockImplementation(function () {
			return {
				connect,
				delete: vi.fn(),
				end: vi.fn(),
			} as unknown as sftp;
		});
		executeFunctions.getCredentials.mockResolvedValue({
			host: 'test.com',
			port: 21,
			user: 'test',
			password: 'test',
		});
		executeFunctions.getNodeParameter.mockImplementation((parameterName, _idx, defaultValue) => {
			switch (parameterName) {
				case 'operation':
					return 'delete';
				case 'protocol':
					return 'sftp';
				case 'options.timeout':
					return 12345;
				case 'path':
					return '/test/path';
				case 'options':
					return {};
				default:
					return defaultValue;
			}
		});

		await new Ftp().execute.call(executeFunctions);

		expect(connect).toHaveBeenCalledWith(
			expect.objectContaining({
				readyTimeout: 12345,
			}),
		);
	});

	const setupSftpList = (typeVersion: number, options: { timeout?: number } = {}) => {
		const connect = vi.fn<sftp['connect']>();
		const end = vi.fn();
		const list = vi.fn().mockResolvedValue([
			{
				name: 'file.txt',
				type: '-',
				size: 10,
				accessTime: Date.UTC(2020, 0, 1, 12, 0, 0),
				modifyTime: Date.UTC(2020, 0, 2, 12, 0, 0),
			},
		]);
		vi.spyOn(sftpModule, 'default').mockImplementation(function () {
			return { connect, list, end } as unknown as sftp;
		});
		executeFunctions.getNode.mockReturnValue({ typeVersion } as never);
		executeFunctions.getCredentials.mockResolvedValue({
			host: 'test.com',
			port: 22,
			username: 'test',
			password: 'test',
		});
		executeFunctions.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		executeFunctions.getNodeParameter.mockImplementation((parameterName, _idx, defaultValue) => {
			switch (parameterName) {
				case 'operation':
					return 'list';
				case 'protocol':
					return 'sftp';
				case 'options.timeout':
					return options.timeout ?? defaultValue;
				case 'path':
					return '/test';
				case 'recursive':
					return false;
				case 'options':
					return options;
				default:
					return defaultValue;
			}
		});
		return { connect, list, end };
	};

	it('should return sftp list timestamps as ISO strings on version 1.1', async () => {
		setupSftpList(1.1);

		const result = await new Ftp().execute.call(executeFunctions);

		const item = result[0][0].json;
		expect(item.accessTime).toBe('2020-01-01T12:00:00.000Z');
		expect(item.modifyTime).toBe('2020-01-02T12:00:00.000Z');
	});

	it('should return sftp list timestamps as Date objects on version 1', async () => {
		setupSftpList(1);

		const result = await new Ftp().execute.call(executeFunctions);

		const item = result[0][0].json;
		expect(item.accessTime).toBeInstanceOf(Date);
		expect(item.modifyTime).toBeInstanceOf(Date);
	});

	describe('SFTP handshake timeout', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.clearAllTimers();
			vi.useRealTimers();
		});

		it.each([
			{ scenario: 'a fast handshake with default options', handshakeDuration: 100, options: {} },
			{
				scenario: 'a 30-second handshake with a 40-second timeout',
				handshakeDuration: 30_000,
				options: { timeout: 40_000 },
			},
			{
				scenario: 'a 30-second handshake with default options',
				handshakeDuration: 30_000,
				options: {},
			},
		])('should list files after $scenario', async ({ handshakeDuration, options }) => {
			const { connect, list, end } = setupSftpList(1.1, options);
			// NODE-6082: Model the measured group-exchange handshake duration, not its cause.
			connect.mockImplementation(
				async ({ readyTimeout = 20_000 }) =>
					await new Promise((resolve, reject) => {
						const readyTimer = setTimeout(() => {
							clearTimeout(timeoutTimer);
							resolve(mockDeep<Awaited<ReturnType<sftp['connect']>>>());
						}, handshakeDuration);
						const timeoutTimer = setTimeout(() => {
							clearTimeout(readyTimer);
							reject(new Error('getConnection: Timed out while waiting for handshake'));
						}, readyTimeout);
					}),
			);

			const outcome = new Ftp().execute.call(executeFunctions).then(
				(items) => ({ items }),
				(error: unknown) => ({ error }),
			);
			await vi.advanceTimersByTimeAsync(handshakeDuration);

			expect(await outcome).toEqual({
				items: [
					[
						expect.objectContaining({
							json: expect.objectContaining({ name: 'file.txt', path: '/test/file.txt' }),
						}),
					],
				],
			});
			expect(list).toHaveBeenCalledWith('/test');
			expect(end).toHaveBeenCalledOnce();
		});
	});

	it('should add timeout option with sftp with private key', async () => {
		const connect = vi.fn();
		vi.spyOn(sftpModule, 'default').mockImplementation(function () {
			return {
				connect,
				delete: vi.fn(),
				end: vi.fn(),
			} as unknown as sftp;
		});
		executeFunctions.getCredentials.mockResolvedValue({
			host: 'test.com',
			port: 21,
			user: 'test',
			password: 'test',
			privateKey: 'test-private-key',
			passphrase: 'test-passphrase',
		});
		executeFunctions.getNodeParameter.mockImplementation((parameterName, _idx, defaultValue) => {
			switch (parameterName) {
				case 'operation':
					return 'delete';
				case 'protocol':
					return 'sftp';
				case 'options.timeout':
					return 12345;
				case 'path':
					return '/test/path';
				case 'options':
					return {};
				default:
					return defaultValue;
			}
		});

		await new Ftp().execute.call(executeFunctions);

		expect(connect).toHaveBeenCalledWith(
			expect.objectContaining({
				readyTimeout: 12345,
			}),
		);
	});
});
