import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';

// Seed -> Split Out (items 1 and 2) -> If (number == 1) -> A | B, then A and B
// both feed C's only input, and C feeds D.
const WORKFLOW_FILE = 'Convergence_runs_per_branch.json';
const TRIGGER_NAME = 'When clicking ‘Execute workflow’';

type Run = { data: { main: Array<Array<{ json: Record<string, unknown> }>> } };

test.describe(
	'Convergence on one input',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should run a node once per branch that converges on its input, and the tail once per run @engine:v2', async ({
			api,
		}) => {
			const { workflowId } = await api.workflows.importWorkflowFromFile(WORKFLOW_FILE);

			const { executionId } = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const execution = await api.workflows.waitForExecutionById(executionId);

			expect(execution.status).toBe('success');

			const { resultData } = flatted.parse(execution.data);
			const itemsOf = (nodeName: string) =>
				(resultData.runData[nodeName] as Run[]).map((run) =>
					run.data.main[0].map(({ json }) => json),
				);

			// The If sent one item down each branch, so both edges into C were live and
			// C ran once per branch, each run on its own item.
			expect(itemsOf('C')).toEqual([
				[{ via: 'A', run: 0, number: 1 }],
				[{ via: 'B', run: 1, number: 2 }],
			]);

			// D ran once per run of C, and each run's paired item leads back to the run
			// of C that fed it.
			expect(itemsOf('D')).toEqual([[{ fromC: 'A' }], [{ fromC: 'B' }]]);
		});
	},
);
