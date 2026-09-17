import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

const localBrowsers = join(__dirname, '.playwright-browsers');
const browsersPath =
	process.env.PLAYWRIGHT_BROWSERS_PATH || (existsSync(localBrowsers) ? localBrowsers : undefined);

// These consumers need Chromium. Keep them separate from browser-free unit jobs.
// eslint-disable-next-line import-x/no-default-export -- Vitest loads a default config export.
export default defineConfig({
	test: {
		include: ['tests/framework/harness-contract.test.ts'],
		fileParallelism: false,
		env: browsersPath ? { PLAYWRIGHT_BROWSERS_PATH: browsersPath } : {},
	},
});
