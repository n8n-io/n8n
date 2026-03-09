import { spawn } from 'child_process';
import crypto from 'crypto';

import type { ExecutionOptions, ExecutionResult, ICommandExecutor } from './ICommandExecutor';

export class DockerDriver implements ICommandExecutor {
	async execute(options: ExecutionOptions): Promise<ExecutionResult> {
		const {
			command,
			workspacePath,
			timeoutMs = 30_000,
			env,
			memoryMB = 512,
			containerImage = 'ubuntu:24.04',
		} = options;

		const containerName = `n8n-secureexec-${crypto.randomBytes(8).toString('hex')}`;

		const args: string[] = [
			'run',
			'--rm',
			'--name',
			containerName,
			'--network=none',
			`--memory=${memoryMB}m`,
			'--memory-swap=-1',
			'--cpus=1',
			'--read-only',
			'--tmpfs=/tmp:rw,noexec,nosuid,size=64m',
			'--security-opt=no-new-privileges',
		];

		if (workspacePath) {
			args.push(`--volume=${workspacePath}:/workspace:rw`);
			args.push('--workdir=/workspace');
		}

		if (env) {
			for (const [key, value] of Object.entries(env)) {
				args.push(`--env=${key}=${value}`);
			}
		}

		args.push(containerImage, 'sh', '-c', command);

		return await new Promise((resolve, reject) => {
			const stdout: Buffer[] = [];
			const stderr: Buffer[] = [];

			const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });

			child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
			child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

			const timer = setTimeout(() => {
				child.kill('SIGKILL');
				spawn('docker', ['kill', containerName]).unref();
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

			child.on('error', (err) => {
				clearTimeout(timer);
				reject(new Error(`Failed to start docker: ${err.message}`));
			});
		});
	}
}
