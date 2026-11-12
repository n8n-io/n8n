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
	lineOf,
	loadAddedMigrations,
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
		'Added migrations must not import app code as values, must escape table names in raw SQL, and must comment enum-checked columns.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const migrations = await loadAddedMigrations(context);
		if (migrations.length === 0) return [];

		return migrations.flatMap((migration) => [
			...this.checkValueImports(context.rootDir, migration),
			...this.checkTableNames(migration),
			...this.checkEnumComments(migration),
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
			let top: Node = access;
			for (let parent = top.getParent(); parent; parent = top.getParent()) {
				const continuesChain =
					(Node.isPropertyAccessExpression(parent) || Node.isCallExpression(parent)) &&
					parent.getExpression() === top;
				if (!continuesChain) break;
				top = parent;
			}
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
}
