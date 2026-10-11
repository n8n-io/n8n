/**
 * Test Discovery Analyzer
 *
 * Statically discovers test specs and their worker requirements via AST analysis.
 * Replaces the Playwright `--list` + regex approach used by distribute-tests.mjs.
 */

import type { DiscoveredSpec } from '@n8n/test-impact';
import {
	Node,
	SyntaxKind,
	type CallExpression,
	type Expression,
	type Project,
	type SourceFile,
} from 'ts-morph';

import { getConfig } from '../config.js';
import { getSourceFiles } from './project-loader.js';
import { getRelativePath } from '../utils/paths.js';

// DiscoveredSpec is owned by @n8n/test-impact (the framework-free orchestrator
// consumes it); re-exported here so this module's DiscoveryReport + existing
// importers keep their API.

export type { DiscoveredSpec };

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

interface WorkerRequirements {
	capabilities: string[];
	services: string[];
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

		const path = getRelativePath(file.getFilePath());
		const isOrchestrated =
			!config.orchestration.specFilter || path.startsWith(config.orchestration.specFilter);
		const requirements = isOrchestrated
			? this.extractWorkerRequirements(file)
			: { capabilities: [], services: [] };

		return {
			path,
			capabilities: requirements.capabilities,
			services: requirements.services,
		};
	}

	private extractWorkerRequirements(file: SourceFile): WorkerRequirements {
		const capabilities = new Set<string>();
		const services = new Set<string>();

		// Playwright reports only opaque worker identities. Resolve image requirements from source.
		for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			if (call.getExpression().getText() !== 'test.use') continue;

			const useExpression = call.getArguments()[0];
			if (!useExpression || !Node.isExpression(useExpression)) continue;

			const resolvedUse = this.resolveExpression(useExpression, new Set());
			if (!resolvedUse || !Node.isObjectLiteralExpression(resolvedUse)) {
				if (useExpression.getType().getProperty('capability')) {
					throw new Error(`Cannot resolve test.use() in ${getRelativePath(file.getFilePath())}`);
				}
				continue;
			}

			const capability = this.resolveObjectProperty(resolvedUse, 'capability', new Set());
			if (!capability) continue;

			const capabilityName = this.resolveString(capability, new Set());
			if (capabilityName) {
				capabilities.add(capabilityName);
				continue;
			}

			const resolvedCapability = this.resolveExpression(capability, new Set());
			if (!resolvedCapability || !Node.isObjectLiteralExpression(resolvedCapability)) {
				throw new Error(
					`Cannot resolve the test.use() capability in ${getRelativePath(file.getFilePath())}`,
				);
			}

			const serviceExpression = this.resolveObjectProperty(
				resolvedCapability,
				'services',
				new Set(),
			);
			if (!serviceExpression) continue;

			const resolvedServices = this.resolveStringArray(serviceExpression, new Set());
			if (!resolvedServices) {
				throw new Error(
					`Cannot resolve test.use() capability services in ${getRelativePath(file.getFilePath())}`,
				);
			}
			for (const service of resolvedServices) services.add(service);
		}

		return {
			capabilities: [...capabilities].sort(),
			services: [...services].sort(),
		};
	}

	private resolveExpression(expression: Expression, seen: Set<Node>): Expression | undefined {
		if (seen.has(expression)) return undefined;
		seen.add(expression);

		if (
			Node.isAsExpression(expression) ||
			Node.isParenthesizedExpression(expression) ||
			Node.isSatisfiesExpression(expression)
		) {
			return this.resolveExpression(expression.getExpression(), seen);
		}

		if (Node.isIdentifier(expression)) {
			let symbol = expression.getSymbol();
			if (symbol?.isAlias()) symbol = symbol.getAliasedSymbol();
			const declaration = symbol?.getValueDeclaration() ?? symbol?.getDeclarations()[0];
			if (Node.isVariableDeclaration(declaration) || Node.isPropertyAssignment(declaration)) {
				const initializer = declaration.getInitializer();
				return initializer ? this.resolveExpression(initializer, seen) : undefined;
			}
			return undefined;
		}

		if (Node.isPropertyAccessExpression(expression)) {
			const owner = this.resolveExpression(expression.getExpression(), seen);
			return owner ? this.resolveObjectProperty(owner, expression.getName(), seen) : undefined;
		}

		return expression;
	}

	private resolveObjectProperty(
		expression: Expression,
		name: string,
		seen: Set<Node>,
	): Expression | undefined {
		const resolved = Node.isObjectLiteralExpression(expression)
			? expression
			: this.resolveExpression(expression, seen);
		if (!resolved || !Node.isObjectLiteralExpression(resolved)) return undefined;

		for (const property of [...resolved.getProperties()].reverse()) {
			if (Node.isPropertyAssignment(property) && property.getName() === name) {
				return property.getInitializer();
			}
			if (Node.isShorthandPropertyAssignment(property) && property.getName() === name) {
				const symbol = property.getValueSymbol();
				const declaration = symbol?.getValueDeclaration() ?? symbol?.getDeclarations()[0];
				if (Node.isVariableDeclaration(declaration)) return declaration.getInitializer();
			}
			if (Node.isSpreadAssignment(property)) {
				const value = this.resolveObjectProperty(property.getExpression(), name, seen);
				if (value) return value;
			}
		}
		return undefined;
	}

	private resolveString(expression: Expression, seen: Set<Node>): string | undefined {
		const resolved = this.resolveExpression(expression, seen);
		if (Node.isStringLiteral(resolved) || Node.isNoSubstitutionTemplateLiteral(resolved)) {
			return resolved.getLiteralText();
		}
		return undefined;
	}

	private resolveStringArray(expression: Expression, seen: Set<Node>): string[] | undefined {
		const resolved = this.resolveExpression(expression, seen);
		if (!resolved || !Node.isArrayLiteralExpression(resolved)) return undefined;

		const values: string[] = [];
		for (const element of resolved.getElements()) {
			if (Node.isSpreadElement(element)) {
				const spreadValues = this.resolveStringArray(element.getExpression(), seen);
				if (!spreadValues) return undefined;
				values.push(...spreadValues);
				continue;
			}
			if (!Node.isExpression(element)) return undefined;
			const value = this.resolveString(element, seen);
			if (!value) return undefined;
			values.push(value);
		}
		return values;
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
	 * Returns null for calls without a title argument (e.g., test.fixme() with no args).
	 * Dynamic titles (template literals with substitutions, concatenation, identifiers)
	 * return the raw source text so the call still counts as a real test and tags inside
	 * the static portions can be extracted.
	 */
	private extractTitle(call: CallExpression): string | null {
		const args = call.getArguments();
		if (args.length === 0) return null;

		const firstArg = args[0];

		const asString = firstArg.asKind(SyntaxKind.StringLiteral);
		if (asString) return asString.getLiteralText();

		const asTemplate = firstArg.asKind(SyntaxKind.NoSubstitutionTemplateLiteral);
		if (asTemplate) return asTemplate.getLiteralText();

		return firstArg.getText();
	}

	private parseTags(title: string): string[] {
		return [...title.matchAll(TAG_PATTERN)].map((m) => m[0]);
	}
}
