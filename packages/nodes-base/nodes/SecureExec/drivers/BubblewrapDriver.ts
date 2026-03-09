import { spawn } from 'child_process';

import type { ExecutionOptions, ExecutionResult, ICommandExecutor } from './ICommandExecutor';

// Read-only host paths to expose inside the sandbox so common tools are available
const RO_BIND_PATHS = ['/usr', '/lib', '/lib64', '/bin', '/sbin', '/etc/alternatives'];

export class BubblewrapDriver implements ICommandExecutor {
	async execute(options: ExecutionOptions): Promise<ExecutionResult> {
		const { command, workspacePath, timeoutMs = 30_000, env } = options;

		const args: string[] = [
			'--unshare-all',
			'--new-session',
			'--die-with-parent',
			// Minimal proc/dev needed for many CLI tools
			'--proc',
			'/proc',
			'--dev',
			'/dev',
			// Writable tmp
			'--tmpfs',
			'/tmp',
		];

		for (const path of RO_BIND_PATHS) {
			args.push('--ro-bind-try', path, path);
		}

		if (workspacePath) {
			args.push('--bind', workspacePath, '/workspace');
			args.push('--chdir', '/workspace');
		}

		if (env) {
			for (const [key, value] of Object.entries(env)) {
				args.push('--setenv', key, value);
			}
		}

		args.push('--', 'sh', '-c', command);

		return await new Promise((resolve, reject) => {
			const stdout: Buffer[] = [];
			const stderr: Buffer[] = [];

			const child = spawn('bwrap', args, { stdio: ['ignore', 'pipe', 'pipe'] });

			child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
			child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

			const timer = setTimeout(() => {
				child.kill('SIGKILL');
				reject(new Error(`Command timed out after ${timeoutMs}ms`));
			}, timeoutMs);

			child.on('close', (code) => {
				clearTimeout(timer);
				resolve({
					stdout: Buffer.concat(stdout).toString().trim(),
					stderr: Buffer.concat(stderr).toString().trim(),
					exitCode: code ?? 0,
				});
			});

			child.on('error', (error) => {
				clearTimeout(timer);
				reject(new Error(`Failed to start bwrap: ${error.message}`));
			});
		});
	}
}
