import { spawn } from 'child_process';

import type {
	ExecutionOptions,
	ExecutionResult,
	ICommandExecutor,
	IVolumeManager,
	VolumeMetadata,
} from './ICommandExecutor';
import { LocalVolumeManager } from './LocalVolumeManager';

// Read-only host paths to expose inside the sandbox so common tools are available
const RO_BIND_PATHS = ['/usr', '/lib', '/lib64', '/bin', '/sbin', '/etc/alternatives'];

export class BubblewrapDriver implements ICommandExecutor, IVolumeManager {
	private readonly volumeManager = new LocalVolumeManager();

	async execute(options: ExecutionOptions): Promise<ExecutionResult> {
		const { command, workspacePath, timeoutMs = 30_000, env, volumes } = options;

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

		args.push('--tmpfs', '/workspace');
		args.push('--chdir', workspacePath ?? '/workspace');

		if (volumes && volumes.length > 0) {
			for (const mount of volumes) {
				const exists = await this.volumeManager.exists(mount.volumeId);
				if (!exists) {
					throw new Error(`Volume '${mount.volumeId}' not found`);
				}

				const hostPath = this.volumeManager.getDataPath(mount.volumeId);
				if (mount.readOnly) {
					args.push('--ro-bind', hostPath, mount.mountPath);
				} else {
					args.push('--bind', hostPath, mount.mountPath);
				}
			}
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

	async createVolume(name?: string): Promise<VolumeMetadata> {
		return await this.volumeManager.createVolume(name);
	}

	async listVolumes(): Promise<VolumeMetadata[]> {
		return await this.volumeManager.listVolumes();
	}

	async deleteVolume(id: string): Promise<void> {
		await this.volumeManager.deleteVolume(id);
	}
}
