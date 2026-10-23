import type { Fixtures } from '@playwright/test';
import { Client } from 'langsmith';
import { traceable } from 'langsmith/traceable';

export const LANGSMITH_RUN_ID_ANNOTATION = 'langsmith-run-id';

export type TracedFn = <T>(name: string, fn: () => Promise<T>) => Promise<T>;

export type LangSmithFixtures = {
	traced: TracedFn;
};

export type LangSmithWorkerFixtures = {
	langsmithClient: Client | undefined;
};

export const langsmithFixtures: Fixtures<LangSmithFixtures, LangSmithWorkerFixtures> = {
	langsmithClient: [
		async ({}, use) => {
			const client = process.env.LANGSMITH_API_KEY ? new Client() : undefined;
			await use(client);
			if (client) {
				let timer: NodeJS.Timeout | undefined;
				try {
					await Promise.race([
						client.awaitPendingTraceBatches(),
						new Promise<void>((resolve) => {
							timer = setTimeout(resolve, 30_000);
						}),
					]);
				} finally {
					if (timer) clearTimeout(timer);
				}
			}
		},
		{ scope: 'worker' },
	],

	traced: async ({ langsmithClient }, use, testInfo) => {
		const traced: TracedFn = async (name, fn) => {
			let capturedRunId: string | undefined;
			const wrapped = traceable(fn, {
				name,
				run_type: 'chain',
				client: langsmithClient,
				project_name: process.env.LANGSMITH_PROJECT,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				on_start: (runTree) => {
					capturedRunId = runTree?.id;
				},
			});
			try {
				return await wrapped();
			} finally {
				if (capturedRunId) {
					testInfo.annotations.push({
						type: LANGSMITH_RUN_ID_ANNOTATION,
						description: capturedRunId,
					});
				}
			}
		};
		await use(traced);
	},
};
