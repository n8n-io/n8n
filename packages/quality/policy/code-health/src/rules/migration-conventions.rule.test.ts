import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { MigrationConventionsRule } from './migration-conventions.rule.js';

const MIGRATIONS_DIR = path.join('packages', '@n8n', 'db', 'src', 'migrations');

function writeMigration(
	rootDir: string,
	dialect: 'common' | 'postgresdb' | 'sqlite',
	fileName: string,
	content: string,
): string {
	const relativePath = path.join(MIGRATIONS_DIR, dialect, fileName);
	fs.mkdirSync(path.join(rootDir, MIGRATIONS_DIR, dialect), { recursive: true });
	fs.writeFileSync(path.join(rootDir, relativePath), content);
	return relativePath;
}

// Fixtures write `#` for `$` so the test source holds no interpolation in plain strings.
function migration(fixture: string, imports = ''): string {
	const up = fixture.replaceAll('#', '$');
	return `${imports}
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class Example1790000000000 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { escape, runQuery, tablePrefix, logger, schemaBuilder } = context;
		const { createTable, addColumns, column } = schemaBuilder;
		${up}
	}

	async down() {}
}
`;
}

describe('MigrationConventionsRule', () => {
	let tmpDir: string;
	let rule: MigrationConventionsRule;

	beforeEach(() => {
		tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-migration-conv-')));
		rule = new MigrationConventionsRule();
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function context(addedFiles?: string[]): CodeHealthContext {
		return { rootDir: tmpDir, addedFiles };
	}

	async function analyzeAdded(content: string, dialect: 'common' | 'sqlite' = 'common') {
		const added = writeMigration(tmpDir, dialect, '1790000000000-Example.ts', content);
		return await rule.analyze(context([added]));
	}

	describe('scope', () => {
		const bad = migration(
			"await runQuery('SELECT * FROM workflow_entity');",
			"import { WorkflowEntity } from '../../entities';",
		);

		it('checks nothing when addedFiles is omitted', async () => {
			writeMigration(tmpDir, 'common', '1790000000000-Example.ts', bad);

			expect(await rule.analyze(context())).toEqual([]);
		});

		it('does not judge migrations that the change set did not add', async () => {
			writeMigration(tmpDir, 'common', '1700000000000-Historical.ts', bad);
			const added = writeMigration(tmpDir, 'common', '1790000000000-Clean.ts', migration(''));

			expect(await rule.analyze(context([added]))).toEqual([]);
		});

		it('ignores added files outside the migration directories', async () => {
			const outside = path.join('packages', '@n8n', 'db', 'src', 'entities', 'example.ts');
			fs.mkdirSync(path.join(tmpDir, path.dirname(outside)), { recursive: true });
			fs.writeFileSync(path.join(tmpDir, outside), bad);

			expect(await rule.analyze(context([outside]))).toEqual([]);
		});
	});

	describe('value imports', () => {
		it('accepts type imports, migration-tree imports, builtins, third-party and allowed helpers', async () => {
			const violations = await analyzeAdded(
				migration(
					'',
					[
						"import type { WorkflowEntity } from '../../entities';",
						"import { type ApiKey } from '../../entities';",
						"import { Column } from '../dsl/column';",
						"import { BaseThing } from '../common/1780000000000-Base';",
						"import { randomUUID } from 'node:crypto';",
						"import path from 'path';",
						"import { v7 as uuid } from 'uuid';",
						"import { TableCheck } from '@n8n/typeorm';",
						"import { generateNanoId } from '@n8n/utils/generate-nano-id';",
						"import { UnexpectedError, UserError } from 'n8n-workflow';",
						"import { Cipher } from 'n8n-core';",
						"import { Container } from '@n8n/di';",
					].join('\n'),
				),
			);

			expect(violations).toEqual([]);
		});

		it('flags value imports of entities and app constants', async () => {
			const violations = await analyzeAdded(
				migration(
					'',
					[
						"import { ApiKey } from '../../entities';",
						"import { GLOBAL_ROLES } from '../../constants';",
					].join('\n'),
				),
			);

			expect(violations).toHaveLength(2);
			expect(violations[0].message).toContain("Value import of `ApiKey` from '../../entities'");
			expect(violations[0].message).toContain(
				'.agents/skills/db-migrations/SKILL.md#never-import-entities-as-values',
			);
			expect(violations[1].message).toContain('`GLOBAL_ROLES`');
		});

		it('flags only the names outside the allowlist of a workspace package', async () => {
			const violations = await analyzeAdded(
				migration('', "import { UserError, jsonParse } from 'n8n-workflow';"),
			);

			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain("Value import of `jsonParse` from 'n8n-workflow'");
		});

		it('flags app services, config and side-effect imports', async () => {
			const violations = await analyzeAdded(
				migration(
					'',
					[
						"import { GlobalConfig } from '@n8n/config';",
						"import * as constants from '@n8n/constants';",
						"import '../../setup';",
					].join('\n'),
				),
			);

			expect(violations.map((v) => v.message.split('. ')[0])).toEqual([
				"Value import of `GlobalConfig` from '@n8n/config'",
				"Value import of `*` from '@n8n/constants'",
				"Value import of `*` from '../../setup'",
			]);
		});
	});

	describe('table names in raw SQL', () => {
		it.each([
			['FROM', "await runQuery('SELECT id FROM workflow_entity');", 'workflow_entity'],
			[
				'JOIN',
				'await runQuery(`SELECT * FROM #{escape.tableName(\'a\')} a JOIN "project_relation" pr ON a.id = pr.id`);',
				'project_relation',
			],
			['INTO', "await runQuery('INSERT INTO temp_workflow (id) VALUES (1)');", 'temp_workflow'],
			['UPDATE', 'await runQuery(\'UPDATE "user" SET disabled = false\');', 'user'],
			['TABLE', 'await runQuery(`CREATE TABLE IF NOT EXISTS my_table (id int)`);', 'my_table'],
			[
				'RENAME TO',
				'await runQuery(`ALTER TABLE #{escape.tableName(\'tmp\')} RENAME TO "real_table"`);',
				'real_table',
			],
			[
				'REFERENCES',
				"await runQuery(`ALTER TABLE #{escape.tableName('a')} ADD FOREIGN KEY (b) REFERENCES workflow_entity (id)`);",
				'workflow_entity',
			],
			[
				'CREATE INDEX ON',
				"await runQuery(`CREATE INDEX #{escape.indexName('x')} ON execution_entity (id)`);",
				'execution_entity',
			],
		])('flags a hand-written table name after %s', async (keyword, up, table) => {
			const violations = await analyzeAdded(migration(up));

			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain(
				`Hand-written table name \`${table}\` after ${keyword}`,
			);
			expect(violations[0].message).toContain(`escape.tableName('${table}')`);
			expect(violations[0].message).toContain(
				'.agents/skills/db-migrations/SKILL.md#always-escape-identifiers',
			);
		});

		it('flags lowercase SQL that a variable passes to a query function', async () => {
			const violations = await analyzeAdded(
				migration(
					"const query = 'select id from workflow_entity order by id';\n" +
						'await context.runInBatches(query, async () => {});',
				),
			);

			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain('Hand-written table name `workflow_entity`');
		});

		it('flags a hand-written tablePrefix in a table position', async () => {
			const violations = await analyzeAdded(
				migration(
					'await runQuery(`DELETE FROM "#{tablePrefix}workflow_entity" WHERE id = 1`);\n' +
						'await runQuery(`UPDATE #{context.tablePrefix}user SET a = 1`);',
				),
			);

			expect(violations.map((v) => v.message.split('. ')[0].replace('$', '#'))).toEqual([
				'Hand-written table prefix `#{tablePrefix}workflow_entity` after FROM in raw SQL',
				'Hand-written table prefix `#{tablePrefix}user` after UPDATE in raw SQL',
			]);
		});

		it('reports the line of the table inside a multi-line query', async () => {
			const violations = await analyzeAdded(
				migration('await runQuery(`\n\t\t\tSELECT id\n\t\t\tFROM workflow_entity\n\t\t`);'),
			);

			const fileText = fs.readFileSync(
				path.join(tmpDir, MIGRATIONS_DIR, 'common', '1790000000000-Example.ts'),
				'utf-8',
			);
			const expectedLine = fileText
				.split('\n')
				.findIndex((l) => l.includes('FROM workflow_entity'));
			expect(violations).toHaveLength(1);
			expect(violations[0].line).toBe(expectedLine + 1);
		});

		it('flags a hand-written n8n_ prefix passed to a table helper', async () => {
			const violations = await analyzeAdded(
				migration(
					"const t = escape.tableName('n8n_workflow_entity');\n" +
						"await addColumns('n8n_user', [column('a').text], { recreatesOnSqlite: true });",
				),
			);

			expect(violations.map((v) => v.message.split('. ')[0])).toEqual([
				"Table name 'n8n_workflow_entity' includes a hand-written `n8n_` prefix",
				"Table name 'n8n_user' includes a hand-written `n8n_` prefix",
			]);
		});

		it('accepts escaped tables and SQL that names no table', async () => {
			const up = [
				"const table = escape.tableName('workflow_entity');",
				"await runQuery(`SELECT id FROM #{table} JOIN #{escape.tableName('user')} u ON u.id = 1`);",
				'await runQuery(`UPDATE #{table} SET n = EXTRACT(EPOCH FROM "startedAt")`);',
				'await runQuery(`SELECT a IS DISTINCT FROM b FROM #{table} FOR UPDATE SKIP LOCKED`);',
				'await runQuery(`INSERT INTO #{table} (id) VALUES (1) ON CONFLICT (id) DO UPDATE SET id = excluded.id`);',
				'await runQuery(`SELECT * FROM (SELECT 1) sub`);',
				'await runQuery(`SELECT value FROM json_each(#{table}.nodes)`);',
				"await runQuery(`SELECT name FROM sqlite_master WHERE type = 'table'`);",
				'await runQuery(`SELECT column_name FROM information_schema.columns`);',
				'await runQuery(`WITH recent AS (SELECT id FROM #{table}) SELECT id FROM recent`);',
				"await runQuery(`COMMENT ON COLUMN #{table}.x IS 'Copied from the source table'`);",
				'await runQuery(`CREATE TRIGGER t AFTER UPDATE ON #{table} FOR EACH ROW BEGIN SELECT 1; END`);',
				"logger.info('Copying rows from workflow_entity into the new table');",
				'await createTable(`my_table`);',
				'const indexName = `#{tablePrefix}uq_my_index`;',
			].join('\n\t\t');

			expect(await analyzeAdded(migration(up))).toEqual([]);
		});
	});

	describe('enum checks', () => {
		it('flags a withEnumCheck column without a comment', async () => {
			const violations = await analyzeAdded(
				migration(
					"await createTable('job').withColumns(column('status').varchar(16).notNull.withEnumCheck(['running', 'done']));",
				),
			);

			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain(
				'Column `status` has `.withEnumCheck(...)` but no `.comment(...)`',
			);
			expect(violations[0].message).toContain(
				'.agents/skills/db-migrations/SKILL.md#constrain-enum-like-strings',
			);
		});

		it('accepts a comment before or after withEnumCheck in the same chain', async () => {
			const up = [
				"await createTable('job').withColumns(",
				"\tcolumn('status').varchar(16).withEnumCheck(['a', 'b']).comment('Job state'),",
				"\tcolumn('kind').varchar(16).comment('Job kind').notNull.withEnumCheck(['x', 'y']),",
				');',
			].join('\n\t\t');

			expect(await analyzeAdded(migration(up))).toEqual([]);
		});

		it('does not borrow the comment of a sibling column', async () => {
			const up = [
				"await createTable('job').withColumns(",
				"\tcolumn('status').varchar(16).withEnumCheck(['a', 'b']),",
				"\tcolumn('note').text.comment('Free text'),",
				');',
			].join('\n\t\t');

			const violations = await analyzeAdded(migration(up));

			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain('Column `status`');
		});
	});

	describe('batched queries', () => {
		it('flags a runInBatches query without ORDER BY', async () => {
			const violations = await analyzeAdded(
				migration(
					"await context.runInBatches(`SELECT id FROM #{escape.tableName('agents')} WHERE x = 'order by'`, async () => {});",
				),
			);

			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain('The `runInBatches` query has no `ORDER BY`');
			expect(violations[0].message).toContain(
				'.agents/skills/db-migrations/SKILL.md#use-batch-operations',
			);
		});

		it('resolves a query that a const or a concatenation holds', async () => {
			const up = [
				"const table = escape.tableName('agents');",
				'const query = `SELECT id FROM #{table}` + " WHERE id > 0";',
				'await context.runInBatches(query, async () => {});',
			].join('\n\t\t');

			expect(await analyzeAdded(migration(up))).toHaveLength(1);
		});

		it('accepts an ordered query and skips a query it cannot resolve', async () => {
			const up = [
				"await context.runInBatches(`SELECT id FROM #{escape.tableName('agents')}\n order  by id`, async () => {});",
				'const build = () => "SELECT 1";',
				'await context.runInBatches(build(), async () => {});',
			].join('\n\t\t');

			expect(await analyzeAdded(migration(up))).toEqual([]);
		});
	});

	describe('index name length', () => {
		const longColumns = "['configurationId', 'createdAt']";

		it('flags createIndex and dropIndex calls whose derived name is too long for Postgres', async () => {
			const up = [
				`await schemaBuilder.createIndex('self_healing_investigation', ${longColumns});`,
				`await schemaBuilder.dropIndex('self_healing_investigation', ${longColumns}, { skipIfMissing: true });`,
			].join('\n\t\t');

			const violations = await analyzeAdded(migration(up));

			expect(violations).toHaveLength(2);
			expect(violations[0].message).toContain(
				'The derived index name `IDX_self_healing_investigation_configurationId_createdAt` has 56 characters',
			);
			expect(violations[0].message).toContain(
				'.agents/skills/db-migrations/SKILL.md#index-management',
			);
		});

		it('accepts custom index names and short derived names', async () => {
			const up = [
				`await schemaBuilder.createIndex('self_healing_investigation', ${longColumns}, false, 'IDX_shi_config_created');`,
				`await schemaBuilder.dropIndex('self_healing_investigation', ${longColumns}, { customIndexName: 'IDX_shi_config_created' });`,
				"await schemaBuilder.createIndex('agents', ['projectId'], false, undefined, 'x IS NOT NULL');",
			].join('\n\t\t');

			expect(await analyzeAdded(migration(up))).toEqual([]);
		});

		it('flags a createIndex call that passes undefined as the custom name', async () => {
			const up = `await schemaBuilder.createIndex('self_healing_investigation', ${longColumns}, false, undefined, 'x IS NOT NULL');`;

			expect(await analyzeAdded(migration(up))).toHaveLength(1);
		});

		it('ignores SQLite-only migrations', async () => {
			const up = `await schemaBuilder.createIndex('self_healing_investigation', ${longColumns});`;

			expect(await analyzeAdded(migration(up), 'sqlite')).toEqual([]);
		});

		it('uses the configured table prefix budget', async () => {
			rule.configure({ options: { maxTablePrefixLength: 4 } });
			const up = `await schemaBuilder.createIndex('self_healing_investigation', ${longColumns});`;

			expect(await analyzeAdded(migration(up))).toEqual([]);
		});
	});

	describe('primary key nullability', () => {
		it('flags notNull chained with primary in either order', async () => {
			const up = [
				"await createTable('job').withColumns(",
				"\tcolumn('id').int.primary.notNull.autoGenerate2,",
				"\tcolumn('runId').varchar(36).notNull.primaryWithName('PK_job_run'),",
				"\tcolumn('name').varchar(36).notNull,",
				"\tcolumn('key').varchar(36).primary,",
				');',
			].join('\n\t\t');

			const violations = await analyzeAdded(migration(up));

			expect(violations.map((v) => v.message.split('. ')[0])).toEqual([
				'Column `id` chains `.notNull` with `.primary`',
				'Column `runId` chains `.notNull` with `.primary`',
			]);
			expect(violations[0].message).toContain('.agents/skills/db-migrations/SKILL.md#primary-keys');
		});
	});
});
