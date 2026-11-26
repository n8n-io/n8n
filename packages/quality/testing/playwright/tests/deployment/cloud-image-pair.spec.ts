import { test } from '@playwright/test';

import { assertDistrolessRunner, assertPointerCompression, runDeploymentCell } from './probe';

test(
	'Cloud image pair (-pc + distroless)',
	{
		tag: '@cell:CRT-01',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			probe: async ({ probe }) => await probe.runCodeNodes({ python: true }),
			check: async ({ stack }) => {
				assertDistrolessRunner(stack);
				await assertPointerCompression(stack);
			},
		});
	},
);
