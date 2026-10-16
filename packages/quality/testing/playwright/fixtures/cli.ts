import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import type { Options, Result, Subprocess } from 'execa';

import { expect, test as base } from '../quality-test';

export { expect } from '../quality-test';

export type CliOptions = Pick<Options, 'cwd' | 'env' | 'timeout'> & {
	title?: string;
	expectedExitCode?: number;
};

export interface Cli {
	run(command: string, args?: string[], options?: CliOptions): Promise<Result<{ reject: false }>>;
}

export const test = base.extend<{ cli: Cli }>({
	cli: async ({}, use) => {
		const processes = new Set<Subprocess<{ reject: false }>>();
		const run: Cli['run'] = async (command, args = [], options = {}) => {
			const { title = command, expectedExitCode = 0, ...processOptions } = options;
			return await test.step(scrubSecretsInText(title), async (step) => {
				const { execa } = await import('execa');
				const child = execa(command, args, {
					...processOptions,
					reject: false,
					stripFinalNewline: false,
					killDescendants: true,
				});
				processes.add(child);
				const result = await child.finally(() => processes.delete(child));

				await step.attach('command', {
					body: scrubSecretsInText(
						JSON.stringify(
							{
								command,
								args,
								exitCode: result.exitCode,
								signal: result.signal,
								error: result.shortMessage,
							},
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
			for (const child of processes) child.kill('SIGKILL');
			await Promise.allSettled(processes);
		}
	},
});
