/**
 * Generates instance-ai eval tests from test case JSON files.
 *
 * Tests are registered in round-robin order across test cases:
 *   1. contact-form / happy-path
 *   2. cross-team / happy-path
 *   3. daily-slack / happy-path
 *   4. form-to-hubspot / happy-path
 *   ...then second scenarios from each, etc.
 *
 * This ordering is intentional — with fullyParallel: true, Playwright assigns
 * tests to workers in declaration order. Round-robin ensures the first N tests
 * go to N different test cases, so workers start building different workflows
 * simultaneously instead of all competing for the same build.
 *
 * Adding a new JSON file to evaluations/data/workflows/ automatically adds
 * its scenarios to the test suite — no code changes needed.
 */

import {
	loadWorkflowTestCases,
	buildWorkflow,
	executeScenario,
} from '@n8n/instance-ai/evaluations';
import { createHash } from 'crypto';

import { getOrBuild } from './build-cache';
import { test, expect } from './fixtures';

export function registerAllEvalTests() {
	const allTestCases = loadWorkflowTestCases();

	test.setTimeout(600_000);

	// Round-robin: first scenario from each test case, then second, etc.
	const maxScenarios = Math.max(...allTestCases.map((tc) => tc.scenarios.length));

	for (let i = 0; i < maxScenarios; i++) {
		for (const testCase of allTestCases) {
			const scenario = testCase.scenarios[i];
			if (!scenario) continue;

			// Use the prompt prefix as a readable label
			const label = testCase.prompt
				.slice(0, 60)
				.replace(/[^a-zA-Z0-9 ]/g, '')
				.trim();

			test(`${label} / ${scenario.name} @instance-ai-workflow-eval`, async ({ evalClient }) => {
				const cacheKey = createHash('sha256').update(testCase.prompt).digest('hex').slice(0, 12);

				const build = await getOrBuild(cacheKey, () =>
					buildWorkflow({
						client: evalClient.n8n,
						prompt: testCase.prompt,
						timeoutMs: 600_000,
						preRunWorkflowIds: evalClient.preRunIds,
						claimedWorkflowIds: evalClient.claimedWorkflowIds,
						logger: evalClient.logger,
					}),
				);

				test.info().annotations.push({
					type: 'eval-build',
					description: JSON.stringify({
						workflowId: build.workflowId,
						success: build.success,
						error: build.error,
					}),
				});

				expect(build.success, build.error ?? 'Workflow build failed').toBe(true);
				const workflowId = build.workflowId;
				expect(workflowId, 'No workflow ID from build').toBeTruthy();

				const sr = await executeScenario(
					evalClient.n8n,
					workflowId as string,
					scenario,
					build.workflowJsons,
					evalClient.logger,
				);

				test.info().annotations.push({
					type: 'eval-scenario',
					description: JSON.stringify({
						name: scenario.name,
						passed: sr.success,
						score: sr.score,
						reasoning: sr.reasoning,
						failureCategory: sr.failureCategory,
						rootCause: sr.rootCause,
					}),
				});

				expect(sr.success, sr.reasoning).toBe(true);
			});
		}
	}
}
