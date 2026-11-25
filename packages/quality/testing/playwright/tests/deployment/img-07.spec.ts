import { test } from '@playwright/test';

import { assertDistrolessRunner, assertN8nImage, runDeploymentCell } from './probe';

test(
	'IMG-07 · Distroless task runner',
	{
		tag: '@cell:IMG-07',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			probe: async ({ probe }) => await probe.p3({ python: true }),
			check: async ({ stack }) => {
				assertN8nImage(stack);
				assertDistrolessRunner(stack);
			},
		});
	},
);
