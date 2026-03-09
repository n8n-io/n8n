import { SandboxManager, type SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import { spawn } from 'child_process';

import type { ExecutionOptions, ExecutionResult, ICommandExecutor } from './ICommandExecutor';

const SANDBOX_CONFIG: SandboxRuntimeConfig = {
	network: {
		allowedDomains: [],
		deniedDomains: [],
	},
	filesystem: {
		denyRead: ['~/.ssh', '~/.gnupg', '/root', '/etc/shadow', '/etc/passwd', '~/.n8n'],
		allowWrite: ['/tmp'],
		denyWrite: [],
	},
};

export class SandboxRuntimeDriver implements ICommandExecutor {
	async initialize(): Promise<void> {
		await SandboxManager.initialize(SANDBOX_CONFIG);
	}

	async execute(options: ExecutionOptions): Promise<ExecutionResult> {
		const { command, timeoutMs = 30_000, env } = options;

		const wrappedCommand = await SandboxManager.wrapWithSandbox(command);

		return await new Promise((resolve, reject) => {
			let stdout = '';
			let stderr = '';

			const child = spawn(wrappedCommand, {
				shell: true,
				stdio: ['ignore', 'pipe', 'pipe'],
				env: env ?? undefined,
			});

			child.stdout.on('data', (data: Buffer) => {
				stdout += data.toString();
			});

			child.stderr.on('data', (data: Buffer) => {
				stderr += data.toString();
			});

			const timer = setTimeout(() => {
				child.kill('SIGKILL');
				reject(new Error(`Command timed out after ${timeoutMs}ms`));
			}, timeoutMs);

			child.on('error', (error) => {
				clearTimeout(timer);
				reject(new Error(`Failed to start sandbox: ${error.message}`));
			});

			child.on('close', (code) => {
				clearTimeout(timer);
				resolve({
					stdout: stdout.trim(),
					stderr: stderr.trim(),
					exitCode: code ?? 0,
				});
			});
		});
	}

	async cleanup(): Promise<void> {
		await SandboxManager.reset();
	}
}
