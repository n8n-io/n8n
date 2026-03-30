import type { DeepMockProxy } from 'jest-mock-extended';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeSSH } from 'node-ssh';

import { Ssh, ShellType } from '../Ssh.node';

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

	const mockShellTypeDetection = (shellType: ShellType, homeDir = '/home/user') => {
		mockSshInstance.execCommand.mockImplementation(async (command: string) => {
			if (command === 'echo $PSVersionTable') {
				return shellType === ShellType.PowerShell
					? createSSHResponse(0, 'PSVersion 7.0.0')
					: createSSHResponse(1, '', 'command not found');
			}
			if (command === 'ver') {
				return shellType === ShellType.Cmd
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

	describe('Windows cmd', () => {
		beforeEach(() => {
			mockShellTypeDetection(ShellType.Cmd);
			mockNodeParameters({
				resource: 'command',
				operation: 'execute',
				authentication: 'password',
				command: 'dir',
				cwd: 'C:\\Windows\\System32',
			});
		});

		it('should use cd /d for directory changes', async () => {
			await sshNode.execute.call(executeFunctionsMock);

			expect(mockSshInstance.execCommand).toHaveBeenCalledWith(
				'cd /d "C:\\Windows\\System32" && dir',
				{},
			);
		});
	});

	describe('Windows PowerShell', () => {
		beforeEach(() => {
			mockShellTypeDetection(ShellType.PowerShell);
			mockNodeParameters({
				resource: 'command',
				operation: 'execute',
				authentication: 'password',
				command: 'Get-Process',
				cwd: 'C:\\Windows',
			});
		});

		it('should use cwd option for directory changes', async () => {
			await sshNode.execute.call(executeFunctionsMock);

			// Should NOT use cd /d for PowerShell
			const cdCalls = mockSshInstance.execCommand.mock.calls.filter((call) =>
				call[0].includes('cd /d'),
			);
			expect(cdCalls).toHaveLength(0);

			// Should use cwd option instead
			expect(mockSshInstance.execCommand).toHaveBeenCalledWith('Get-Process', {
				cwd: 'C:\\Windows',
			});
		});
	});

	describe('Unix', () => {
		beforeEach(() => {
			mockShellTypeDetection(ShellType.Unix);
			mockNodeParameters({
				resource: 'command',
				operation: 'execute',
				authentication: 'password',
				command: 'ls -la',
				cwd: '/home/user/documents',
			});
		});

		it('should use cwd option for directory changes', async () => {
			await sshNode.execute.call(executeFunctionsMock);

			expect(mockSshInstance.execCommand).toHaveBeenCalledWith('ls -la', {
				cwd: '/home/user/documents',
			});
		});
	});

	describe('Tilde expansion', () => {
		beforeEach(() => {
			mockShellTypeDetection(ShellType.Unix, '/home/testuser');
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

	describe('Shell type detection optimization', () => {
		beforeEach(() => {
			mockShellTypeDetection(ShellType.Unix);
			mockNodeParameters({
				resource: 'command',
				operation: 'execute',
				authentication: 'password',
				command: 'echo test',
				cwd: '/tmp',
			});
		});

		it('should detect shell type only once for multiple items', async () => {
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

			// Count shell detection commands
			const psCheckCalls = mockSshInstance.execCommand.mock.calls.filter(
				(call) => call[0] === 'echo $PSVersionTable',
			);
			const verCalls = mockSshInstance.execCommand.mock.calls.filter((call) => call[0] === 'ver');

			// Shell detection should happen only once at the beginning
			expect(psCheckCalls).toHaveLength(1);
			expect(verCalls).toHaveLength(1);

			// But the actual commands should be executed for each item
			const echoCalls = mockSshInstance.execCommand.mock.calls.filter((call) =>
				call[0].includes('echo test'),
			);
			expect(echoCalls).toHaveLength(5);
		});
	});
});
