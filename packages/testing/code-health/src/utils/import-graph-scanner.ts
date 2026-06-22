import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

export interface ImportRef {
	specifier: string;
	typeOnly: boolean;
	line: number;
}

/** Where a bare specifier first enters the runtime graph. */
export interface ExternalRef {
	specifier: string;
	/** Absolute path of the file that imports it. */
	file: string;
	line: number;
}

/**
 * Extract module specifiers from a source file via the TypeScript AST. Covers
 * static `import`/`export ... from`, bare side-effect imports, and the runtime
 * forms a regex would miss: dynamic `import('<s>')` and `require('<s>')`.
 */
export function parseImports(fileName: string, source: string): ImportRef[] {
	const refs: ImportRef[] = [];
	const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);

	const lineOf = (node: ts.Node): number =>
		sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

	const visit = (node: ts.Node): void => {
		// `import ... from '<s>'` / `import '<s>'`
		if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
			refs.push({
				specifier: node.moduleSpecifier.text,
				typeOnly: node.importClause?.isTypeOnly ?? false,
				line: lineOf(node),
			});
		}
		// `export ... from '<s>'` (re-exports; bare `export {}` has no specifier)
		else if (
			ts.isExportDeclaration(node) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			refs.push({
				specifier: node.moduleSpecifier.text,
				typeOnly: node.isTypeOnly,
				line: lineOf(node),
			});
		}
		// Dynamic `import('<s>')` and `require('<s>')` — always runtime.
		else if (ts.isCallExpression(node)) {
			const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
			const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
			const [arg] = node.arguments;
			if ((isDynamicImport || isRequire) && arg && ts.isStringLiteral(arg)) {
				refs.push({ specifier: arg.text, typeOnly: false, line: lineOf(node) });
			}
		}

		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return refs;
}

function resolveRelative(fromFile: string, specifier: string): string | undefined {
	// Strip a NodeNext `.js`/`.jsx` extension back to its TS source.
	const asTs = specifier.replace(/\.jsx?$/, '');
	const base = path.resolve(path.dirname(fromFile), asTs);
	const candidates = [base, `${base}.ts`, `${base}.tsx`, path.resolve(base, 'index.ts')];
	return candidates.find((candidate) => fs.existsSync(candidate) && /\.tsx?$/.test(candidate));
}

/**
 * Walk the runtime import graph from `entry`, following only relative,
 * non-type imports/exports (`import type` / `export type` are erased by tsc),
 * and return every bare (non-relative) specifier reachable at runtime, keyed
 * by the first file that imports it.
 */
export function collectRuntimeExternals(entry: string): Map<string, ExternalRef> {
	const externals = new Map<string, ExternalRef>();
	const visited = new Set<string>();

	const visit = (file: string) => {
		if (visited.has(file)) return;
		visited.add(file);

		const source = fs.readFileSync(file, 'utf8');
		for (const { specifier, typeOnly, line } of parseImports(file, source)) {
			if (typeOnly) continue; // erased at compile time — no runtime dependency
			if (specifier.startsWith('.')) {
				const resolved = resolveRelative(file, specifier);
				if (resolved) visit(resolved);
				continue;
			}
			if (!externals.has(specifier)) externals.set(specifier, { specifier, file, line });
		}
	};

	visit(entry);
	return externals;
}
