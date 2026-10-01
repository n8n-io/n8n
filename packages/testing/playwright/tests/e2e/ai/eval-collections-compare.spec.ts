import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const COLLECTION_ID = 'col-e2e';

// Enable the eval-collections feature surface client-side; all eval REST calls
// are stubbed below, so no backend flag or real eval run is needed.
const requirements: TestRequirements = {
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '084_eval_collections': true }),
	},
};

function caseFor(runId: string, runIndex: number, score: number, question: string, output: string) {
	return {
		id: `${runId}-${runIndex}`,
		testRunId: runId,
		executionId: null,
		status: 'success',
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		runAt: '2026-01-01T00:00:00Z',
		runIndex,
		metrics: { helpfulness: score },
		inputs: { question },
		outputs: { output },
	};
}

// Per-run case executions. The "Capital of France?" case has the largest
// score spread (0.5 → 0.9), so the cases table — sorted by biggest regression
// first — puts it in the top row, which the drilldown assertion relies on.
const CASES: Record<string, Array<ReturnType<typeof caseFor>>> = {
	'run-a': [
		caseFor('run-a', 0, 0.5, 'Capital of France?', 'Paris'),
		caseFor('run-a', 1, 0.8, 'What is 2+2?', '4'),
	],
	'run-b': [
		caseFor('run-b', 0, 0.9, 'Capital of France?', 'The capital of France is Paris.'),
		caseFor('run-b', 1, 0.88, 'What is 2+2?', '2 + 2 equals 4.'),
	],
};

const json = (data: unknown) => ({
	contentType: 'application/json',
	body: JSON.stringify({ data }),
});

test.describe(
	'Eval collection compare view @auth:owner',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		let workflowId: string;

		test.beforeEach(async ({ n8n, setupRequirements }) => {
			await setupRequirements(requirements);

			const workflow = await n8n.api.workflows.createWorkflow({
				name: `Compare E2E ${nanoid()}`,
				nodes: [],
				connections: {},
			});
			workflowId = workflow.id;

			const record = {
				id: COLLECTION_ID,
				name: 'Tone tuning experiment',
				description: null,
				workflowId,
				evaluationConfigId: 'cfg-1',
				createdById: 'owner',
				createdAt: '2026-01-01T00:00:00Z',
				updatedAt: '2026-01-01T00:00:00Z',
				runCount: 2,
			};
			const detail = {
				...record,
				runs: [
					{
						testRunId: 'run-a',
						workflowVersionId: 'v1',
						status: 'completed',
						runAt: '2026-01-01T00:00:00Z',
						completedAt: '2026-01-01T00:05:00Z',
						avgScore: 0.61,
						metrics: { helpfulness: 0.61 },
					},
					{
						testRunId: 'run-b',
						workflowVersionId: 'v2',
						status: 'completed',
						runAt: '2026-01-01T00:00:00Z',
						completedAt: '2026-01-01T00:06:00Z',
						avgScore: 0.89,
						metrics: { helpfulness: 0.89 },
					},
				],
			};
			const insights = {
				generatedAt: '2026-01-01T00:07:00Z',
				modelUsed: 'test',
				status: 'ok',
				insights: {
					winner: {
						versionLabel: 'B',
						headline: 'B wins',
						body: 'Higher helpfulness across cases.',
					},
					regressions: [],
					suggestedNext: {
						headline: 'Try C',
						body: 'Raise the temperature.',
						hypothesis: 'More varied phrasing may help.',
					},
				},
			};

			// The evaluation root view only renders the compare route once the
			// workflow has at least one test run (otherwise it shows the setup
			// wizard), so stub the test-runs list too.
			const testRuns = detail.runs.map((run) => ({
				id: run.testRunId,
				workflowId,
				status: 'completed',
				metrics: run.metrics,
				createdAt: '2026-01-01T00:00:00Z',
				updatedAt: '2026-01-01T00:06:00Z',
				runAt: run.runAt,
				completedAt: run.completedAt,
				collectionId: COLLECTION_ID,
			}));
			await n8n.page.route(
				new RegExp(`/rest/workflows/${workflowId}/test-runs(?!/)`),
				async (route) => await route.fulfill(json(testRuns)),
			);

			// Order doesn't matter — the globs are disjoint (`(?!/)` keeps the detail
			// and list routes from swallowing the /insights and /runs sub-paths).
			await n8n.page.route(
				new RegExp(`/rest/workflows/${workflowId}/eval-collections/${COLLECTION_ID}/insights`),
				async (route) => await route.fulfill(json(insights)),
			);
			await n8n.page.route(
				new RegExp(`/rest/workflows/${workflowId}/eval-collections/${COLLECTION_ID}(?!/)`),
				async (route) => await route.fulfill(json(detail)),
			);
			await n8n.page.route(
				new RegExp(`/rest/workflows/${workflowId}/eval-collections(?!/)`),
				async (route) => await route.fulfill(json([record])),
			);
			await n8n.page.route(
				new RegExp(`/rest/workflows/${workflowId}/test-runs/[^/]+/test-cases`),
				async (route) => {
					const runId =
						route
							.request()
							.url()
							.match(/test-runs\/([^/?]+)\/test-cases/)?.[1] ?? '';
					await route.fulfill(json(CASES[runId] ?? []));
				},
			);
		});

		test('renders the hero and cases table, and drills into per-version outputs', async ({
			n8n,
		}) => {
			const compare = n8n.evaluationCompare;
			await compare.goto(workflowId, COLLECTION_ID);

			await expect(compare.getHeader()).toContainText('Tone tuning experiment');
			await expect(compare.getScoreChart()).toBeVisible();
			await expect(compare.getTabs()).toBeVisible();
			// Cases tab (default) lists both seeded cases by their input.
			await expect(compare.getCasesTable()).toContainText('Capital of France?');
			await expect(compare.getCasesTable()).toContainText('What is 2+2?');

			// Drilling into a case row jumps to the side-by-side outputs, showing
			// each version's distinct answer for that case.
			await compare.openCase(0);
			await expect(compare.getOutputsTab()).toBeVisible();
			await expect(compare.getOutputsTab()).toContainText('Paris');
			await expect(compare.getOutputsTab()).toContainText('The capital of France is Paris.');
		});

		test('surfaces a dataset-mismatch banner when run case counts diverge', async ({ n8n }) => {
			// Re-stub run-b with a single case so the counts diverge (2 vs 1). A
			// later route registration takes precedence in Playwright.
			await n8n.page.route(
				new RegExp(`/rest/workflows/${workflowId}/test-runs/[^/]+/test-cases`),
				async (route) => {
					const runId =
						route
							.request()
							.url()
							.match(/test-runs\/([^/?]+)\/test-cases/)?.[1] ?? '';
					const cases = runId === 'run-b' ? CASES['run-b'].slice(0, 1) : (CASES[runId] ?? []);
					await route.fulfill(json(cases));
				},
			);

			const compare = n8n.evaluationCompare;
			await compare.goto(workflowId, COLLECTION_ID);

			await expect(compare.getDatasetMismatchBanner()).toBeVisible();
		});
	},
);
