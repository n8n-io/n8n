import type { Project } from '@playwright/test';
import type { N8NConfig } from 'n8n-containers/n8n-test-container-creation';

import { getBackendUrl, getFrontendUrl } from './utils/url-helper';

// Tags that require test containers environment
// These tests won't be run against local
const CONTAINER_ONLY_TAGS = [
	'proxy',
	'postgres',
	'queue',
	'multi-main',
	'task-runner',
	'source-control',
	'email',
	'oidc',
	'observability',
];
const CONTAINER_ONLY = new RegExp(`@capability:(${CONTAINER_ONLY_TAGS.join('|')})`);

// Tags that need serial execution
// These tests will be run AFTER the first run of the E2E tests
// In local run they are a "dependency" which means they will be skipped if earlier tests fail, not ideal but needed for isolation
const SERIAL_EXECUTION = /@db:reset/;

// Routes tests to isolated worker without triggering automatic database resets in fixtures
// Use when tests need worker isolation but have intentional state dependencies (e.g., serial tests sharing data)
const ISOLATED_ONLY = /@isolated/;

const CONTAINER_CONFIGS: Array<{ name: string; config: N8NConfig }> = [
	{ name: 'standard', config: {} },
	{ name: 'postgres', config: { postgres: true } },
	{ name: 'queue', config: { queueMode: true } },
	{ name: 'multi-main', config: { queueMode: { mains: 2, workers: 1 }, observability: true } },
];

export function getProjects(): Project[] {
	const isLocal = !!getBackendUrl();
	const projects: Project[] = [];

	if (isLocal) {
		projects.push(
			{
				name: 'e2e',
				testDir: './tests/e2e',
				grepInvert: new RegExp(
					[CONTAINER_ONLY.source, SERIAL_EXECUTION.source, ISOLATED_ONLY.source].join('|'),
				),
				fullyParallel: true,
				use: { baseURL: getFrontendUrl() },
			},
			{
				name: 'e2e:isolated',
				testDir: './tests/e2e',
				grep: new RegExp([SERIAL_EXECUTION.source, ISOLATED_ONLY.source].join('|')),
				workers: 1,
				use: { baseURL: getFrontendUrl() },
			},
		);
	} else {
		for (const { name, config } of CONTAINER_CONFIGS) {
			const grepInvertPatterns = [SERIAL_EXECUTION.source, ISOLATED_ONLY.source];
			projects.push(
				{
					name: `${name}:e2e`,
					testDir: './tests/e2e',
					grepInvert: new RegExp(grepInvertPatterns.join('|')),
					timeout: name === 'standard' ? 60000 : 180000, // 60 seconds for standard container test, 180 for containers to allow startup etc
					fullyParallel: true,
					use: { containerConfig: config },
				},
				{
					name: `${name}:e2e:isolated`,
					testDir: './tests/e2e',
					grep: new RegExp([SERIAL_EXECUTION.source, ISOLATED_ONLY.source].join('|')),
					workers: 1,
					use: { containerConfig: config },
				},
				{
					name: `${name}:chaos`,
					testDir: './tests/chaos',
					grep: new RegExp(`@mode:${name}`),
					workers: 1,
					timeout: 180000,
					use: { containerConfig: config },
				},
			);
		}
	}

	projects.push({
		name: 'cli-workflows',
		testDir: './tests/cli-workflows',
		fullyParallel: true,
		timeout: 60000,
	});

	projects.push({
		name: 'performance',
		testDir: './tests/performance',
		workers: 1,
		timeout: 300000,
		retries: 0,
		use: {
			// Default container config for performance tests, equivalent to @cloud:starter
			containerConfig: { resourceQuota: { memory: 0.75, cpu: 0.5 }, env: { E2E_TESTS: 'true' } },
		},
	});

	return projects;
}
