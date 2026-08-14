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

	const setupSftpList = (typeVersion: number) => {
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
			return { connect: vi.fn(), list, end: vi.fn() } as unknown as sftp;
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
				case 'path':
					return '/test';
				case 'recursive':
					return false;
				case 'options':
					return {};
				default:
					return defaultValue;
			}
		});
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
