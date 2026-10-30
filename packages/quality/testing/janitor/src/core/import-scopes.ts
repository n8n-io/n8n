/**
 * Narrow a module-level change that only touches imports, comments, or blank
 * lines. Such a change has no runtime effect of its own: a changed import only
 * changes the code that uses its bindings. So the change resolves to the lines
 * that use those bindings, and each of those lines resolves like any other
 * change. A use outside every function still selects the whole file.
 */
import type { LineSpan } from '@n8n/test-impact';
import { ts } from 'ts-morph';

interface ImportInfo {
	start: number;
	end: number;
	/** Local names of the value bindings. Type-only bindings have no runtime effect. */
	names: string[];
	/** A side-effect import, `import x = require()`, or another form this does not model. */
	opaque: boolean;
}

/** Facts about one version of a file that the classification needs. */
export interface ModuleFacts {
	sf: ts.SourceFile;
	/** Lines that hold at least one token. Other lines are blank or comment-only. */
	codeLines: Set<number>;
	imports: ImportInfo[];
}

const lineOf = (sf: ts.SourceFile, pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1;

function importInfo(sf: ts.SourceFile, node: ts.Statement): ImportInfo | undefined {
	const start = lineOf(sf, node.getStart(sf));
	const end = lineOf(sf, node.getEnd());
	if (ts.isImportEqualsDeclaration(node)) return { start, end, names: [], opaque: true };
	if (!ts.isImportDeclaration(node)) return undefined;
	const clause = node.importClause;
	if (!clause) return { start, end, names: [], opaque: true };
	if (clause.phaseModifier === ts.SyntaxKind.TypeKeyword)
		return { start, end, names: [], opaque: false };
	const names: string[] = [];
	if (clause.name) names.push(clause.name.text);
	const bindings = clause.namedBindings;
	if (bindings && ts.isNamespaceImport(bindings)) names.push(bindings.name.text);
	if (bindings && ts.isNamedImports(bindings)) {
		for (const el of bindings.elements) if (!el.isTypeOnly) names.push(el.name.text);
	}
	return { start, end, names, opaque: false };
}

export function moduleFacts(source: string): ModuleFacts {
	const sf = ts.createSourceFile('file.ts', source, ts.ScriptTarget.Latest, true);
	const codeLines = new Set<number>();
	const markTokens = (node: ts.Node) => {
		if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode)
			return;
		const children = node.getChildren(sf);
		if (children.length === 0 && node.kind !== ts.SyntaxKind.EndOfFileToken) {
			const end = lineOf(sf, node.getEnd());
			for (let line = lineOf(sf, node.getStart(sf)); line <= end; line++) codeLines.add(line);
		}
		for (const child of children) markTokens(child);
	};
	markTokens(sf);
	const imports: ImportInfo[] = [];
	for (const statement of sf.statements) {
		const info = importInfo(sf, statement);
		if (info) imports.push(info);
	}
	return { sf, codeLines, imports };
}

/**
 * The value-binding names of the imports that the changed lines touch, or null
 * when a changed line holds other code or an opaque import.
 */
function touchedImportNames(facts: ModuleFacts, lines: number[]): string[] | null {
	const names: string[] = [];
	for (const line of lines) {
		if (!facts.codeLines.has(line)) continue;
		const info = facts.imports.find((i) => i.start <= line && line <= i.end);
		if (!info || info.opaque) return null;
		names.push(...info.names);
	}
	return names;
}

function hasDecorators(node: ts.Node): boolean {
	return ts.canHaveDecorators(node) && (ts.getDecorators(node)?.length ?? 0) > 0;
}

/** True when a class or any of its members has a decorator. */
function isDecoratedClass(node: ts.ClassLikeDeclaration): boolean {
	return hasDecorators(node) || node.members.some(hasDecorators);
}

type RefKind = 'value' | 'type' | 'metadata';

/**
 * How an identifier is used. A use inside a type has no runtime effect, except
 * in the signatures of a decorated class: with `emitDecoratorMetadata`, those
 * types are emitted when the module loads.
 */
function refKind(id: ts.Identifier): RefKind {
	let inType = false;
	for (let child: ts.Node = id, node = id.parent; node; child = node, node = node.parent) {
		if (ts.isHeritageClause(node)) {
			const typeOnly =
				node.token === ts.SyntaxKind.ImplementsKeyword || ts.isInterfaceDeclaration(node.parent);
			return typeOnly ? 'type' : 'value';
		}
		if (ts.isTypeNode(node) && !ts.isExpressionWithTypeArguments(node)) inType = true;
		if (!inType) continue;
		const isSignature =
			ts.isParameter(node) ||
			ts.isPropertyDeclaration(node) ||
			ts.isMethodDeclaration(node) ||
			ts.isAccessor(node) ||
			ts.isConstructorDeclaration(node);
		if (isSignature && 'type' in node && node.type === child) {
			const owner = ts.isParameter(node) ? node.parent.parent : node.parent;
			if (owner && ts.isClassLike(owner) && isDecoratedClass(owner)) return 'metadata';
		}
		if (ts.isStatement(node) || ts.isClassElement(node) || ts.isSourceFile(node)) break;
	}
	return inType ? 'type' : 'value';
}

/** One line for each runtime use of `names`, or null when a use is in decorator metadata. */
function useSpans(facts: ModuleFacts, names: Set<string>): LineSpan[] | null {
	const spans: LineSpan[] = [];
	let metadata = false;
	const visit = (node: ts.Node) => {
		if (metadata || ts.isImportDeclaration(node)) return;
		if (ts.isIdentifier(node) && names.has(node.text)) {
			const kind = refKind(node);
			if (kind === 'metadata') metadata = true;
			if (kind === 'value') {
				const line = lineOf(facts.sf, node.getStart(facts.sf));
				spans.push({ lo: line, hi: line });
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(facts.sf);
	return metadata ? null : spans;
}

/**
 * Resolve one module-level hunk. `oldLines` are the removed lines in the map
 * commit's lines, and `newLines` the added lines in the working tree. Returns
 * the spans that replace the hunk (possibly none), or null when the hunk holds
 * other code and must keep its module-level span.
 */
export function narrowImportHunk(
	mapFacts: ModuleFacts,
	headFacts: ModuleFacts,
	oldLines: number[],
	newLines: number[],
): LineSpan[] | null {
	const oldNames = touchedImportNames(mapFacts, oldLines);
	const newNames = touchedImportNames(headFacts, newLines);
	if (!oldNames || !newNames) return null;
	const names = new Set([...oldNames, ...newNames]);
	if (names.size === 0) return [];
	return useSpans(mapFacts, names);
}
