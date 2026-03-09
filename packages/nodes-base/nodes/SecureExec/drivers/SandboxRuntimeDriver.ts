import { SandboxManager, type SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import { spawn } from 'child_process';

import type { ExecutionOptions, ExecutionResult, ICommandExecutor } from './ICommandExecutor';

/**
 * Sandbox configuration used by this driver.
 *
 * - Network: fully blocked (no allowed domains).
 * - Filesystem reads: deny well-known sensitive credential/key directories.
 *   The sandbox-runtime also enforces its own mandatory deny list for dotfiles
 *   such as .bashrc, .gitconfig, .git/hooks, etc.
 *   NOTE: On Linux (bubblewrap), every denyRead path must exist on the host,
 *   otherwise bwrap fails. We only list paths that are reliably present.
 * - Filesystem writes: only /tmp is writable.
 */
const SANDBOX_CONFIG: SandboxRuntimeConfig = {
	network: {
		allowedDomains: [],
		deniedDomains: [],
	},
	filesystem: {
		denyRead: ['~/.ssh', '~/.gnupg', '/root', '/etc/shadow', '/etc/passwd'],
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
				// TODO: for now merge two envs, but I don't think we should copy over the env of the original process
				env: env ? { ...process.env, ...env } : process.env,
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
