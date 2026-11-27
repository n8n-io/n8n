import { expect, test } from '@playwright/test';

import { assertN8nImage, runDeploymentCell } from './probe';

test(
	'Internal task runner',
	{
		tag: '@cell:ENV-02',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: {
				env: {
					N8N_RUNNERS_MODE: 'internal',
				},
			},
			probe: async ({ probe }) => await probe.runCodeNodes(),
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);
				expect(
					stack.findContainers(/task-runner/).map((container) => container.getName()),
					'Expected no external task-runner container in the stack',
				).toEqual([]);
				expect(
					stack.serviceResults.taskRunner,
					'Expected no external task-runner service in the stack',
				).toBeUndefined();
				expect(
					probeOutput.js.responseBody,
					'Expected JavaScript Code node to complete',
				).toMatchObject({
					runtime: 'js',
					result: 42,
				});
			},
		});
	},
);
