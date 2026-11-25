import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type EnvVarInfo, extractEnvCatalog } from '../src/env-catalog/extract';
import { rankVars, shortDescription } from '../src/env-catalog/search';

const FIXTURE = `
declare function Env(name: string, schema?: unknown): PropertyDecorator;
declare function Config(target: unknown): void;
class CommaSeparatedStringArray<T> extends Array<T> {}
class ColonSeparatedStringArray<T> extends Array<T> {}
const levels = ['error', 'info'] as const;
const NAMES = { timeout: 'N8N_TIMEOUT' } as const;
type LogLevel = (typeof levels)[number];

@Config
class LoggingConfig {
	/**
	 * Minimum level of logs to output.
	 * Lower levels are dropped.
	 */
	@Env('N8N_LOG_LEVEL')
	level: LogLevel = 'info';

	/** Where to write logs. */
	@Env('N8N_LOG_OUTPUT')
	output: CommaSeparatedStringArray<'console' | 'file'> = ['console'];

	@Env('N8N_PORT')
	port: number = 5 * 60;

	@Env('N8N_FLAG')
	flag: boolean = true;

	@Env('N8N_MAYBE')
	maybe?: number;

	@Env('N8N_NAME')
	name: string = 'n8n';

	@Env('N8N_PATHS')
	paths: ColonSeparatedStringArray<string> = [];

	@Env('N8N_OVERRIDES')
	overrides: Record<string, string> = {};

	@Env(NAMES.timeout)
	timeout: number = 0;

	@Env(
		'N8N_MULTILINE',
	)
	multiline: string = '';

	notAnEnv: string = '';
}

@Config
class OtherConfig {
	@Env('N8N_LOG_LEVEL')
	duplicate: string = '';
}
`;

describe('extractEnvCatalog', () => {
	let root: string;
	let vars: Map<string, EnvVarInfo>;

	beforeAll(() => {
		root = mkdtempSync(join(tmpdir(), 'rig-catalog-'));
		const file = join(root, 'logging.config.ts');
		writeFileSync(file, FIXTURE);
		vars = new Map(extractEnvCatalog(root, [file]).map((v) => [v.name, v]));
	});

	afterAll(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it('should read only @Env properties and keep the documented duplicate', () => {
		expect([...vars.keys()].sort()).toEqual([
			'N8N_FLAG',
			'N8N_LOG_LEVEL',
			'N8N_LOG_OUTPUT',
			'N8N_MAYBE',
			'N8N_MULTILINE',
			'N8N_NAME',
			'N8N_OVERRIDES',
			'N8N_PATHS',
			'N8N_PORT',
			'N8N_TIMEOUT',
		]);
		expect(vars.get('N8N_LOG_LEVEL')).toMatchObject({
			group: 'Logging',
			source: 'logging.config.ts:16',
			description: 'Minimum level of logs to output.\nLower levels are dropped.',
		});
	});

	it('should resolve enums through type aliases', () => {
		expect(vars.get('N8N_LOG_LEVEL')).toMatchObject({
			kind: 'enum',
			options: ['error', 'info'],
			defaultValue: 'info',
		});
	});

	it('should classify lists, numbers, booleans, strings, and JSON', () => {
		expect(vars.get('N8N_LOG_OUTPUT')).toMatchObject({
			kind: 'enum-list',
			options: ['console', 'file'],
			separator: ',',
			defaultValue: "['console']",
		});
		expect(vars.get('N8N_PATHS')).toMatchObject({ kind: 'list', separator: ':' });
		expect(vars.get('N8N_PORT')).toMatchObject({ kind: 'number', defaultValue: '5 * 60' });
		expect(vars.get('N8N_MAYBE')).toMatchObject({ kind: 'number' });
		expect(vars.get('N8N_MAYBE')?.defaultValue).toBeUndefined();
		expect(vars.get('N8N_FLAG')).toMatchObject({ kind: 'boolean', defaultValue: 'true' });
		expect(vars.get('N8N_NAME')).toMatchObject({ kind: 'string', defaultValue: 'n8n' });
		expect(vars.get('N8N_OVERRIDES')).toMatchObject({ kind: 'json' });
	});
});

describe('rankVars', () => {
	const vars = [
		{ name: 'N8N_LOG_FORMAT', group: 'Logging', description: 'Format of the log output.' },
		{ name: 'N8N_LOG_LEVEL', group: 'Logging', description: 'Minimum level.' },
		{ name: 'DB_LOGGING_ENABLED', group: 'Database', description: 'Whether to log queries.' },
		{ name: 'N8N_PORT', group: 'Global', description: 'HTTP port.' },
		{ name: 'N8N_IMPORT_MAX', group: 'Import', description: 'Maximum entries.' },
	];

	it('should rank exact and prefix name matches first', () => {
		expect(rankVars(vars, 'n8n log level').map((v) => v.name)).toEqual(['N8N_LOG_LEVEL']);
		expect(rankVars(vars, 'n8n_log').map((v) => v.name)).toEqual([
			'N8N_LOG_FORMAT',
			'N8N_LOG_LEVEL',
		]);
		expect(rankVars(vars, 'port').map((v) => v.name)).toEqual(['N8N_PORT', 'N8N_IMPORT_MAX']);
	});

	it('should match words in any order across name, group, and description', () => {
		expect(rankVars(vars, 'queries log').map((v) => v.name)).toEqual(['DB_LOGGING_ENABLED']);
		expect(rankVars(vars, 'logging').map((v) => v.name)).toEqual([
			'DB_LOGGING_ENABLED',
			'N8N_LOG_FORMAT',
			'N8N_LOG_LEVEL',
		]);
	});

	it('should return everything for an empty search', () => {
		expect(rankVars(vars, '  ')).toBe(vars);
	});
});

describe('shortDescription', () => {
	it('should keep the first sentence and shorten long text', () => {
		expect(shortDescription({ description: 'First one.\nSecond one.' })).toBe('First one.');
		expect(shortDescription({ description: 'An endpoint, e.g. for Azurite. More.' })).toBe(
			'An endpoint, e.g. for Azurite.',
		);
		expect(shortDescription({ description: 'x'.repeat(100) }, 10)).toBe(`${'x'.repeat(9)}…`);
	});
});
