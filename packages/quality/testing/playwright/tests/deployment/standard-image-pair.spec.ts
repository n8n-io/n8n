import { test } from '@playwright/test';

import { assertN8nImage, assertStandardRunner, getExpectedArch, runDeploymentCell } from './probe';

const runStandardImagePair = async (): Promise<void> => {
	await runDeploymentCell({
		probe: async ({ probe }) => await probe.runCodeNodes({ python: true }),
		check: async ({ stack }) => {
			assertN8nImage(stack);
			assertStandardRunner(stack);
		},
	});
};

if (getExpectedArch() === 'arm64') {
	test(
		'Standard image pair (n8n + runners)',
		{
			tag: ['@cell:IMG-02', '@cell:IMG-06'],
			annotation: [{ type: 'owner', description: 'Developer Platform' }],
		},
		runStandardImagePair,
	);
} else {
	test(
		'Standard image pair (n8n + runners)',
		{
			tag: ['@cell:IMG-01', '@cell:IMG-05'],
			annotation: [{ type: 'owner', description: 'Developer Platform' }],
		},
		runStandardImagePair,
	);
}
