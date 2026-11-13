import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

// Seed -> Split Out -> If (number == 1) -> A | B, then A and B both feed C's only
// input, and C feeds D. C and D both read the Split Out item behind each of theirs.
const TRIGGER_NAME = 'When clicking ‘Execute workflow’';

type Run = { data: { main: Array<Array<{ json: Record<string, unknown> }>> } };

test.describe(
	'Same slot convergence',
	{
		annotation: [{ type: 'owner', description: 'Core Execution' }],
	},
	() => {
		const runAndRead = async (api: ApiHelpers, workflowFile: string) => {
			const { workflowId } = await api.workflows.importWorkflowFromFile(workflowFile);

			const { executionId } = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const execution = await api.workflows.waitForExecutionById(executionId);

			expect(execution.status).toBe('success');

			const { resultData } = flatted.parse(execution.data);
			return (nodeName: string) =>
				(resultData.runData[nodeName] as Run[]).map((run) =>
					run.data.main[0].map(({ json }) => json),
				);
		};

		// Engine v2 concatenates the branches; v1 runs the node once per branch.
		test('should run a node once on the items of every edge into its input, in edge order @engine:v2-only', async ({
			api,
		}) => {
			const itemsOf = await runAndRead(api, 'Same_slot_convergence.json');

			// One run of C with A's item first, then B's. Inside C, the paired item of
			// B's item leads back to its own Split Out item, not to A's.
			expect(itemsOf('C')).toEqual([
				[
					{ via: 'A', origin: 1 },
					{ via: 'B', origin: 2 },
				],
			]);

			// D walks through C's stored output and still reaches the right item.
			expect(itemsOf('D')).toEqual([
				[
					{ via: 'A', origin: 1 },
					{ via: 'B', origin: 2 },
				],
			]);
		});

		test('should run a node on the items of the live edge when the first edge sends nothing @engine:v2-only', async ({
			api,
		}) => {
			const itemsOf = await runAndRead(api, 'Same_slot_convergence_one_branch.json');

			// Only B fired. C's slot still names A as its source, so B's items carry
			// their own.
			expect(itemsOf('C')).toEqual([[{ via: 'B', origin: 2 }]]);
			expect(itemsOf('D')).toEqual([[{ via: 'B', origin: 2 }]]);
		});
	},
);
