import { Node, SyntaxKind } from 'ts-morph';
import type { ExportDeclaration, ImportDeclaration, SourceFile } from 'ts-morph';

export interface ImportRef {
	/** The module specifier, e.g. `./foo` or `@n8n/di`. */
	specifier: string;
	/** True when the reference is erased by tsc (`import type` / `export type` / inline `type`). */
	typeOnly: boolean;
	/** 1-based line of the import/export/call. */
	line: number;
}

/** A static `import` is erased only if the whole clause is type-only. */
function importIsTypeOnly(declaration: ImportDeclaration): boolean {
	if (declaration.isTypeOnly()) {
		return true;
	}
	// A default or namespace binding always runs at runtime.
	if (declaration.getDefaultImport() || declaration.getNamespaceImport()) {
		return false;
	}
	const named = declaration.getNamedImports();

	// A bare side-effect import (no clause / no names) runs at runtime.
	if (named.length === 0) {
		return false;
	}
	return named.every((element) => element.isTypeOnly());
}

/** An `export ... from` is erased only if the whole clause is type-only. */
function exportIsTypeOnly(declaration: ExportDeclaration): boolean {
	if (declaration.isTypeOnly()) {
		return true;
	}
	const named = declaration.getNamedExports();
	return named.length > 0 && named.every((element) => element.isTypeOnly());
}

/** Collect dynamic `import('<s>')` and `require('<s>')` — runtime forms a regex would miss. */
function parseDynamicImports(sourceFile: SourceFile): ImportRef[] {
	const refs: ImportRef[] = [];
	for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		const expression = call.getExpression();
		const isDynamicImport = expression.getKind() === SyntaxKind.ImportKeyword;
		const isRequire = Node.isIdentifier(expression) && expression.getText() === 'require';
		const [arg] = call.getArguments();
		if ((isDynamicImport || isRequire) && arg && Node.isStringLiteral(arg)) {
			refs.push({
				specifier: arg.getLiteralText(),
				typeOnly: false,
				line: arg.getStartLineNumber(),
			});
		}
	}
	return refs;
}

/**
 * Extract module specifiers from a source file via the ts-morph AST. Covers
 * static `import`/`export ... from`, bare side-effect imports, and the runtime
 * forms a regex would miss: dynamic `import('<s>')` and `require('<s>')`.
 */
export function parseImports(sourceFile: SourceFile): ImportRef[] {
	const refs: ImportRef[] = [];

	for (const decl of sourceFile.getImportDeclarations()) {
		refs.push({
			specifier: decl.getModuleSpecifierValue(),
			typeOnly: importIsTypeOnly(decl),
			line: decl.getStartLineNumber(),
		});
	}

	for (const decl of sourceFile.getExportDeclarations()) {
		// Bare `export {}` (no `from`) has no specifier.
		const specifier = decl.getModuleSpecifierValue();
		if (specifier === undefined) continue;
		refs.push({
			specifier,
			typeOnly: exportIsTypeOnly(decl),
			line: decl.getStartLineNumber(),
		});
	}

	refs.push(...parseDynamicImports(sourceFile));

	return refs;
}
