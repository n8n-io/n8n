import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import type * as TS from 'typescript';

import { RigError } from '../errors';

/**
 * Packages whose `typescript` dependency has the JavaScript compiler API
 * (TS 6). The root may get the native TS 7 compiler, which has no such API.
 */
const TYPESCRIPT_HOSTS = ['scripts/experimental/rig', 'packages/cli', '.'];

let ts: typeof TS;

function isCompilerApi(value: unknown): value is typeof TS {
	return (
		typeof value === 'object' &&
		value !== null &&
		'createProgram' in value &&
		typeof value.createProgram === 'function'
	);
}

/**
 * Loads TypeScript from the checkout. The global rig bundle does not contain
 * it, and the catalog reads a checkout anyway.
 */
function loadTypeScript(repoRoot: string): typeof TS {
	const candidates = [
		...TYPESCRIPT_HOSTS.map((dir) => join(repoRoot, dir, 'package.json')),
		import.meta.url,
	];
	for (const from of candidates) {
		if (from.startsWith('/') && !existsSync(from)) continue;
		try {
			const loaded: unknown = createRequire(from)('typescript');
			if (isCompilerApi(loaded)) return loaded;
		} catch {
			// Try the next place.
		}
	}
	throw new RigError(
		`Cannot load the TypeScript compiler API from ${repoRoot}.`,
		'Run `pnpm install` in the checkout.',
	);
}

/** How the editor asks for a value. */
export type EnvVarKind = 'boolean' | 'number' | 'string' | 'enum' | 'enum-list' | 'list' | 'json';

export interface EnvVarInfo {
	name: string;
	description: string;
	kind: EnvVarKind;
	/** Allowed values of `enum` and `enum-list`. */
	options?: string[];
	/** Separator of `list` and `enum-list` values. */
	separator?: string;
	/** The default as written in the source, for example `'info'`, `5678`, or `5 * 60`. */
	defaultValue?: string;
	/** The config class without the `Config` suffix, for example `Logging`. */
	group: string;
	/** `path:line` relative to the repository root. */
	source: string;
}

/** Files that declare `@Env` properties. Tests and the quality tooling do not count. */
export function findEnvFiles(repoRoot: string): string[] {
	const output = execFileSync(
		'git',
		[
			'grep',
			'-l',
			'-E',
			'^[[:space:]]*@Env\\(',
			'--',
			'packages/**/*.ts',
			':!**/*.test.ts',
			':!**/__tests__/**',
			':!**/test/**',
			':!packages/quality/**',
		],
		{ cwd: repoRoot, encoding: 'utf8' },
	);
	return output
		.split('\n')
		.filter(Boolean)
		.map((file) => join(repoRoot, file));
}

function withoutUndefined(type: TS.Type): TS.Type[] {
	const members = type.isUnion() ? type.types : [type];
	return members.filter(
		(member) => !(member.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void)),
	);
}

function stringLiterals(types: TS.Type[]): string[] | undefined {
	if (types.length === 0) return undefined;
	const values: string[] = [];
	for (const type of types) {
		if (!type.isStringLiteral()) return undefined;
		values.push(type.value);
	}
	return values;
}

function separatorOf(typeName: string): string {
	if (typeName.includes('Colon')) return ':';
	return ',';
}

function classify(
	checker: TS.TypeChecker,
	type: TS.Type,
): Pick<EnvVarInfo, 'kind' | 'options' | 'separator'> {
	const members = withoutUndefined(type);

	if (members.length > 0 && members.every((m) => m.flags & ts.TypeFlags.BooleanLike)) {
		return { kind: 'boolean' };
	}
	if (members.length > 0 && members.every((m) => m.flags & ts.TypeFlags.NumberLike)) {
		return { kind: 'number' };
	}
	const literals = stringLiterals(members);
	if (literals) return { kind: 'enum', options: literals };
	if (members.length === 1 && members[0].flags & ts.TypeFlags.String) return { kind: 'string' };

	if (members.length === 1) {
		const [single] = members;
		const typeName = checker.typeToString(single);
		const element = checker.getIndexTypeOfType(single, ts.IndexKind.Number);
		if (element && !typeName.startsWith('Record<') && !typeName.includes('Json')) {
			const options = stringLiterals(withoutUndefined(element));
			const separator = separatorOf(typeName);
			return options ? { kind: 'enum-list', options, separator } : { kind: 'list', separator };
		}
	}
	return { kind: 'json' };
}

function defaultText(node: TS.PropertyDeclaration, sourceFile: TS.SourceFile): string | undefined {
	const init = node.initializer;
	if (!init) return undefined;
	if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return init.text;
	return init.getText(sourceFile).replace(/\s+/g, ' ');
}

function envDecoratorName(
	checker: TS.TypeChecker,
	node: TS.PropertyDeclaration,
	sourceFile: TS.SourceFile,
): string | undefined {
	for (const decorator of ts.getDecorators(node) ?? []) {
		const call = decorator.expression;
		if (!ts.isCallExpression(call) || call.expression.getText(sourceFile) !== 'Env') continue;
		const [first] = call.arguments;
		if (!first) continue;
		if (ts.isStringLiteralLike(first)) return first.text;
		// A constant, for example `OTEL_ENV_VARS.enabled`.
		const type = checker.getTypeAtLocation(first);
		if (type.isStringLiteral()) return type.value;
	}
	return undefined;
}

/** Reads every `@Env` property with the type checker. Takes a few seconds. */
export function extractEnvCatalog(repoRoot: string, files = findEnvFiles(repoRoot)): EnvVarInfo[] {
	ts = loadTypeScript(repoRoot);
	const program = ts.createProgram(files, {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		experimentalDecorators: true,
		strict: true,
		skipLibCheck: true,
		noEmit: true,
		types: [],
	});
	const checker = program.getTypeChecker();
	const byName = new Map<string, EnvVarInfo>();

	for (const file of files) {
		const sourceFile = program.getSourceFile(file);
		if (!sourceFile) continue;

		const visit = (node: TS.Node) => {
			if (ts.isPropertyDeclaration(node)) {
				const name = envDecoratorName(checker, node, sourceFile);
				if (name) {
					const symbol = checker.getSymbolAtLocation(node.name);
					const description = symbol
						? ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim()
						: '';
					const className =
						ts.isClassDeclaration(node.parent) && node.parent.name ? node.parent.name.text : '';
					const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
					const info: EnvVarInfo = {
						name,
						description,
						...classify(checker, checker.getTypeAtLocation(node)),
						defaultValue: defaultText(node, sourceFile),
						group: className.replace(/Config$/, '') || 'Other',
						source: `${relative(repoRoot, file)}:${line + 1}`,
					};
					const existing = byName.get(name);
					// Some vars are read in several places. Keep the documented, central one.
					if (!existing || (!existing.description && info.description)) byName.set(name, info);
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(sourceFile);
	}

	return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
