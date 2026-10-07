import { describe, expect, test } from 'vitest';

import { resolveConfig } from './resolve-config';

describe('resolveConfig', () => {
	test('uses the project config when no capability is set', () => {
		const config = resolveConfig({ postgres: true, workers: 1 }, undefined, {});

		expect(config).toMatchObject({ postgres: true, workers: 1, services: [] });
	});

	test('merges a named capability over the project config', () => {
		const config = resolveConfig({ services: ['proxy'] }, 'email', {});

		expect(config.services).toEqual(['proxy', 'mailpit']);
	});

	test('lets a capability object override topology', () => {
		const config = resolveConfig({ mains: 2, workers: 1 }, { mains: 1, workers: 0 }, {});

		expect(config).toMatchObject({ mains: 1, workers: 0 });
	});

	test('orders env as global, then project, then capability', () => {
		const config = resolveConfig(
			{ env: { A: 'project', B: 'project' } },
			{ env: { B: 'capability' } },
			{ N8N_TEST_ENV: JSON.stringify({ A: 'global', C: 'global' }) },
		);

		expect(config.env).toMatchObject({ A: 'project', B: 'capability', C: 'global' });
	});

	test('always enables the test controller', () => {
		const config = resolveConfig({ env: { E2E_TESTS: 'false' } }, undefined, {});

		expect(config.env).toMatchObject({ E2E_TESTS: 'true', N8N_RESTRICT_FILE_ACCESS_TO: '' });
	});

	test('ignores an invalid global env', () => {
		const config = resolveConfig({}, undefined, { N8N_TEST_ENV: '{not json' });

		expect(config.env).toEqual({ E2E_TESTS: 'true', N8N_RESTRICT_FILE_ACCESS_TO: '' });
	});

	test('passes the coverage folder to the stack', () => {
		const config = resolveConfig({}, undefined, { N8N_COVERAGE_DIR: '/tmp/coverage' });

		expect(config.coverageHostDir).toBe('/tmp/coverage');
	});
});
