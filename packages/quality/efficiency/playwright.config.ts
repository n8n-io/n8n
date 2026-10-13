/* eslint-disable import-x/no-default-export */
import { defineQualityConfig } from 'n8n-playwright/config';

const images = [
	{ name: 'n8n', ref: process.env.TEST_IMAGE_N8N ?? 'n8nio/n8n:local' },
	{ name: 'runners', ref: process.env.TEST_IMAGE_RUNNERS ?? 'n8nio/runners:local' },
	{
		name: 'runners-distroless',
		ref: process.env.TEST_IMAGE_RUNNERS_DISTROLESS ?? 'n8nio/runners:local-distroless',
	},
];

export default defineQualityConfig({
	testMatch: '**/*.spec.ts',
	workers: 1,
	timeout: 300_000,
	retries: 0,
	use: { trace: 'off', video: 'off', screenshot: 'off' },
	projects: images.map((image) => ({
		name: `image-efficiency:${image.name}`,
		testDir: './images',
		metadata: { image },
	})),
});
