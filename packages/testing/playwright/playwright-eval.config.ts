/* eslint-disable import-x/no-default-export */
import { defineConfig } from '@playwright/test';
import os from 'os';

const HAS_LANGSMITH = !!process.env.LANGSMITH_API_KEY;
const IS_CI = !!process.env.CI;

export default defineConfig({
	testDir: 'tests/evals',
	timeout: 5 * 60 * 1000,
	fullyParallel: true,
	workers: IS_CI ? Math.max(2, os.cpus().length - 2) : 4,
	reporter: [
		['list'],
		['html', { outputFolder: 'eval-report', open: 'never' }],
		...(HAS_LANGSMITH ? ([['./reporters/langsmith-eval.ts']] as const) : []),
	],
});
