// Spike: can @playwright/test reproduce the eval CLI's lane model — many concurrent
// REAL builds packed onto a bounded instance pool, with (1) scenarios running on the
// instance that built the workflow and (2) the same case never building twice at once
// on one instance? Each case = one test; build+scenarios run via the real eval library
// (runWorkflowTestCase) on a single acquired instance, so affinity holds by construction.
// The sidecar enforces cap + anti-collision; global-teardown proves it from the log.
// Drive same-case contention with --repeat-each and workers > pool size.

import {
	N8nClient,
	createLogger,
	loadWorkflowTestCasesWithFiles,
	runWorkflowTestCase,
	snapshotWorkflowIds,
} from '@n8n/instance-ai/evaluations';

import { test, expect } from './_pool/fixture';

const logger = createLogger(process.env.EVAL_POOL_VERBOSE === 'true');
const maxCases = Number.parseInt(process.env.EVAL_POOL_MAX_CASES ?? '3', 10);
const timeoutMs = Number.parseInt(process.env.EVAL_POOL_TIMEOUT_MS ?? '480000', 10);
const filter = process.env.EVAL_POOL_FILTER || undefined;

const cases = loadWorkflowTestCasesWithFiles(filter).slice(0, maxCases);
if (cases.length === 0) {
	throw new Error('eval-pool: no test cases loaded (check EVAL_POOL_FILTER / EVAL_POOL_MAX_CASES)');
}

test.describe('eval-pool: real builds across a shared instance pool', () => {
	for (const { testCase, fileSlug } of cases) {
		test(`build:${fileSlug}`, async ({ runOnPooledInstance }) => {
			const result = await runOnPooledInstance(fileSlug, async (url) => {
				const client = new N8nClient(url);
				await client.login();
				const preRunWorkflowIds = await snapshotWorkflowIds(client);
				const r = await runWorkflowTestCase({
					client,
					baseUrl: url,
					testCase,
					timeoutMs,
					createdCredentialIds: new Set<string>(),
					preRunWorkflowIds,
					claimedWorkflowIds: new Set<string>(),
					logger,
					keepWorkflows: false,
				});
				return { result: r, builtUrl: r.n8nBaseUrl };
			});

			// Affinity is enforced by construction (one client = one instance for the
			// build and all its scenarios); assert it held, then surface real build health.
			expect(result.n8nBaseUrl).toBeTruthy();
			expect
				.soft(result.workflowBuildSuccess, `build failed: ${result.buildError ?? ''}`)
				.toBe(true);
		});
	}
});
