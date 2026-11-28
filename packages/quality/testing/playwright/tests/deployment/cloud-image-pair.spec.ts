import { test } from '@playwright/test';

import {
	assertDistrolessRunner,
	assertPointerCompression,
	getExpectedArch,
	runDeploymentCell,
} from './probe';

const runCloudImagePair = async (): Promise<void> => {
	await runDeploymentCell({
		probe: async ({ probe }) => await probe.runCodeNodes({ python: true }),
		check: async ({ stack }) => {
			assertDistrolessRunner(stack);
			await assertPointerCompression(stack);
		},
	});
};

if (getExpectedArch() === 'arm64') {
	test(
		'Cloud image pair (-pc + distroless)',
		{
			tag: ['@cell:CRT-01', '@cell:IMG-04', '@cell:IMG-08'],
			annotation: [{ type: 'owner', description: 'Developer Platform' }],
		},
		runCloudImagePair,
	);
} else {
	test(
		'Cloud image pair (-pc + distroless)',
		{
			tag: '@cell:CRT-01',
			annotation: [{ type: 'owner', description: 'Developer Platform' }],
		},
		runCloudImagePair,
	);
}
