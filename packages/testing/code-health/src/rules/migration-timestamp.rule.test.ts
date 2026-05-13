import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { MigrationTimestampRule } from './migration-timestamp.rule.js';

const NOW = 1_777_000_000_000; // fixed reference time used in assertions

const MIGRATIONS_DIR = path.join('packages', '@n8n', 'db', 'src', 'migrations', 'postgresdb');

function createTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-migration-test-'));
}

function writeMigration(rootDir: string, fileName: string, content = 'export {};\n'): void {
	const fullPath = path.join(rootDir, MIGRATIONS_DIR, fileName);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, content);
}

describe('MigrationTimestampRule', () => {
	let tmpDir: string;
	let rule: MigrationTimestampRule;

	beforeEach(() => {
		tmpDir = createTempDir();
		rule = new MigrationTimestampRule();
		rule.configure({ options: { now: NOW } });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function context(): CodeHealthContext {
		return { rootDir: tmpDir };
	}

	it('accepts a precise past timestamp', async () => {
		writeMigration(tmpDir, '1761047826451-AddWorkflowVersionColumn.ts');

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('accepts a rounded past timestamp', async () => {
		writeMigration(tmpDir, '1766500000000-ExpandInsightsWorkflowIdLength.ts');

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('flags a future timestamp', async () => {
		writeMigration(tmpDir, '1784000000000-AiHallucinatedMigration.ts');

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(1);
		expect(violations[0].rule).toBe('migration-timestamp');
		expect(violations[0].message).toContain('future timestamp');
		expect(violations[0].message).toContain('1784000000000');
	});

	it('ignores index.ts and other non-migration files', async () => {
		writeMigration(tmpDir, 'index.ts');
		writeMigration(tmpDir, 'README.md');

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(0);
	});

	it('scans every configured migration directory', async () => {
		writeMigration(tmpDir, '1784000000000-Postgres.ts');
		const sqlitePath = path.join(
			tmpDir,
			'packages',
			'@n8n',
			'db',
			'src',
			'migrations',
			'sqlite',
			'1784000000001-Sqlite.ts',
		);
		fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
		fs.writeFileSync(sqlitePath, 'export {};\n');

		const violations = await rule.analyze(context());

		expect(violations).toHaveLength(2);
	});
});
