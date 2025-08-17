import type { DeepMockProxy } from 'jest-mock-extended';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeSSH } from 'node-ssh';

import { Ssh } from '../Ssh.node';

// Mock NodeSSH
jest.mock('node-ssh');
const MockedNodeSSH = NodeSSH as jest.MockedClass<typeof NodeSSH>;

describe('SSH Node', () => {
	let sshNode: Ssh;
	let executeFunctionsMock: DeepMockProxy<IExecuteFunctions>;
	let mockSshInstance: DeepMockProxy<NodeSSH>;

	const createSSHResponse = (code: number, stdout: string, stderr = '') => ({
		code,
		stdout,
		stderr,
		signal: null,
	});

	const mockSSHCommands = (isWindows: boolean, homeDir = '/home/user') => {
		mockSshInstance.execCommand.mockImplementation(async (command: string) => {
			if (command === 'ver') {
				return isWindows
					? createSSHResponse(0, 'Microsoft Windows [Version 10.0.19041.1]')
					: createSSHResponse(1, '', 'command not found');
			}
			if (command === 'echo $HOME') {
				return createSSHResponse(0, homeDir);
			}
			return createSSHResponse(0, '');
		});
	};

	const mockNodeParameters = (params: Record<string, any>) => {
		executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
			return params[parameterName] || null;
		});
	};

	beforeEach(() => {
		jest.clearAllMocks();
		sshNode = new Ssh();
		executeFunctionsMock = mockDeep<IExecuteFunctions>();
		mockSshInstance = mockDeep<NodeSSH>();
		MockedNodeSSH.mockImplementation(() => mockSshInstance);

		// Default mocks
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.getNode.mockReturnValue({
			id: 'test-ssh-node-id',
			name: 'SSH Test',
			type: 'ssh',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		executeFunctionsMock.getCredentials.mockResolvedValue({
			host: 'localhost',
			username: 'testuser',
			password: 'testpass',
			port: 22,
		});
	});

	describe('Windows paths', () => {
		beforeEach(() => {
			mockSSHCommands(true);
			mockNodeParameters({
				resource: 'command',
				operation: 'execute',
				authentication: 'password',
				command: 'dir',
				cwd: 'C:\\Windows\\System32',
			});
		});

		it('should prepend cd /d before command', async () => {
			await sshNode.execute.call(executeFunctionsMock);

			expect(mockSshInstance.execCommand).toHaveBeenCalledWith(
				'cd /d "C:\\Windows\\System32" && dir',
				{},
			);
		});
	});

	describe('Unix paths', () => {
		beforeEach(() => {
			mockSSHCommands(false);
			mockNodeParameters({
				resource: 'command',
				operation: 'execute',
				authentication: 'password',
				command: 'ls -la',
				cwd: '/home/user/documents',
			});
		});

		it('should use cwd option for directory change', async () => {
			await sshNode.execute.call(executeFunctionsMock);

			expect(mockSshInstance.execCommand).toHaveBeenCalledWith('ls -la', {
				cwd: '/home/user/documents',
			});
		});
	});

	describe('Tilde expansion', () => {
		beforeEach(() => {
			mockSSHCommands(false, '/home/testuser');
			mockNodeParameters({
				resource: 'command',
				operation: 'execute',
				authentication: 'password',
				command: 'pwd',
				cwd: '~/documents',
			});
		});

		it('should expand ~/ to home directory', async () => {
			await sshNode.execute.call(executeFunctionsMock);

			expect(mockSshInstance.execCommand).toHaveBeenCalledWith('pwd', {
				cwd: '/home/testuser/documents',
			});
		});
	});

	describe('OS detection optimization', () => {
		beforeEach(() => {
			mockSSHCommands(false);
			mockNodeParameters({
				resource: 'command',
				operation: 'execute',
				authentication: 'password',
				command: 'echo test',
				cwd: '/tmp',
			});
		});

		it('should detect OS only once for multiple items', async () => {
			// Setup multiple items to process
			executeFunctionsMock.getInputData.mockReturnValue([
				{ json: { id: 1 } },
				{ json: { id: 2 } },
				{ json: { id: 3 } },
				{ json: { id: 4 } },
				{ json: { id: 5 } },
			]);

			// Mock getNodeParameter to return values for each item
			executeFunctionsMock.getNodeParameter.mockImplementation(
				(parameterName: string, itemIndex: number) => {
					if (parameterName === 'resource') return 'command';
					if (parameterName === 'operation') return 'execute';
					if (parameterName === 'authentication') return 'password';
					if (parameterName === 'command') return `echo test${itemIndex}`;
					if (parameterName === 'cwd') return '/tmp';
					return null;
				},
			);

			await sshNode.execute.call(executeFunctionsMock);

			// Count how many times 'ver' command was called (OS detection)
			const verCalls = mockSshInstance.execCommand.mock.calls.filter((call) => call[0] === 'ver');

			// Should be called only once, not 5 times
			expect(verCalls).toHaveLength(1);

			// But the actual commands should be executed for each item
			const echoCalls = mockSshInstance.execCommand.mock.calls.filter((call) =>
				call[0].includes('echo test'),
			);
			expect(echoCalls).toHaveLength(5);
		});
	});
});
