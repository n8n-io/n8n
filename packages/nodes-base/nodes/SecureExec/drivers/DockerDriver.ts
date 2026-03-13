import Docker from 'dockerode';
import { PassThrough } from 'stream';

import type { ExecutionOptions, ExecutionResult, ICommandExecutor } from './ICommandExecutor';

export class DockerDriver implements ICommandExecutor {
	private readonly docker = new Docker();

	async execute(options: ExecutionOptions): Promise<ExecutionResult> {
		const {
			command,
			workspacePath,
			timeoutMs = 30_000,
			env,
			memoryMB = 512,
			containerImage = 'busybox:stable',
		} = options;

		/* eslint-disable @typescript-eslint/naming-convention */
		const container = await this.docker.createContainer({
			Image: containerImage,
			Cmd: [
				'sh',
				'-c',
				'if command -v bash > /dev/null 2>&1; then exec bash -o pipefail -c "$1"; else exec sh -c "$1"; fi',
				'--',
				command,
			],
			AttachStdout: true,
			AttachStderr: true,
			WorkingDir: workspacePath || '/workspace',
			Env: env ? Object.entries(env).map(([k, v]) => `${k}=${v}`) : [],
			HostConfig: {
				Binds: [],
				Memory: memoryMB * 1024 * 1024,
				MemorySwap: -1,
				CpuQuota: 100_000,
				CpuPeriod: 100_000,
				NetworkMode: 'none',
				ReadonlyRootfs: true,
				Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=64m' },
				SecurityOpt: ['no-new-privileges'],
			},
		});
		/* eslint-enable @typescript-eslint/naming-convention */

		// Attach before start so we don't miss any output
		const attachStream = await container.attach({ stream: true, stdout: true, stderr: true });

		const stdoutStream = new PassThrough();
		const stderrStream = new PassThrough();
		this.docker.modem.demuxStream(attachStream, stdoutStream, stderrStream);

		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];
		stdoutStream.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
		stderrStream.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

		await container.start();

		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			container.stop({ t: 0 }).catch(() => {});
		}, timeoutMs);

		try {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const result = (await container.wait()) as { StatusCode: number };
			clearTimeout(timer);

			if (timedOut) {
				throw new Error(`Command timed out after ${timeoutMs}ms`);
			}

			return {
				stdout: Buffer.concat(stdoutChunks).toString().trim(),
				stderr: Buffer.concat(stderrChunks).toString().trim(),
				exitCode: result.StatusCode,
			};
		} finally {
			clearTimeout(timer);
			await container.remove({ force: true }).catch(() => {});
		}
	}
}
