/**
 * Test Discovery Analyzer
 *
 * Statically discovers test specs and their capabilities via AST analysis.
 * Replaces the Playwright `--list` + regex approach used by distribute-tests.mjs.
 */

import { SyntaxKind, type Project, type SourceFile, type CallExpression } from 'ts-morph';

import { getConfig } from '../config.js';
import { getSourceFiles } from './project-loader.js';
import { getRelativePath } from '../utils/paths.js';

export interface DiscoveredSpec {
	/** Spec file path relative to rootDir */
	path: string;
	/** Capabilities extracted from tags matching capabilityPrefix */
	capabilities: string[];
}

export interface DiscoveryReport {
	/** Active specs (specs with all tests skipped are excluded) */
	specs: DiscoveredSpec[];
	/** Which skip tags were applied */
	skipTags: string[];
}

interface TestCallInfo {
	/** Whether this is a test.fixme() or test.skip() call */
	skipped: boolean;
	/** Whether this is a test.describe() (not an actual test) */
	isDescribe: boolean;
	/** Tags parsed from the title string */
	tags: string[];
}

const TAG_PATTERN = /@[\w:-]+/g;

export class TestDiscoveryAnalyzer {
	constructor(private project: Project) {}

	discover(): DiscoveryReport {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.tests);
		const specs: DiscoveredSpec[] = [];

		for (const file of files) {
			const spec = this.analyzeTestFile(file);
			if (spec) {
				specs.push(spec);
			}
		}

		return {
			specs: specs.sort((a, b) => a.path.localeCompare(b.path)),
			skipTags: config.skipTags,
		};
	}

	/**
	 * Analyze a single test file. Returns null if all tests are skipped.
	 */
	private analyzeTestFile(file: SourceFile): DiscoveredSpec | null {
		const config = getConfig();
		const calls = this.extractTestCalls(file);

		if (calls.length === 0) return null;

		const hasActiveTest = calls.some((call) => !call.skipped && !call.isDescribe);
		if (!hasActiveTest) return null;

		// Collect tags from all calls (including describes) for capability extraction
		const allTags = new Set<string>();
		for (const call of calls) {
			for (const tag of call.tags) {
				allTags.add(tag);
			}
		}

		// Extract capabilities from tags matching the configured prefix
		const capabilities: string[] = [];
		for (const tag of allTags) {
			if (tag.startsWith(config.capabilityPrefix)) {
				capabilities.push(tag.slice(config.capabilityPrefix.length));
			}
		}

		return {
			path: getRelativePath(file.getFilePath()),
			capabilities: capabilities.sort(),
		};
	}

	/**
	 * Extract all test() and test.describe() calls from a file.
	 * Detects test.fixme()/test.skip() as skipped via AST call expression name.
	 * Also handles describe-level test.fixme()/test.skip() (no args) that mark all tests in scope.
	 */
	private extractTestCalls(file: SourceFile): TestCallInfo[] {
		const config = getConfig();
		const calls: TestCallInfo[] = [];

		// First pass: find describe-level fixme/skip markers (no-arg calls)
		const skippedScopes = this.findSkippedScopes(file);

		for (const callExpr of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			const info = this.parseTestCall(callExpr, config.skipTags);
			if (info) {
				// Check if this call is inside a skipped scope
				if (!info.skipped && this.isInsideSkippedScope(callExpr, skippedScopes)) {
					info.skipped = true;
				}
				calls.push(info);
			}
		}

		return calls;
	}

	/**
	 * Find scopes where test.fixme() or test.skip() marks all contained tests as skipped.
	 * Handles two patterns:
	 *   1. No-arg: test.fixme() inside a describe — marks the enclosing block
	 *   2. Wrapper: test.fixme('title', opts, callback) — marks the callback body
	 * Returns the start positions of blocks that are skipped.
	 */
	private findSkippedScopes(file: SourceFile): Set<number> {
		const skippedScopes = new Set<number>();

		for (const callExpr of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			const blockStart = this.extractSkippedBlock(callExpr);
			if (blockStart !== null) {
				skippedScopes.add(blockStart);
			}
		}

		return skippedScopes;
	}

	private extractSkippedBlock(callExpr: CallExpression): number | null {
		const expr = callExpr.getExpression().getText();
		if (expr !== 'test.fixme' && expr !== 'test.skip') return null;

		const args = callExpr.getArguments();
		if (args.length === 0) {
			const parent = callExpr.getFirstAncestorByKind(SyntaxKind.Block);
			return parent ? parent.getStart() : null;
		}

		const lastArg = args.at(-1);
		if (!lastArg) return null;

		const block =
			lastArg.asKind(SyntaxKind.ArrowFunction)?.getBody().asKind(SyntaxKind.Block) ??
			lastArg.asKind(SyntaxKind.FunctionExpression)?.getBody();
		return block ? block.getStart() : null;
	}

	/**
	 * Check if a call expression is inside a skipped scope (a block containing test.fixme()/test.skip()).
	 */
	private isInsideSkippedScope(call: CallExpression, skippedScopes: Set<number>): boolean {
		let node = call.getFirstAncestorByKind(SyntaxKind.Block);
		while (node) {
			if (skippedScopes.has(node.getStart())) return true;
			node = node.getFirstAncestorByKind(SyntaxKind.Block);
		}
		return false;
	}

	/**
	 * Parse a single call expression. Returns info if it's a test/describe call, null otherwise.
	 */
	private parseTestCall(call: CallExpression, skipTags: string[]): TestCallInfo | null {
		const expr = call.getExpression().getText();

		// Match: test(), test.describe(), test.fixme(), test.skip(),
		// test.describe.configure() etc are ignored (no title argument)
		const isTest = expr === 'test' || expr === 'test.only';
		const isDescribe = expr === 'test.describe';
		const isFixme = expr === 'test.fixme';
		const isSkip = expr === 'test.skip';

		if (!isTest && !isDescribe && !isFixme && !isSkip) return null;

		const title = this.extractTitle(call);
		if (title === null) return null;

		const tags = this.parseTags(title);
		const skippedByCall = isFixme || isSkip;
		const skippedByTag = tags.some((tag) => skipTags.includes(tag));

		return {
			skipped: skippedByCall || skippedByTag,
			isDescribe,
			tags,
		};
	}

	/**
	 * Extract the title string from the first argument of a test/describe call.
	 * Returns null for calls without a string title (e.g., test.fixme() with no args).
	 */
	private extractTitle(call: CallExpression): string | null {
		const args = call.getArguments();
		if (args.length === 0) return null;

		const firstArg = args[0];

		// Handle string literals: 'title', "title", `title`
		const asString = firstArg.asKind(SyntaxKind.StringLiteral);
		if (asString) return asString.getLiteralText();

		const asTemplate = firstArg.asKind(SyntaxKind.NoSubstitutionTemplateLiteral);
		if (asTemplate) return asTemplate.getLiteralText();

		return null;
	}

	private parseTags(title: string): string[] {
		return [...title.matchAll(TAG_PATTERN)].map((m) => m[0]);
	}
}
