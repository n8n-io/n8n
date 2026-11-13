import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import { Node, SyntaxKind } from 'ts-morph';
import { isBuiltin } from 'node:module';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import {
	MIGRATIONS_ROOT,
	RECREATING_METHODS,
	calleeName,
	chainTop,
	isColumnConstructor,
	lineOf,
	loadAddedMigrations,
	maskSqlText,
	parseColumnChain,
	resolveSqlText,
	resolveTableName,
	skillLink,
	sqlLiterals,
	tableReferences,
} from './migration-analysis.js';
import type { AddedMigration } from './migration-analysis.js';

/** Workspace packages a migration may import as values, and which names. */
const ALLOWED_WORKSPACE_IMPORTS: Record<string, string[] | '*' | undefined> = {
	'@n8n/typeorm': '*',
	'@n8n/utils': '*',
	'@n8n/errors': '*',
	'n8n-workflow': ['UserError', 'UnexpectedError', 'OperationalError'],
	// Decrypting stored secrets has no MigrationContext alternative.
	'n8n-core': ['Cipher'],
	'@n8n/di': ['Container'],
};

const TABLE_ARGUMENT_METHODS = new Set([
	...RECREATING_METHODS,
	'tableName',
	'createTable',
	'dropTable',
	'createIndex',
	'dropIndex',
	'addForeignKey',
	'dropForeignKey',
	'copyTable',
]);

const IMPORTS_LINK = skillLink(
	'never-import-entities-as-values',
	'Never import entities as values',
);
const ESCAPE_LINK = skillLink('always-escape-identifiers', 'Always escape identifiers');
const ENUM_LINK = skillLink('constrain-enum-like-strings', 'Constrain enum-like strings');
const BATCH_LINK = skillLink('use-batch-operations', 'Use Batch Operations');
const INDEX_LINK = skillLink('index-management', 'Index Management');
const PRIMARY_KEY_LINK = skillLink('primary-keys', 'Primary Keys');

const POSTGRES_MAX_IDENTIFIER_LENGTH = 63;
// `DB_TABLE_PREFIX` is free-form; budget for a long one.
const DEFAULT_MAX_TABLE_PREFIX_LENGTH = 16;

