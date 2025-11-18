import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, NodeExecutionWithMetadata } from 'n8n-workflow';
import type PromiseFtp from 'promise-ftp';
import * as ftpModule from 'promise-ftp';
import type sftp from 'ssh2-sftp-client';
import * as sftpModule from 'ssh2-sftp-client';

import { Ftp } from '../Ftp.node';

jest.mock('promise-ftp');
jest.mock('ssh2-sftp-client');

describe('Ftp', () => {
	const executeFunctions = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		jest.resetAllMocks();

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as NodeExecutionWithMetadata[],
		);
	});

	it('should add timeout option with ftp', async () => {
		const connect = jest.fn();
		jest.spyOn(ftpModule, 'default').mockImplementation(
			() =>
				({
					connect,
					delete: jest.fn(),
					end: jest.fn(),
				}) as unknown as PromiseFtp,
		);
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
		const connect = jest.fn();
		jest.spyOn(sftpModule, 'default').mockImplementation(
			() =>
				({
					connect,
					delete: jest.fn(),
					end: jest.fn(),
				}) as unknown as sftp,
		);
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

	it('should add timeout option with sftp with private key', async () => {
		const connect = jest.fn();
		jest.spyOn(sftpModule, 'default').mockImplementation(
			() =>
				({
					connect,
					delete: jest.fn(),
					end: jest.fn(),
				}) as unknown as sftp,
		);
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
