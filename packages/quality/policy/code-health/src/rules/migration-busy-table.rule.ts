import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import { SyntaxKind } from 'ts-morph';

import type { CodeHealthContext } from '../context.js';
import {
	calleeName,
	isPostgresOnlyBranch,
	isSqliteRecreateCall,
	lineOf,
	loadAddedMigrations,
	resolveTableName,
	skillLink,
	sqlLiterals,
	tableReferences,
} from './migration-analysis.js';
import type { AddedMigration, TableReference } from './migration-analysis.js';

const DEFAULT_BUSY_TABLES = [
	'execution_entity',
	'execution_data',
	'execution_metadata',
	'execution_annotations',
	'workflow_entity',
	'workflow_history',
	'shared_workflow',
	'credentials_entity',
	'shared_credentials',
	'webhook_entity',
	'user',
	'project',
	'project_relation',
];

const CREATE_TABLE_END = /\bCREATE\s+(?:TEMP\w*\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?$/i;

function tableOf(reference: TableReference): string | undefined {
	return reference.kind === 'identifier' ? reference.name : resolveTableName(reference.expression);
}

/** Tables the migration creates itself; work on them is cheap. */
function createdTables({ file }: AddedMigration): Set<string> {
	const created = new Set<string>();
	for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		if (calleeName(call) !== 'createTable') continue;
		const table = resolveTableName(call.getArguments()[0]);
		if (table) created.add(table);
	}
	for (const literal of sqlLiterals(file)) {
		for (const reference of tableReferences(literal)) {
			const before = literal.text.slice(0, reference.offset);
			if (reference.keyword !== 'TABLE' || !CREATE_TABLE_END.test(before)) continue;
			const table = tableOf(reference);
			if (table) created.add(table);
		}
	}
	return created;
}

function bulkWrite(reference: TableReference, before: string, isInsertSelect: boolean) {
	if (reference.keyword === 'UPDATE') return 'UPDATE';
	if (reference.keyword === 'FROM' && /\bDELETE\s+FROM\s*$/i.test(before)) return 'DELETE';
	// Both ends of a copy: a raw table rebuild reads every row out of the old table.
	if ((reference.keyword === 'INTO' || reference.keyword === 'FROM') && isInsertSelect) {
		return 'INSERT ... SELECT';
	}
	return undefined;
}

const DROP_TABLE_END = /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?$/i;

const PR_NOTE =
	'Write in the PR description why the change is necessary and how long it takes on a large instance.';

export class MigrationBusyTableRule extends BaseRule<CodeHealthContext> {
	readonly id = 'migration-busy-table';
	readonly name = 'Migration Busy Table';
	readonly description =
		'Flags added migrations that rebuild, index, or bulk-write a large core table, so the author and reviewers check the cost.';
	readonly severity = 'warning' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const migrations = await loadAddedMigrations(context);
		if (migrations.length === 0) return [];
		const option = this.getOptions().busyTables;
		const busyTables = new Set(
			Array.isArray(option) && option.every((t): t is string => typeof t === 'string')
				? option
				: DEFAULT_BUSY_TABLES,
		);
		return migrations.flatMap((migration) => {
			const created = createdTables(migration);
			const busy = new Set([...busyTables].filter((table) => !created.has(table)));
			return [...this.checkDslCalls(migration, busy), ...this.checkRawSql(migration, busy)];
		});
	}

	private checkDslCalls({ file, dialect }: AddedMigration, busyTables: Set<string>): Violation[] {
		const violations: Violation[] = [];
		for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			const method = calleeName(call);
			if (!method) continue;
			const table = resolveTableName(call.getArguments()[0]);
			if (!table || !busyTables.has(table)) continue;

			if (method === 'createIndex') {
				violations.push(this.indexViolation(file.getFilePath(), call.getStartLineNumber(), table));
			} else if (
				isSqliteRecreateCall(call) &&
				dialect !== 'postgresdb' &&
				!isPostgresOnlyBranch(call)
			) {
				violations.push(
					this.createViolation(
						file.getFilePath(),
						call.getStartLineNumber(),
						1,
						`\`${method}\` rebuilds the busy table \`${table}\` on SQLite, which copies every row. ${PR_NOTE} For a nullable or defaulted new column, use raw \`ALTER TABLE ... ADD COLUMN\` instead. ${skillLink('sqlite-table-recreation-risk', 'SQLite table recreation risk')}`,
					),
				);
			}
		}
		return violations;
	}

	private checkRawSql({ file }: AddedMigration, busyTables: Set<string>): Violation[] {
		const violations: Violation[] = [];
		for (const literal of sqlLiterals(file)) {
			// A trigger body runs per row later, not as a bulk write now.
			if (/\bCREATE\s+TRIGGER\b/i.test(literal.text)) continue;
			const isInsertSelect = /\bINSERT\b[\s\S]*\bSELECT\b/i.test(literal.text);
			for (const reference of tableReferences(literal)) {
				const table = tableOf(reference);
				if (!table || !busyTables.has(table)) continue;
				const line = lineOf(literal, reference.offset);
				if (reference.keyword === 'CREATE INDEX ON') {
					violations.push(this.indexViolation(file.getFilePath(), line, table));
					continue;
				}
				const before = literal.text.slice(0, reference.offset);
				if (reference.keyword === 'TABLE' && DROP_TABLE_END.test(before)) {
					violations.push(
						this.createViolation(
							file.getFilePath(),
							line,
							1,
							`\`DROP TABLE\` of the busy table \`${table}\` is part of a table rebuild, which copies every row. ${PR_NOTE} ${skillLink('sqlite-table-recreation-risk', 'SQLite table recreation risk')}`,
						),
					);
					continue;
				}
				const statement = bulkWrite(reference, before, isInsertSelect);
				if (!statement) continue;
				violations.push(
					this.createViolation(
						file.getFilePath(),
						line,
						1,
						`\`${statement}\` on the busy table \`${table}\` can touch millions of rows and hold locks. ${PR_NOTE} Filter early and batch the work. ${skillLink('use-batch-operations', 'Use Batch Operations')}`,
					),
				);
			}
		}
		return violations;
	}

	private indexViolation(filePath: string, line: number, table: string): Violation {
		return this.createViolation(
			filePath,
			line,
			1,
			`Index creation on the busy table \`${table}\` scans every row and slows every write. ${PR_NOTE} Show the query that needs the index. ${skillLink('index-management', 'Index Management')}`,
		);
	}
}