function packageName(specifier: string): string {
	const parts = specifier.split('/');
	return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function isWorkspacePackage(name: string): boolean {
	return name.startsWith('@n8n/') || name === 'n8n' || name.startsWith('n8n-');
}

export class MigrationConventionsRule extends BaseRule<CodeHealthContext> {
	readonly id = 'migration-conventions';
	readonly name = 'Migration Conventions';
	readonly description =
		'Added migrations must not import app code as values, must escape table names in raw SQL, must comment enum-checked columns, must order batched queries, must keep derived index names short enough for Postgres, and must not chain `.notNull` with `.primary`.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const migrations = await loadAddedMigrations(context);
		if (migrations.length === 0) return [];

		return migrations.flatMap((migration) => [
			...this.checkValueImports(context.rootDir, migration),
			...this.checkTableNames(migration),
			...this.checkEnumComments(migration),
			...this.checkBatchOrder(migration),
			...this.checkIndexNameLength(migration),
			...this.checkPrimaryNotNull(migration),
		]);
	}

	private checkValueImports(rootDir: string, { file }: AddedMigration): Violation[] {
		const migrationsDir = path.join(rootDir, MIGRATIONS_ROOT);
		const violations: Violation[] = [];
		for (const declaration of file.getImportDeclarations()) {
			if (declaration.isTypeOnly()) continue;
			const specifier = declaration.getModuleSpecifierValue();
			const names = [
				...(declaration.getDefaultImport() ? ['default'] : []),
				...(declaration.getNamespaceImport() ? ['*'] : []),
				...declaration
					.getNamedImports()
					.filter((named) => !named.isTypeOnly())
					.map((named) => named.getName()),
			];
			if (!declaration.getImportClause()) names.push('*');
			if (names.length === 0) continue;

			let forbidden: string[] = [];
			if (specifier.startsWith('.')) {
				const target = path.resolve(path.dirname(file.getFilePath()), specifier);
				if (!target.startsWith(`${migrationsDir}${path.sep}`)) forbidden = names;
			} else if (!isBuiltin(specifier) && isWorkspacePackage(packageName(specifier))) {
				const allowance = ALLOWED_WORKSPACE_IMPORTS[packageName(specifier)];
				if (allowance !== '*') forbidden = names.filter((name) => !allowance?.includes(name));
			}
			if (forbidden.length === 0) continue;

			violations.push(
				this.createViolation(
					file.getFilePath(),
					declaration.getStartLineNumber(),
					1,
					`Value import of ${forbidden.map((name) => `\`${name}\``).join(', ')} from '${specifier}'. A migration must not depend on app code that can change later. Copy the type, constant, or helper into the migration, or use \`import type\`. ${IMPORTS_LINK}`,
				),
			);
		}
		return violations;
	}

	private checkTableNames({ file }: AddedMigration): Violation[] {
		const violations: Violation[] = [];
		const filePath = file.getFilePath();

		for (const literal of sqlLiterals(file)) {
			for (const reference of tableReferences(literal)) {
				if (reference.kind !== 'identifier') continue;
				const { name, prefixed, keyword } = reference;
				const written = prefixed
					? `table prefix \`\${tablePrefix}${name}\``
					: `table name \`${name}\``;
				violations.push(
					this.createViolation(
						filePath,
						lineOf(literal, reference.offset),
						1,
						`Hand-written ${written} after ${keyword} in raw SQL. Interpolate \`\${escape.tableName('${name.replace(/^n8n_/, '')}')}\` so the table prefix and quotes are correct on each database. ${ESCAPE_LINK}`,
					),
				);
			}
		}

		for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			if (!TABLE_ARGUMENT_METHODS.has(calleeName(call) ?? '')) continue;
			const [first] = call.getArguments();
			if (!first || !(Node.isStringLiteral(first) || Node.isNoSubstitutionTemplateLiteral(first))) {
				continue;
			}
			const name = first.getLiteralText();
			if (!name.startsWith('n8n_')) continue;
			violations.push(
				this.createViolation(
					filePath,
					first.getStartLineNumber(),
					1,
					`Table name '${name}' includes a hand-written \`n8n_\` prefix. Pass the name without a prefix: the migration context adds the configured prefix. ${ESCAPE_LINK}`,
				),
			);
		}
		return violations;
	}

	private checkEnumComments({ file }: AddedMigration): Violation[] {
		const violations: Violation[] = [];
		for (const access of file.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)) {
			if (access.getName() !== 'withEnumCheck') continue;
			const top = chainTop(access);
			if (/\.comment\s*\(/.test(top.getText())) continue;
			const columnCall = top
				.getDescendantsOfKind(SyntaxKind.CallExpression)
				.find((call) => calleeName(call) === 'column');
			const columnName = resolveTableName(columnCall?.getArguments()[0]);
			violations.push(
				this.createViolation(
					file.getFilePath(),
					access.getStartLineNumber(),
					1,
					`Column ${columnName ? `\`${columnName}\` ` : ''}has \`.withEnumCheck(...)\` but no \`.comment(...)\`. Add \`.comment('...')\` to the same column chain to explain each value. ${ENUM_LINK}`,
				),
			);
		}
		return violations;
	}

	private checkBatchOrder({ file }: AddedMigration): Violation[] {
		const violations: Violation[] = [];
		for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			if (calleeName(call) !== 'runInBatches') continue;
			const sql = resolveSqlText(call.getArguments()[0]);
			if (sql === undefined || /\bORDER\s+BY\b/i.test(maskSqlText(sql))) continue;
			violations.push(
				this.createViolation(
					file.getFilePath(),
					call.getStartLineNumber(),
					1,
					`The \`runInBatches\` query has no \`ORDER BY\`. \`runInBatches\` reads pages with LIMIT and OFFSET. Without a stable order, the database can return a row in two pages or in no page. Add \`ORDER BY\` on a unique column, such as the primary key. ${BATCH_LINK}`,
				),
			);
		}
		return violations;
	}

	private checkIndexNameLength({ file, dialect }: AddedMigration): Violation[] {
		if (dialect === 'sqlite') return [];
		const option = this.getOptions().maxTablePrefixLength;
		const prefixBudget = typeof option === 'number' ? option : DEFAULT_MAX_TABLE_PREFIX_LENGTH;
		const violations: Violation[] = [];

		for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			const method = calleeName(call);
			if (method !== 'createIndex' && method !== 'dropIndex') continue;
			const [tableArg, columnsArg, third, fourth] = call.getArguments();

			const customName =
				method === 'createIndex'
					? fourth
					: Node.isObjectLiteralExpression(third)
						? third.getProperty('customIndexName')
						: undefined;
			const customValue = Node.isPropertyAssignment(customName)
				? customName.getInitializer()
				: customName;
			if (customName && customValue?.getText() !== 'undefined') continue;

			const table = resolveTableName(tableArg);
			if (!table || !Node.isArrayLiteralExpression(columnsArg)) continue;
			const columns = columnsArg.getElements().map((element) => resolveTableName(element));
			if (columns.some((column) => column === undefined)) continue;

			const name = ['IDX', table, ...columns].join('_');
			if (name.length + prefixBudget <= POSTGRES_MAX_IDENTIFIER_LENGTH) continue;
			violations.push(
				this.createViolation(
					file.getFilePath(),
					call.getStartLineNumber(),
					1,
					`The derived index name \`${name}\` has ${name.length} characters. With a table prefix of ${prefixBudget} characters, it is longer than the ${POSTGRES_MAX_IDENTIFIER_LENGTH}-character limit of Postgres. Postgres shortens the name without an error, and a later \`dropIndex\` with the derived name fails. Pass a custom index name of at most ${POSTGRES_MAX_IDENTIFIER_LENGTH} characters, and use the same name in \`down()\` and on the entity \`@Index\`. ${INDEX_LINK}`,
				),
			);
		}
		return violations;
	}

	private checkPrimaryNotNull({ file }: AddedMigration): Violation[] {
		const violations: Violation[] = [];
		const roots = [
			...file
				.getDescendantsOfKind(SyntaxKind.CallExpression)
				.filter((call) => calleeName(call) === 'column'),
			...file.getDescendantsOfKind(SyntaxKind.NewExpression).filter(isColumnConstructor),
		];
		for (const root of roots) {
			const top = chainTop(root);
			const chain = parseColumnChain(top);
			if (!chain?.members.includes('notNull')) continue;
			if (!chain.members.some((m) => m === 'primary' || m === 'primaryWithName')) continue;
			const label = chain.columnName ? `Column \`${chain.columnName}\`` : 'A column';
			violations.push(
				this.createViolation(
					file.getFilePath(),
					top.getStartLineNumber(),
					1,
					`${label} chains \`.notNull\` with \`.primary\`. A primary key is always NOT NULL. Remove \`.notNull\`. ${PRIMARY_KEY_LINK}`,
				),
			);
		}
		return violations;
	}
}
