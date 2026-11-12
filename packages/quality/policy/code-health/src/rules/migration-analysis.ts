import fg from 'fast-glob';
import { Node, Project, SyntaxKind, VariableDeclarationKind } from 'ts-morph';
import type { CallExpression, SourceFile } from 'ts-morph';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';

export const MIGRATIONS_ROOT = 'packages/@n8n/db/src/migrations';
export const SKILL_PATH = '.agents/skills/db-migrations/SKILL.md';

const MIGRATION_GLOBS = ['common', 'postgresdb', 'sqlite'].map(
	(dialect) => `${MIGRATIONS_ROOT}/${dialect}/*.ts`,
);

export type MigrationDialect = 'common' | 'postgresdb' | 'sqlite';

export interface AddedMigration {
	file: SourceFile;
	relativePath: string;
	dialect: MigrationDialect;
}

export function skillLink(anchor: string, heading: string): string {
	return `See ${SKILL_PATH}#${anchor} ("${heading}").`;
}

function toPosix(p: string): string {
	return p.split(path.sep).join('/');
}

function dialectOf(relativePath: string): MigrationDialect | undefined {
	const dir = path.posix.basename(path.posix.dirname(relativePath));
	return dir === 'common' || dir === 'postgresdb' || dir === 'sqlite' ? dir : undefined;
}

/** Parses the migrations in `context.addedFiles`. Without added files there is nothing to judge. */
export async function loadAddedMigrations(context: CodeHealthContext): Promise<AddedMigration[]> {
	const { rootDir, addedFiles } = context;
	if (!addedFiles || addedFiles.length === 0) return [];
	const added = new Set(addedFiles.map((p) => toPosix(path.normalize(p))));

	const files = await fg(MIGRATION_GLOBS, { cwd: rootDir });
	const project = new Project({
		skipAddingFilesFromTsConfig: true,
		skipFileDependencyResolution: true,
	});

	const migrations: AddedMigration[] = [];
	for (const relativePath of files.sort()) {
		if (!added.has(relativePath) || relativePath.endsWith('/index.ts')) continue;
		const dialect = dialectOf(relativePath);
		if (!dialect) continue;
		const file = project.addSourceFileAtPath(path.join(rootDir, relativePath));
		migrations.push({ file, relativePath, dialect });
	}
	return migrations;
}

export const RECREATING_METHODS = new Set([
	'addColumns',
	'dropColumns',
	'addNotNull',
	'dropNotNull',
	'addEnumCheck',
	'dropEnumCheck',
]);

/** A DSL call that rebuilds the table on SQLite; only DSL calls carry the `recreatesOnSqlite` ack. */
export function isSqliteRecreateCall(call: CallExpression): boolean {
	if (!RECREATING_METHODS.has(calleeName(call) ?? '')) return false;
	const last = call.getArguments().at(-1);
	return (
		last !== undefined &&
		Node.isObjectLiteralExpression(last) &&
		last.getProperty('recreatesOnSqlite') !== undefined
	);
}

/** Name of the called function: `foo` for `foo()`, `bar` for `a.b.bar()`. */
export function calleeName(call: CallExpression): string | undefined {
	const callee = call.getExpression();
	if (Node.isIdentifier(callee)) return callee.getText();
	if (Node.isPropertyAccessExpression(callee)) return callee.getName();
	return undefined;
}

/**
 * Resolves an expression to a table name: a string literal, `escape.tableName('x')`, or a
 * `const` bound to either. Returns undefined when the value is not static.
 */
export function resolveTableName(node: Node | undefined, depth = 0): string | undefined {
	if (!node || depth > 4) return undefined;
	if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
		return node.getLiteralText();
	}
	if (Node.isParenthesizedExpression(node) || Node.isAsExpression(node)) {
		return resolveTableName(node.getExpression(), depth + 1);
	}
	if (Node.isCallExpression(node) && calleeName(node) === 'tableName') {
		return resolveTableName(node.getArguments()[0], depth + 1);
	}
	if (Node.isIdentifier(node)) {
		for (const declaration of node.getSymbol()?.getDeclarations() ?? []) {
			if (!Node.isVariableDeclaration(declaration)) continue;
			const list = declaration.getVariableStatement()?.getDeclarationKind();
			if (list !== undefined && list !== VariableDeclarationKind.Const) continue;
			return resolveTableName(declaration.getInitializer(), depth + 1);
		}
	}
	return undefined;
}

