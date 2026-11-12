import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { MigrationBusyTableRule } from './migration-busy-table.rule.js';

const MIGRATIONS_DIR = path.join('packages', '@n8n', 'db', 'src', 'migrations');

// Fixtures write `#` for `$` so the test source holds no interpolation in plain strings.
function migration(fixture: string): string {
	const up = fixture.replaceAll('#', '$');
	return `import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class Example1790000000000 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { escape, runQuery, isPostgres, schemaBuilder } = context;
		const { createTable, createIndex, addColumns, column } = schemaBuilder;
		${up}
	}

	async down() {}
}
`;
}

describe('MigrationBusyTableRule', () => {
	let tmpDir: string;
	let rule: MigrationBusyTableRule;

	beforeEach(() => {
		tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-migration-busy-')));
		rule = new MigrationBusyTableRule();
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	async function analyzeAdded(up: string, dialect: 'common' | 'postgresdb' | 'sqlite' = 'common') {
		const relativePath = path.join(MIGRATIONS_DIR, dialect, '1790000000000-Example.ts');
		fs.mkdirSync(path.join(tmpDir, MIGRATIONS_DIR, dialect), { recursive: true });
		fs.writeFileSync(path.join(tmpDir, relativePath), migration(up));
		const context: CodeHealthContext = { rootDir: tmpDir, addedFiles: [relativePath] };
		return await rule.analyze(context);
	}

	it('checks nothing when addedFiles is omitted', async () => {
		const relativePath = path.join(MIGRATIONS_DIR, 'common', '1790000000000-Example.ts');
		fs.mkdirSync(path.join(tmpDir, MIGRATIONS_DIR, 'common'), { recursive: true });
		fs.writeFileSync(
			path.join(tmpDir, relativePath),
			migration("await createIndex('execution_entity', ['status']);"),
		);

		expect(await rule.analyze({ rootDir: tmpDir })).toEqual([]);
	});

	describe('index creation', () => {
		it('flags createIndex on a busy table with severity warning', async () => {
			const violations = await analyzeAdded("await createIndex('execution_entity', ['status']);");

			expect(violations).toHaveLength(1);
			expect(violations[0].severity).toBe('warning');
			expect(violations[0].message).toContain(
				'Index creation on the busy table `execution_entity`',
			);
			expect(violations[0].message).toContain(
				'.agents/skills/db-migrations/SKILL.md#index-management',
			);
		});

		it('flags a raw CREATE INDEX on an escaped busy table', async () => {
			const violations = await analyzeAdded(
				"await runQuery(`CREATE INDEX #{escape.indexName('x')} ON #{escape.tableName('workflow_entity')} (name)`);",
			);

			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain('`workflow_entity`');
		});

		it('accepts an index on a quiet table or on a table the migration creates', async () => {
			const up = [
				"await createIndex('my_table', ['a']);",
				"await createTable('user').withColumns(column('id').int.primary);",
				"await createIndex('user', ['id']);",
			].join('\n\t\t');

			expect(await analyzeAdded(up)).toEqual([]);
		});
	});

	describe('SQLite rebuild', () => {
		const up =
			"await addColumns('workflow_entity', [column('a').text], { recreatesOnSqlite: true });";

		it('flags a DSL rebuild of a busy table in common and sqlite migrations', async () => {
			for (const dialect of ['common', 'sqlite'] as const) {
				const violations = await analyzeAdded(up, dialect);

				expect(violations).toHaveLength(1);
				expect(violations[0].message).toContain(
					'`addColumns` rebuilds the busy table `workflow_entity` on SQLite',
				);
				expect(violations[0].message).toContain(
					'.agents/skills/db-migrations/SKILL.md#sqlite-table-recreation-risk',
				);
			}
		});

		it('accepts a rebuild call that never runs on SQLite', async () => {
			expect(await analyzeAdded(up, 'postgresdb')).toEqual([]);
			expect(await analyzeAdded(`if (isPostgres) {\n\t\t\t${up}\n\t\t}`)).toEqual([]);
		});
	});

	describe('bulk writes in raw SQL', () => {
		it.each([
			[
				'UPDATE',
				"const table = escape.tableName('user');\nawait runQuery(`UPDATE #{table} SET a = 1`);",
			],
			['UPDATE', "await runQuery(`update #{escape.tableName('user')} set a = 1`);"],
			[
				'DELETE',
				"await runQuery(`DELETE FROM #{escape.tableName('execution_entity')} WHERE a = 1`);",
			],
			[
				'INSERT ... SELECT',
				"await runQuery(`INSERT INTO #{escape.tableName('shared_workflow')} (a) SELECT a FROM #{escape.tableName('x')}`);",
			],
		])('flags %s on a busy table', async (statement, up) => {
			const violations = await analyzeAdded(up);

			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain(`\`${statement}\` on the busy table`);
			expect(violations[0].message).toContain(
				'.agents/skills/db-migrations/SKILL.md#use-batch-operations',
			);
		});

		it('accepts reads, single-row inserts, trigger bodies and quiet tables', async () => {
			const up = [
				"const table = escape.tableName('execution_entity');",
				'await runQuery(`SELECT id FROM #{table}`);',
				'await runQuery(`INSERT INTO #{table} (id) VALUES (1)`);',
				"await runQuery(`CREATE TRIGGER t AFTER UPDATE ON #{escape.tableName('my_table')} FOR EACH ROW BEGIN UPDATE #{table} SET a = 1; END`);",
				"await runQuery(`UPDATE #{escape.tableName('my_table')} SET a = 1`);",
			].join('\n\t\t');

			expect(await analyzeAdded(up)).toEqual([]);
		});
	});

	it('uses the busyTables option when set', async () => {
		rule.configure({ options: { busyTables: ['my_table'] } });

		const violations = await analyzeAdded(
			"await createIndex('my_table', ['a']);\n\t\tawait createIndex('execution_entity', ['a']);",
		);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('`my_table`');
	});
});
