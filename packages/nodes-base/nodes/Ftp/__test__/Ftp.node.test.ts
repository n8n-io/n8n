import { mockDeep } from 'vitest-mock-extended';
import type { WriteStream } from 'fs';
import { readFile } from 'fs/promises';
import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	INodeExecutionData,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';
import type PromiseFtp from 'promise-ftp';
import * as ftpModule from 'promise-ftp';
import type sftp from 'ssh2-sftp-client';
import * as sftpModule from 'ssh2-sftp-client';
import { finished } from 'stream/promises';

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

	const setupSftpExecution = (
		typeVersion: number,
		options: { timeout?: number } = {},
		operation = 'list',
	) => {
		const connect = vi.fn<sftp['connect']>();
		const end = vi.fn();
		const get = vi.fn<sftp['get']>();
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
			return { connect, list, get, end } as unknown as sftp;
		});
		executeFunctions.getNode.mockReturnValue({ typeVersion } as never);
		executeFunctions.getCredentials.mockResolvedValue({
			host: 'test.com',
			port: 22,
			username: 'test',
			password: 'test',
		});
		executeFunctions.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) =>
				json.json ? (json as INodeExecutionData) : { json },
			),
		);
		executeFunctions.getNodeParameter.mockImplementation((parameterName, _idx, defaultValue) => {
			switch (parameterName) {
				case 'operation':
					return operation;
				case 'protocol':
					return 'sftp';
				case 'options.timeout':
					return options.timeout ?? defaultValue;
				case 'path':
					return operation === 'download' ? '/test/file.txt' : '/test';
				case 'binaryPropertyName':
					return 'data';
				case 'recursive':
					return false;
				case 'options':
					return options;
				default:
					return defaultValue;
			}
		});
		return { connect, list, get, end };
	};

	it('should return sftp list timestamps as ISO strings on version 1.1', async () => {
		setupSftpExecution(1.1);

		const result = await new Ftp().execute.call(executeFunctions);

		const item = result[0][0].json;
		expect(item.accessTime).toBe('2020-01-01T12:00:00.000Z');
		expect(item.modifyTime).toBe('2020-01-02T12:00:00.000Z');
	});

	it('should return sftp list timestamps as Date objects on version 1', async () => {
		setupSftpExecution(1);

		const result = await new Ftp().execute.call(executeFunctions);

		const item = result[0][0].json;
		expect(item.accessTime).toBeInstanceOf(Date);
		expect(item.modifyTime).toBeInstanceOf(Date);
	});

	describe('SFTP handshake timeout', () => {
		// NODE-6082: Model the measured group-exchange handshake duration, not its cause.
		const simulateHandshake =
			(handshakeDuration: number): sftp['connect'] =>
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
				});

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
			const { connect, list, end } = setupSftpExecution(1.1, options);
			connect.mockImplementation(simulateHandshake(handshakeDuration));

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

		it.each([undefined, 'test-private-key'])(
			'should download a file after a 30-second handshake with default options and private key %s',
			async (privateKey) => {
				const { connect, get, end } = setupSftpExecution(1.1, {}, 'download');
				executeFunctions.getCredentials.mockResolvedValue({
					host: 'test.com',
					port: 22,
					username: 'test',
					password: 'test',
					privateKey,
				});
				connect.mockImplementation(simulateHandshake(30_000));
				get.mockImplementation(async (_path, destination) => {
					const stream = destination as WriteStream;
					stream.end('file content');
					await finished(stream);
					return stream;
				});
				executeFunctions.nodeHelpers.copyBinaryFile.mockImplementation(async (path, fileName) => ({
					data: (await readFile(path)).toString('base64'),
					mimeType: 'text/plain',
					fileName,
				}));

				const outcome = new Ftp().execute.call(executeFunctions).then(
					(items) => ({ items }),
					(error: unknown) => ({ error }),
				);
				await vi.advanceTimersByTimeAsync(30_000);

				expect(await outcome).toEqual({
					items: [
						[
							expect.objectContaining({
								binary: {
									data: {
										data: Buffer.from('file content').toString('base64'),
										mimeType: 'text/plain',
										fileName: 'file.txt',
									},
								},
							}),
						],
					],
				});
				expect(get).toHaveBeenCalledWith('/test/file.txt', expect.anything());
				expect(end).toHaveBeenCalledOnce();
			},
		);

		it.each([undefined, 'test-private-key'])(
			'should validate credentials after a 30-second handshake with private key %s',
			async (privateKey) => {
				const { connect, end } = setupSftpExecution(1.1);
				connect.mockImplementation(simulateHandshake(30_000));

				const outcome = new Ftp().methods.credentialTest.sftpConnectionTest.call(
					mockDeep<ICredentialTestFunctions>(),
					mockDeep<ICredentialsDecrypted>({
						data: {
							host: 'test.com',
							port: 22,
							username: 'test',
							password: 'test',
							privateKey,
						},
					}),
				);
				await vi.advanceTimersByTimeAsync(30_000);

				expect(await outcome).toEqual({ status: 'OK', message: 'Connection successful!' });
				expect(end).toHaveBeenCalledOnce();
			},
		);

		it.each([
			{ scenario: 'the default timeout', options: {}, timeout: 60_000 },
			{ scenario: 'an explicit shorter timeout', options: { timeout: 30_000 }, timeout: 30_000 },
		])('should stop waiting after $scenario', async ({ options, timeout }) => {
			const { connect, list, end } = setupSftpExecution(1.1, options);
			connect.mockImplementation(simulateHandshake(timeout + 1));

			const outcome = new Ftp().execute.call(executeFunctions).catch((error: unknown) => error);
			const settled = vi.fn();
			void outcome.then(settled);
			await vi.advanceTimersByTimeAsync(timeout - 1);
			expect(settled).not.toHaveBeenCalled();
			await vi.advanceTimersByTimeAsync(1);

			expect(await outcome).toEqual(
				new Error('getConnection: Timed out while waiting for handshake'),
			);
			expect(list).not.toHaveBeenCalled();
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