/** Static SQL text of literals, `+` concatenation and `const` bindings; `${expr}` becomes a placeholder. */
export function resolveSqlText(node: Node | undefined, depth = 0): string | undefined {
	if (!node || depth > 4) return undefined;
	if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
		return node.getLiteralText();
	}
	if (Node.isTemplateExpression(node)) {
		return [
			node.getHead().getLiteralText(),
			...node
				.getTemplateSpans()
				.map((span) => `${PLACEHOLDER}${span.getLiteral().getLiteralText()}`),
		].join('');
	}
	if (Node.isParenthesizedExpression(node) || Node.isAsExpression(node)) {
		return resolveSqlText(node.getExpression(), depth + 1);
	}
	if (Node.isBinaryExpression(node) && node.getOperatorToken().getKind() === SyntaxKind.PlusToken) {
		const left = resolveSqlText(node.getLeft(), depth + 1);
		const right = resolveSqlText(node.getRight(), depth + 1);
		return left === undefined || right === undefined ? undefined : left + right;
	}
	if (Node.isIdentifier(node)) {
		for (const declaration of node.getSymbol()?.getDeclarations() ?? []) {
			if (!Node.isVariableDeclaration(declaration)) continue;
			const list = declaration.getVariableStatement()?.getDeclarationKind();
			if (list !== undefined && list !== VariableDeclarationKind.Const) continue;
			return resolveSqlText(declaration.getInitializer(), depth + 1);
		}
	}
	return undefined;
}

/** The outermost member access or call of the chain that `node` starts, e.g. all of `column('id').int.primary`. */
export function chainTop(node: Node): Node {
	let top = node;
	for (let parent = top.getParent(); parent; parent = top.getParent()) {
		const continuesChain =
			(Node.isPropertyAccessExpression(parent) || Node.isCallExpression(parent)) &&
			parent.getExpression() === top;
		if (!continuesChain) break;
		top = parent;
	}
	return top;
}

export interface ColumnChain {
	/** Member names in source order, e.g. `['int', 'primary', 'notNull']`. */
	members: string[];
	columnName: string | undefined;
}

/** Parses a `column('x')....` DSL chain. Returns undefined when the chain does not start with `column(...)`. */
export function parseColumnChain(top: Node): ColumnChain | undefined {
	const members: string[] = [];
	let current: Node = top;
	for (;;) {
		if (Node.isPropertyAccessExpression(current)) {
			members.unshift(current.getName());
			current = current.getExpression();
		} else if (Node.isCallExpression(current)) {
			if (calleeName(current) === 'column') {
				return { members, columnName: resolveTableName(current.getArguments()[0]) };
			}
			current = current.getExpression();
		} else {
			return undefined;
		}
	}
}

/** True when `node` sits in a branch that runs only on Postgres. */
export function isPostgresOnlyBranch(node: Node): boolean {
	let child: Node = node;
	for (const ancestor of node.getAncestors()) {
		if (Node.isIfStatement(ancestor)) {
			const condition = ancestor.getExpression().getText().replace(/\s+/g, '');
			const postgres = /^(?:[\w.]+\.)?isPostgres$|^!(?:[\w.]+\.)?isSqlite$/.test(condition);
			const sqlite = /^(?:[\w.]+\.)?isSqlite$|^!(?:[\w.]+\.)?isPostgres$/.test(condition);
			if (postgres && ancestor.getThenStatement() === child) return true;
			if (sqlite && ancestor.getElseStatement() === child) return true;
		}
		child = ancestor;
	}
	return false;
}

const PLACEHOLDER = '\u0000';
const SQL_START = /^\s*(?:SELECT|INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|WITH|PRAGMA|TRUNCATE)\b/i;
const QUERY_FUNCTIONS = new Set(['runQuery', 'query', 'runInBatches']);

export interface SqlLiteral {
	node: Node;
	/** Literal text; each `${expr}` is replaced by `\0<index>\0`. */
	text: string;
	expressions: Node[];
}

function isQueryArgument(node: Node): boolean {
	let current: Node = node;
	let parent = current.getParent();
	while (
		parent &&
		(Node.isParenthesizedExpression(parent) ||
			(Node.isBinaryExpression(parent) &&
				parent.getOperatorToken().getKind() === SyntaxKind.PlusToken))
	) {
		current = parent;
		parent = current.getParent();
	}
	return (
		parent !== undefined &&
		Node.isCallExpression(parent) &&
		parent.getArguments().includes(current) &&
		QUERY_FUNCTIONS.has(calleeName(parent) ?? '')
	);
}

/** String and template literals that hold SQL: query arguments, or text that starts with a statement keyword. */
export function sqlLiterals(file: SourceFile): SqlLiteral[] {
	const literals: SqlLiteral[] = [];
	file.forEachDescendant((node) => {
		let literal: SqlLiteral | undefined;
		if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
			literal = { node, text: node.getLiteralText(), expressions: [] };
		} else if (Node.isTemplateExpression(node)) {
			const expressions: Node[] = [];
			let text = node.getHead().getLiteralText();
			for (const span of node.getTemplateSpans()) {
				text += `${PLACEHOLDER}${expressions.length}${PLACEHOLDER}`;
				expressions.push(span.getExpression());
				text += span.getLiteral().getLiteralText();
			}
			literal = { node, text, expressions };
		}
		if (literal && (SQL_START.test(literal.text) || isQueryArgument(node))) literals.push(literal);
	});
	return literals;
}

export type TableReference =
	| { kind: 'identifier'; name: string; prefixed: boolean; keyword: string; offset: number }
	| { kind: 'expression'; expression: Node; keyword: string; offset: number };

const TABLE_KEYWORD =
	/\b(FROM|JOIN|INTO|UPDATE|TABLE|REFERENCES|RENAME\s+TO)\s+(?:(?:IF\s+(?:NOT\s+)?EXISTS|ONLY)\s+)*/gi;
