/**
 * Line-level scopes for `select`: the changed spans of each backend TypeScript
 * file and its function ranges, in the lines of the commit that the impact map
 * was built from. A file that has no scope resolves at file level, so every
 * failure here (a missing commit, an unreadable file, a parse error) only makes
 * selection broader.
 */
import {
	changedSpans,
	parseHunks,
	translateSpans,
	type FunctionRange,
	type LineScope,
	type LineSpan,
} from '@n8n/test-impact';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ts } from 'ts-morph';

import { getGitRoot } from '../utils/git-operations.js';
import { moduleFacts, narrowImportHunk, type ModuleFacts } from './import-scopes.js';

/** Backend TypeScript source. Frontend and `.vue` files stay at file level. */
export const isLineScoped = (file: string): boolean =>
	file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.startsWith('packages/frontend/');

/** Position of the first token after the node's decorators. */
function startAfterDecorators(node: ts.Node, sf: ts.SourceFile): number {
	const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
	if (!decorators?.length) return node.getStart(sf);
	const after = decorators[decorators.length - 1].end;
	const tokens = node
		.getChildren(sf)
		.flatMap((child) =>
			child.kind === ts.SyntaxKind.SyntaxList ? child.getChildren(sf) : [child],
		);
	const next = tokens.find((token) => token.pos >= after && !ts.isDecorator(token));
	return next ? next.getStart(sf) : node.getStart(sf);
}

/**
 * The line range of each function with a body. A range starts after any
 * decorators: decorators run when the module loads, not when the function runs,
 * so a decorator change resolves to the enclosing class and then the whole file.
 */
export function functionRanges(source: string | ts.SourceFile): FunctionRange[] {
	const sf =
		typeof source === 'string'
			? ts.createSourceFile('file.ts', source, ts.ScriptTarget.Latest, true)
			: source;
	const lineOf = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1;
	const ranges: FunctionRange[] = [];
	const visit = (node: ts.Node) => {
		if (ts.isFunctionLike(node) && 'body' in node && node.body) {
			ranges.push({ start: lineOf(startAfterDecorators(node, sf)), end: lineOf(node.getEnd()) });
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
	return ranges;
}

function git(root: string, args: string[]): string {
	return execFileSync('git', args, {
		cwd: root,
		encoding: 'utf-8',
		stdio: ['ignore', 'pipe', 'ignore'],
		maxBuffer: 64 * 1024 * 1024,
	});
}

const DIFF = ['diff', '-U0', '--no-color', '--no-ext-diff', '--no-renames'];

function readWorkingTree(root: string, file: string): string {
	const abs = join(root, file);
	return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
}

const inFunction = (span: LineSpan, ranges: FunctionRange[]) =>
	ranges.some((r) => r.start <= span.lo && span.hi <= r.end);

const lineList = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i);

/** The scope of one file, or null when its changed lines cannot be translated. */
function readLineScope(
	root: string,
	file: string,
	baseRef: string,
	mapSha: string,
): LineScope | null {
	const hunks = parseHunks(git(root, [...DIFF, baseRef, '--', file]));
	if (hunks.length === 0) return null;
	const drift = parseHunks(git(root, [...DIFF, mapSha, baseRef, '--', file]));
	const mapFacts = moduleFacts(git(root, ['show', `${mapSha}:${file}`]));
	const ranges = functionRanges(mapFacts.sf);
	let headFacts: ModuleFacts | undefined;
	const spans: LineSpan[] = [];
	for (const hunk of hunks) {
		const translated = translateSpans(changedSpans([hunk]), drift);
		if (!translated) return null;
		const [span] = translated;
		if (inFunction(span, ranges)) {
			spans.push(span);
			continue;
		}
		// Each removed line must exist unchanged in the map commit, so that the
		// map commit's parse describes it.
		const oldSpans = translateSpans(
			lineList(hunk.oldStart, hunk.oldCount).map((line) => ({ lo: line, hi: line })),
			drift,
		);
		if (!oldSpans) {
			spans.push(span);
			continue;
		}
		headFacts ??= moduleFacts(readWorkingTree(root, file));
		const oldLines = oldSpans.map((s) => s.lo);
		const newLines = lineList(hunk.newStart, hunk.newCount);
		spans.push(...(narrowImportHunk(mapFacts, headFacts, oldLines, newLines) ?? [span]));
	}
	return { spans, ranges };
}

/**
 * Build a scope for each changed backend TypeScript file. `baseRef` is the
 * commit the change is compared with. `mapSha` is the commit the map was built
 * from. Both commits must be available locally.
 */
export function readLineScopes(
	changedFiles: string[],
	baseRef: string,
	mapSha: string,
): Record<string, LineScope> {
	const root = getGitRoot(process.cwd());
	const scopes: Record<string, LineScope> = {};
	for (const file of changedFiles.filter(isLineScoped)) {
		try {
			const scope = readLineScope(root, file, baseRef, mapSha);
			if (scope) scopes[file] = scope;
		} catch {
			// No scope: the file resolves at file level.
		}
	}
	return scopes;
}
