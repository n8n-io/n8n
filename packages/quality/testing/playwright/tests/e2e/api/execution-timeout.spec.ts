import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

// Manual -> Wait -> Set
const WORKFLOW_FILE = 'Manual_wait_set.json';
const TIMEOUT_SECONDS = 2;
const WAIT_SECONDS = 30;

/** Runs a workflow whose wait outlasts its timeout, and returns the ended execution. */
async function runPastTimeout(api: ApiHelpers) {
	// A wait under 65 seconds stays in the process on the legacy engine, where the
	// timeout can cut it short. A longer wait is suspended there and cancelled only
	// when it resumes, so the legacy engine would show no timeout in time.
	const { workflowId } = await api.workflows.importWorkflowFromFile(WORKFLOW_FILE, {
		transform: (workflow) => ({
			...workflow,
			nodes: workflow.nodes?.map((node) =>
				node.name === 'Wait'
					? { ...node, parameters: { ...node.parameters, amount: WAIT_SECONDS } }
					: node,
			),
			settings: { ...workflow.settings, executionTimeout: TIMEOUT_SECONDS },
		}),
	});

	const { executionId } = await api.workflows.runManually(workflowId, 'Manual');
	const execution = await api.workflows.waitForExecutionById(executionId, 20_000);
	return { execution, resultData: flatted.parse(execution.data).resultData };
}

test.describe(
	'Execution timeout',
	{
		annotation: [{ type: 'owner', description: 'Core Execution' }],
	},
	() => {
		test('should cancel an execution that runs past its workflow timeout @engine:v2', async ({
			api,
		}) => {
			const { execution, resultData } = await runPastTimeout(api);

			expect(execution.status).toBe('canceled');
			// Ended by the timeout, long before the wait would have.
			const ranForMs =
				new Date(execution.stoppedAt!).getTime() - new Date(execution.startedAt!).getTime();
			expect(ranForMs).toBeLessThan(WAIT_SECONDS * 1000);
			expect(resultData.runData.Set).toBeUndefined();
		});

		// The legacy engine stores no timeout error yet (CET-91). Fold this into the
		// test above once it does.
		test('should record that the execution timed out @engine:v2-only', async ({ api }) => {
			const { resultData } = await runPastTimeout(api);

			expect(resultData.error?.message).toBe('The execution was cancelled because it timed out');
		});
	},
);
