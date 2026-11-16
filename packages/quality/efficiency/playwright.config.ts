/* eslint-disable import-x/no-default-export */
import { defineQualityConfig } from 'n8n-playwright/config';
import type { ContainerWorkerFixtures } from 'n8n-playwright/containers';

const images = [
	{ name: 'n8n', ref: process.env.TEST_IMAGE_N8N ?? 'n8nio/n8n:local' },
	{ name: 'runners', ref: process.env.TEST_IMAGE_RUNNERS ?? 'n8nio/runners:local' },
	{
		name: 'runners-distroless',
		ref: process.env.TEST_IMAGE_RUNNERS_DISTROLESS ?? 'n8nio/runners:local-distroless',
	},
];

export default defineQualityConfig<object, ContainerWorkerFixtures>({
	testMatch: '**/*.spec.ts',
	workers: 1,
	timeout: 300_000,
	retries: 0,
	use: { trace: 'off', video: 'off', screenshot: 'off' },
	projects: [
		...images.map((image) => ({
			name: `image-efficiency:${image.name}`,
			testDir: './images',
			metadata: { image },
		})),
		{
			name: 'memory-baselines',
			testDir: './memory/idle',
			use: {
				containerConfig: { resourceQuota: { memory: 0.75, cpu: 0.5 }, env: { E2E_TESTS: 'true' } },
			},
		},
	],
});