const INDEX_ON = /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b[^;]*?\bON\s+(?:ONLY\s+)?/gi;
// `EXTRACT(EPOCH FROM x)`, `IS DISTINCT FROM x`, `FOR UPDATE`, `DO UPDATE`, `ON UPDATE CASCADE`.
const NON_TABLE_PREDECESSOR =
	/\b(?:EPOCH|DISTINCT|BOTH|LEADING|TRAILING|YEAR|MONTH|DAY|HOUR|MINUTE|SECOND|FOR|DO|ON|KEY)\s*$/i;
const NON_TABLE_WORDS = new Set([
	'select',
	'set',
	'values',
	'where',
	'lateral',
	'only',
	'if',
	'not',
	'exists',
	'default',
	'excluded',
	'cascade',
	'restrict',
	'no',
	'null',
	'on',
]);
const SYSTEM_TABLE = /^(?:sqlite_|pg_|information_schema|pragma_|json_|jsonb_)/i;
const CTE_NAME =
	/(?:\bWITH\s+(?:RECURSIVE\s+)?|,\s*)([A-Za-z_]\w*)\s+AS\s*(?:NOT\s+)?(?:MATERIALIZED\s+)?\(/gi;
const IDENTIFIER = /^(["`[]?)([A-Za-z_]\w*)(["`\]]?)/;
const PLACEHOLDER_AT = new RegExp(`^${PLACEHOLDER}(\\d+)${PLACEHOLDER}`);
const PREFIXED_AT = new RegExp(`^["\`[]?${PLACEHOLDER}(\\d+)${PLACEHOLDER}([A-Za-z_]\\w*)`);
const TABLE_PREFIX = /(?:^|\.)tablePrefix$/;

function referenceAt(
	literal: SqlLiteral,
	offset: number,
	keyword: string,
	cteNames: Set<string>,
): TableReference | undefined {
	const rest = literal.text.slice(offset);
	const upper = keyword.toUpperCase().replace(/\s+/g, ' ');
	const prefixed = PREFIXED_AT.exec(rest);
	const prefix = prefixed && literal.expressions[Number(prefixed[1])];
	if (prefixed && prefix && TABLE_PREFIX.test(prefix.getText())) {
		return { kind: 'identifier', name: prefixed[2], prefixed: true, keyword: upper, offset };
	}
	const placeholder = PLACEHOLDER_AT.exec(rest);
	if (placeholder) {
		const expression = literal.expressions[Number(placeholder[1])];
		return expression ? { kind: 'expression', expression, keyword: upper, offset } : undefined;
	}
	const match = IDENTIFIER.exec(rest);
	if (!match) return undefined;
	const [whole, open, name, close] = match;
	const quoted = open !== '';
	if (quoted && close === '') return undefined;
	const after = rest.slice(whole.length);
	// `"${prefix}x"` and `schema.table` are not plain identifiers.
	if (after.startsWith(PLACEHOLDER) || after.startsWith('.')) return undefined;
	if ((upper === 'FROM' || upper === 'JOIN') && /^\s*\(/.test(after)) return undefined;
	if (!quoted && NON_TABLE_WORDS.has(name.toLowerCase())) return undefined;
	if (SYSTEM_TABLE.test(name) || cteNames.has(name.toLowerCase())) return undefined;
	return { kind: 'identifier', name, prefixed: false, keyword: upper, offset };
}

// Blanks quoted SQL values and comments; keeps offsets and newlines.
export function maskSqlText(text: string): string {
	return text.replace(/'(?:[^']|'')*'|--[^\n]*|\/\*[\s\S]*?\*\//g, (match) =>
		match.replace(/[^\n]/g, ' '),
	);
}

/** Table positions in a SQL literal: after FROM, JOIN, INTO, UPDATE, TABLE, REFERENCES, RENAME TO and CREATE INDEX … ON. */
export function tableReferences(sql: SqlLiteral): TableReference[] {
	const literal = { ...sql, text: maskSqlText(sql.text) };
	const cteNames = new Set(
		[...literal.text.matchAll(CTE_NAME)].map((match) => match[1].toLowerCase()),
	);
	const references: TableReference[] = [];
	for (const match of literal.text.matchAll(TABLE_KEYWORD)) {
		const start = match.index ?? 0;
		if (NON_TABLE_PREDECESSOR.test(literal.text.slice(0, start))) continue;
		const reference = referenceAt(literal, start + match[0].length, match[1], cteNames);
		if (reference) references.push(reference);
	}
	for (const match of literal.text.matchAll(INDEX_ON)) {
		const reference = referenceAt(
			literal,
			(match.index ?? 0) + match[0].length,
			'CREATE INDEX ON',
			cteNames,
		);
		if (reference) references.push(reference);
	}
	return references;
}

/** Line of `offset` inside a literal, for violation positions. */
export function lineOf(literal: SqlLiteral, offset: number): number {
	const newlines = literal.text.slice(0, offset).match(/\n/g)?.length ?? 0;
	return literal.node.getStartLineNumber() + newlines;
}
