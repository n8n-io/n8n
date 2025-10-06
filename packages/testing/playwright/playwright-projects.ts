import type { Project } from '@playwright/test';
import type { N8NConfig } from 'n8n-containers/n8n-test-container-creation';

// Tags that require test containers environment
// These tests won't be run against local
const CONTAINER_ONLY_TAGS = [
	'proxy',
	'multi-node',
	'postgres',
	'queue',
	'multi-main',
	'task-runner',
];
const CONTAINER_ONLY = new RegExp(`@capability:(${CONTAINER_ONLY_TAGS.join('|')})`);

// Tags that need serial execution
// These tests will be run AFTER the first run of the UI tests
// In local run they are a "dependency" which means they will be skipped if earlier tests fail, not ideal but needed for isolation
const SERIAL_EXECUTION = /@db:reset/;

const CONTAINER_CONFIGS: Array<{ name: string; config: N8NConfig }> = [
	{ name: 'standard', config: { proxyServerEnabled: true, taskRunner: true } },
	{ name: 'postgres', config: { proxyServerEnabled: true, postgres: true } },
	{ name: 'queue', config: { proxyServerEnabled: true, queueMode: true } },
	{ name: 'multi-main', config: { proxyServerEnabled: true, queueMode: { mains: 2, workers: 1 } } },
];

export function getProjects(): Project[] {
	const isLocal = !!process.env.N8N_BASE_URL;
	const projects: Project[] = [];

	if (isLocal) {
		projects.push(
			{
				name: 'ui',
				testDir: './tests/ui',
				grepInvert: new RegExp([CONTAINER_ONLY.source, SERIAL_EXECUTION.source].join('|')),
				fullyParallel: true,
				use: { baseURL: process.env.N8N_BASE_URL },
			},
			{
				name: 'ui:isolated',
				testDir: './tests/ui',
				grep: SERIAL_EXECUTION,
				workers: 1,
				use: { baseURL: process.env.N8N_BASE_URL },
			},
		);
	} else {
		for (const { name, config } of CONTAINER_CONFIGS) {
			const grepInvertPatterns = [SERIAL_EXECUTION.source];
			projects.push(
				{
					name: `${name}:ui`,
					testDir: './tests/ui',
					grepInvert: new RegExp(grepInvertPatterns.join('|')),
					timeout: name === 'standard' ? 60000 : 180000, // 60 seconds for standard container test, 180 for containers to allow startup etc
					fullyParallel: true,
					use: { containerConfig: config },
				},
				{
					name: `${name}:ui:isolated`,
					testDir: './tests/ui',
					grep: SERIAL_EXECUTION,
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
		use: { containerConfig: {} },
	});

	return projects;
}
