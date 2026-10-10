import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import type { Options, ProcessOutput, ProcessPromise } from 'zx';

import { expect, test as base } from '../quality-test';

export { expect } from '../quality-test';

export type CliOptions = Partial<Pick<Options, 'cwd' | 'env' | 'timeout'>> & {
	title?: string;
	expectedExitCode?: number;
};

export interface Cli {
	run(command: string, args?: string[], options?: CliOptions): Promise<ProcessOutput>;
}

export const test = base.extend<{ cli: Cli }>({
	cli: async ({}, use) => {
		const processes = new Set<ProcessPromise>();
		const run: Cli['run'] = async (command, args = [], options = {}) => {
			const { title = command, expectedExitCode = 0, ...processOptions } = options;
			return await test.step(scrubSecretsInText(title), async (step) => {
				const { $ } = await import('zx');
				const process = $({ ...processOptions, verbose: false, quiet: true, nothrow: true })`${[
					command,
					...args,
				]}`;
				processes.add(process);
				const result = await process.finally(() => processes.delete(process));

				await step.attach('command', {
					body: scrubSecretsInText(
						JSON.stringify(
							{ command, args, exitCode: result.exitCode, signal: result.signal },
							null,
							2,
						),
					),
					contentType: 'application/json',
				});
				await step.attach('command-stdout', {
					body: scrubSecretsInText(result.stdout),
					contentType: 'text/plain',
				});
				await step.attach('command-stderr', {
					body: scrubSecretsInText(result.stderr),
					contentType: 'text/plain',
				});
				expect(result.exitCode, `${command} exit code`).toBe(expectedExitCode);
				return result;
			});
		};

		try {
			await use({ run });
		} finally {
			await Promise.all([...processes].map(async (process) => await process.kill('SIGKILL')));
			await Promise.allSettled(processes);
		}
	},
});
