import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildManifest, extractDeprecations, extractEnvVars } from './env-vars-manifest.mjs';

test('extracts name, jsdoc, type, default, schema and deprecation from @Env properties', () => {
	const source = `
		/** Runner settings. */
		@Config
		export class TaskRunnersConfig {
			/** Port the broker listens on. */
			@Env('N8N_RUNNERS_BROKER_PORT')
			port: number = 5679;

			/**
			 * Runner mode.
			 * @deprecated Use external.
			 */
			@Env('N8N_RUNNERS_MODE', runnerModeSchema)
			mode: TaskRunnerMode = 'internal';

			@Nested
			other: OtherConfig;

			notAnEnv = 1;
		}
	`;
	assert.deepEqual(extractEnvVars(source, 'x.ts'), [
		{
			name: 'N8N_RUNNERS_BROKER_PORT',
			description: 'Port the broker listens on.',
			deprecated: undefined,
			type: 'number',
			default: '5679',
			schema: undefined,
			class: 'TaskRunnersConfig',
			classDescription: 'Runner settings.',
			property: 'port',
			file: 'x.ts',
		},
		{
			name: 'N8N_RUNNERS_MODE',
			description: 'Runner mode.',
			deprecated: 'Use external.',
			type: 'TaskRunnerMode',
			default: "'internal'",
			schema: 'runnerModeSchema',
			class: 'TaskRunnersConfig',
			classDescription: 'Runner settings.',
			property: 'mode',
			file: 'x.ts',
		},
	]);
});

test('extracts the deprecation registry', () => {
	const source = `
		const SAFE = 'Remove it.';
		const list = [
			{ envVar: 'A', message: 'Use B instead.' },
			{ envVar: 'C', message: SAFE, checkValue: () => true },
		];
	`;
	assert.deepEqual([...extractDeprecations(source)], [
		['A', 'Use B instead.'],
		['C', 'SAFE'],
	]);
});

test('real manifest covers the main config package and joins deprecations', () => {
	const { vars, n8nVersion } = buildManifest();
	assert.match(n8nVersion, /^\d+\.\d+\.\d+/);
	assert.ok(vars.length > 500, `only ${vars.length} vars found`);
	const mode = vars.find((v) => v.name === 'N8N_RUNNERS_MODE');
	assert.ok(mode?.description);
	assert.ok(mode?.deprecated, 'deprecation from DeprecationService not joined');
	assert.ok(vars.every((v) => /^[A-Z0-9_]+$/.test(v.name)), 'non-env-looking name');
});
