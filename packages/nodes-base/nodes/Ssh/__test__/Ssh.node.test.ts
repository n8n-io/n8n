import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { Ssh } from '../Ssh.node';

// Mock node-ssh module
const mockConnect = jest.fn();
const mockDispose = jest.fn();
const mockExecCommand = jest.fn();

jest.mock('node-ssh', () => ({
	NodeSSH: jest.fn().mockImplementation(() => ({
		connect: mockConnect,
		dispose: mockDispose,
		execCommand: mockExecCommand,
	})),
}));

describe('Ssh Node', () => {
	const executeFunctions = mockDeep<IExecuteFunctions>();
	let sshNode: Ssh;

	beforeEach(() => {
		jest.clearAllMocks();
		sshNode = new Ssh();

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((parameterName, _idx, defaultValue) => {
			switch (parameterName) {
				case 'resource':
					return 'command';
				case 'operation':
					return 'execute';
				case 'authentication':
					return 'password';
				case 'command':
					return 'echo hello';
				case 'cwd':
					return '/';
				default:
					return defaultValue;
			}
		});

		executeFunctions.getCredentials.mockResolvedValue({
			host: 'test.example.com',
			port: 22,
			username: 'testuser',
			password: 'testpass',
		});

		// Default: continueOnFail is false
		executeFunctions.continueOnFail.mockReturnValue(false);
	});

	describe('Connection Error Handling', () => {
		it('should return error in output when SSH connection fails and continueOnFail is true', async () => {
			executeFunctions.continueOnFail.mockReturnValue(true);
			const errorMessage = 'Timed out while waiting for handshake';
			mockConnect.mockRejectedValueOnce(new Error(errorMessage));

			const result = await sshNode.execute.call(executeFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('error', errorMessage);
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
			expect(mockDispose).toHaveBeenCalled();
		});

		it('should throw error when SSH connection fails and continueOnFail is false', async () => {
			executeFunctions.continueOnFail.mockReturnValue(false);
			const errorMessage = 'Timed out while waiting for handshake';
			mockConnect.mockRejectedValueOnce(new Error(errorMessage));

			await expect(sshNode.execute.call(executeFunctions)).rejects.toThrow(errorMessage);
			expect(mockDispose).toHaveBeenCalled();
		});

		it('should return error for authentication failure when continueOnFail is true', async () => {
			executeFunctions.continueOnFail.mockReturnValue(true);
			const errorMessage = 'All configured authentication methods failed';
			mockConnect.mockRejectedValueOnce(new Error(errorMessage));

			const result = await sshNode.execute.call(executeFunctions);

			expect(result[0][0].json).toHaveProperty('error', errorMessage);
			expect(mockDispose).toHaveBeenCalled();
		});

		it('should return error for network failure when continueOnFail is true', async () => {
			executeFunctions.continueOnFail.mockReturnValue(true);
			const errorMessage = 'connect ECONNREFUSED 192.168.1.1:22';
			mockConnect.mockRejectedValueOnce(new Error(errorMessage));

			const result = await sshNode.execute.call(executeFunctions);

			expect(result[0][0].json).toHaveProperty('error', errorMessage);
			expect(mockDispose).toHaveBeenCalled();
		});

		it('should always dispose SSH connection even when error occurs', async () => {
			executeFunctions.continueOnFail.mockReturnValue(true);
			mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

			await sshNode.execute.call(executeFunctions);

			expect(mockDispose).toHaveBeenCalledTimes(1);
		});
	});

	describe('Successful Command Execution', () => {
		it('should execute command successfully and return output', async () => {
			mockConnect.mockResolvedValueOnce(undefined);
			mockExecCommand.mockResolvedValueOnce({
				stdout: 'hello',
				stderr: '',
				code: 0,
			});

			const result = await sshNode.execute.call(executeFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({
				stdout: 'hello',
				stderr: '',
				code: 0,
			});
			expect(mockConnect).toHaveBeenCalledWith({
				host: 'test.example.com',
				port: 22,
				username: 'testuser',
				password: 'testpass',
			});
			expect(mockExecCommand).toHaveBeenCalledWith('echo hello', { cwd: '/' });
			expect(mockDispose).toHaveBeenCalled();
		});
	});

	describe('Private Key Authentication', () => {
		beforeEach(() => {
			executeFunctions.getNodeParameter.mockImplementation((parameterName, _idx, defaultValue) => {
				switch (parameterName) {
					case 'resource':
						return 'command';
					case 'operation':
						return 'execute';
					case 'authentication':
						return 'privateKey';
					case 'command':
						return 'echo hello';
					case 'cwd':
						return '/';
					default:
						return defaultValue;
				}
			});
		});

		it('should connect using private key authentication', async () => {
			executeFunctions.getCredentials.mockResolvedValue({
				host: 'test.example.com',
				port: 22,
				username: 'testuser',
				privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
				passphrase: 'testpassphrase',
			});

			mockConnect.mockResolvedValueOnce(undefined);
			mockExecCommand.mockResolvedValueOnce({
				stdout: 'hello',
				stderr: '',
				code: 0,
			});

			await sshNode.execute.call(executeFunctions);

			expect(mockConnect).toHaveBeenCalledWith(
				expect.objectContaining({
					host: 'test.example.com',
					port: 22,
					username: 'testuser',
					passphrase: 'testpassphrase',
				}),
			);
		});

		it('should return error when private key authentication fails and continueOnFail is true', async () => {
			executeFunctions.continueOnFail.mockReturnValue(true);
			executeFunctions.getCredentials.mockResolvedValue({
				host: 'test.example.com',
				port: 22,
				username: 'testuser',
				privateKey: 'invalid-key',
			});

			const errorMessage = 'Cannot parse privateKey: Unsupported key format';
			mockConnect.mockRejectedValueOnce(new Error(errorMessage));

			const result = await sshNode.execute.call(executeFunctions);

			expect(result[0][0].json).toHaveProperty('error', errorMessage);
		});
	});
});
