import { exec } from 'child_process';

import type { ExecutionOptions, ExecutionResult, ICommandExecutor } from './ICommandExecutor';

export class HostDriver implements ICommandExecutor {
	async execute(options: ExecutionOptions): Promise<ExecutionResult> {
		const { command, workspacePath, timeoutMs = 30_000, env } = options;

		return await new Promise((resolve, reject) => {
			const child = exec(
				command,
				{
					cwd: workspacePath ?? process.cwd(),
					timeout: timeoutMs,
					env: env ? { ...process.env, ...env } : process.env,
				},
				(error, stdout, stderr) => {
					if (error?.killed) {
						reject(new Error(`Command timed out after ${timeoutMs}ms`));
						return;
					}
					resolve({
						stdout: stdout.trim(),
						stderr: stderr.trim(),
						exitCode: error?.code ?? 0,
					});
				},
			);

			child.on('exit', (_code, _signal) => {});
		});
	}
}
