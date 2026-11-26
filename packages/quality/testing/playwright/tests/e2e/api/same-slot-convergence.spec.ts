import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

// Seed -> Split Out -> If (number == 1) -> A | B, then A and B both feed C's only
// input, and C feeds D. C and D both read the Split Out item behind each of theirs.
const TRIGGER_NAME = 'When clicking ‘Execute workflow’';

type Run = {
	source: Array<{ previousNode: string } | null>;
	data: { main: Array<Array<{ json: Record<string, unknown> }>> };
};

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
			const runsOf = (nodeName: string) => resultData.runData[nodeName] as Run[];
			return {
				itemsOf: (nodeName: string) =>
					runsOf(nodeName).map((run) => run.data.main[0].map(({ json }) => json)),
				sourcesOf: (nodeName: string) => runsOf(nodeName).map((run) => run.source),
			};
		};

		// Engine v2 concatenates the branches; v1 runs the node once per branch.
		test('should run a node once on the items of every edge into its input, in canvas order @engine:v2-only', async ({
			api,
		}) => {
			const { itemsOf } = await runAndRead(api, 'Same_slot_convergence.json');

			// One run of C with A's item first, then B's, because A is higher on the
			// canvas. B's connection comes first in the workflow. Inside C, each item
			// leads back to its own Split Out item.
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

		test('should run a node on the items of the live edge when the first edge sends nothing @engine:v2', async ({
			api,
		}) => {
			const { itemsOf, sourcesOf } = await runAndRead(api, 'Same_slot_convergence_one_branch.json');

			// Only B fired, so C's source is B on both engines. The editor resolves C's
			// expressions through that source.
			expect(itemsOf('C')).toEqual([[{ via: 'B', origin: 2, prevNode: 'B' }]]);
			expect(sourcesOf('C')).toEqual([[expect.objectContaining({ previousNode: 'B' })]]);
			expect(itemsOf('D')).toEqual([[{ via: 'B', origin: 2 }]]);
		});
	},
);
