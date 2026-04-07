import {
	SyntaxKind,
	type Project,
	type SourceFile,
	type Node,
	type MethodDeclaration,
} from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { getRelativePath, matchesPatterns } from '../utils/paths.js';

/** Playwright fixture names normalized to FIXTURE token */
const PLAYWRIGHT_FIXTURES = ['page', 'request', 'context', 'browser'];

interface MethodFingerprint {
	file: string;
	className: string;
	methodName: string;
	fingerprint: string;
	line: number;
	statementCount: number;
}

interface TestFingerprint {
	file: string;
	testName: string;
	fingerprint: string;
	line: number;
	statementCount: number;
}

/**
 * Detects duplicate code using AST structural fingerprinting.
 * Normalizes code to structural patterns, ignoring variable names and literals.
 */
export class DuplicateLogicRule extends BaseRule {
	readonly id = 'duplicate-logic';
	readonly name = 'Duplicate Logic';
	readonly description = 'Detects duplicate code patterns across tests and page objects';
	readonly severity = 'warning' as const;

	private minStatements = 2;
	private methodIndex = new Map<string, MethodFingerprint[]>();

	getTargetGlobs(): string[] {
		const config = getConfig();
		return [
			...config.patterns.tests,
			...config.patterns.pages,
			...config.patterns.flows,
			...config.patterns.helpers,
		];
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const config = getConfig();

		// Separate files by type
		const pageFiles = files.filter((f) => this.fileMatchesPatterns(f, config.patterns.pages));
		const flowFiles = files.filter((f) => this.fileMatchesPatterns(f, config.patterns.flows));
		const helperFiles = files.filter((f) => this.fileMatchesPatterns(f, config.patterns.helpers));
		const testFiles = files.filter((f) => this.fileMatchesPatterns(f, config.patterns.tests));

		// Build method index from pages, flows, helpers
		this.buildMethodIndex([...pageFiles, ...flowFiles, ...helperFiles]);

		const violations: Violation[] = [];

		// 1. Find duplicate methods within pages/flows/helpers
		violations.push(...this.findDuplicateMethods(files));

		// 2. Find tests that duplicate existing page object methods
		violations.push(...this.findTestsDuplicatingMethods(testFiles, files));

		// 3. Find duplicate test bodies
		violations.push(...this.findDuplicateTests(testFiles, files));

		return violations;
	}

	private fileMatchesPatterns(file: SourceFile, patterns: string[]): boolean {
		return matchesPatterns(file.getFilePath(), patterns);
	}

	private buildMethodIndex(files: SourceFile[]): void {
		this.methodIndex.clear();

		for (const file of files) {
			const filePath = file.getFilePath();
			const classes = file.getClasses();

			for (const cls of classes) {
				const className = cls.getName() ?? 'Anonymous';
				const methods = cls.getMethods();

				for (const method of methods) {
					// Skip private methods, getters, setters
					if (method.hasModifier(SyntaxKind.PrivateKeyword)) continue;

					const result = this.fingerprintMethod(method);
					if (!result) continue;

					const entry: MethodFingerprint = {
						file: filePath,
						className,
						methodName: method.getName(),
						fingerprint: result.hash,
						line: method.getStartLineNumber(),
						statementCount: result.statementCount,
					};

					const existing = this.methodIndex.get(result.hash) ?? [];
					existing.push(entry);
					this.methodIndex.set(result.hash, existing);
				}
			}
		}
	}

	private findDuplicateMethods(files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		for (const [_hash, methods] of this.methodIndex) {
			// Only flag if same fingerprint in multiple files
			const uniqueFiles = new Set(methods.map((m) => m.file));
			if (uniqueFiles.size <= 1) continue;

			// Sort by file path for consistent reporting
			const sorted = [...methods].sort((a, b) => a.file.localeCompare(b.file));
			const first = sorted[0];
			const firstLocation = `${getRelativePath(first.file)}:${first.className}.${first.methodName}()`;

			for (let i = 1; i < sorted.length; i++) {
				const method = sorted[i];
				const file = files.find((f) => f.getFilePath() === method.file);
				if (!file) continue;

				violations.push(
					this.createViolation(
						file,
						method.line,
						0,
						`Duplicate method logic: ${method.className}.${method.methodName}() has identical structure to ${firstLocation}`,
						'Consider extracting to a shared base class or utility function',
					),
				);
			}
		}

		return violations;
	}

	private findTestsDuplicatingMethods(
		testFiles: SourceFile[],
		allFiles: SourceFile[],
	): Violation[] {
		const violations: Violation[] = [];

		for (const testFile of testFiles) {
			const tests = this.extractTestBodies(testFile);

			for (const test of tests) {
				// Check if test body matches any indexed method
				const match = this.findMatchingMethod(test.fingerprint);
				if (!match) continue;

				// Don't report if same file
				if (match.file === testFile.getFilePath()) continue;

				const file = allFiles.find((f) => f.getFilePath() === testFile.getFilePath());
				if (!file) continue;

				violations.push(
					this.createViolation(
						file,
						test.line,
						0,
						`Test duplicates existing method: "${test.testName}" contains logic similar to ${match.className}.${match.methodName}()`,
						`Use the existing method from ${getRelativePath(match.file)} instead of duplicating`,
					),
				);
			}
		}

		return violations;
	}

	private findDuplicateTests(testFiles: SourceFile[], allFiles: SourceFile[]): Violation[] {
		const violations: Violation[] = [];
		const testIndex = new Map<string, TestFingerprint[]>();

		// Build test fingerprint index
		for (const file of testFiles) {
			const tests = this.extractTestBodies(file);

			for (const test of tests) {
				const existing = testIndex.get(test.fingerprint) ?? [];
				existing.push(test);
				testIndex.set(test.fingerprint, existing);
			}
		}

		// Find duplicates
		for (const [_hash, tests] of testIndex) {
			// Only flag if same fingerprint in multiple files
			const uniqueFiles = new Set(tests.map((t) => t.file));
			if (uniqueFiles.size <= 1) continue;

			const sorted = [...tests].sort((a, b) => a.file.localeCompare(b.file));
			const first = sorted[0];
			const firstLocation = `${getRelativePath(first.file)}:"${first.testName}"`;

			for (let i = 1; i < sorted.length; i++) {
				const test = sorted[i];
				const file = allFiles.find((f) => f.getFilePath() === test.file);
				if (!file) continue;

				violations.push(
					this.createViolation(
						file,
						test.line,
						0,
						`Duplicate test logic: "${test.testName}" has identical structure to ${firstLocation}`,
						'Consider extracting shared setup to a helper function or fixture',
					),
				);
			}
		}

		return violations;
	}

	private extractTestBodies(file: SourceFile): TestFingerprint[] {
		const results: TestFingerprint[] = [];
		const filePath = file.getFilePath();

		// Find test() and test.describe() calls
		const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);

		for (const call of calls) {
			const expr = call.getExpression();
			const text = expr.getText();

			// Match test('name', ...) or it('name', ...)
			if (text !== 'test' && text !== 'it') continue;

			const args = call.getArguments();
			if (args.length < 2) continue;

			// Get test name
			const nameArg = args[0];
			let testName = 'anonymous';
			if (nameArg.getKind() === SyntaxKind.StringLiteral) {
				const stringLit = nameArg.asKind(SyntaxKind.StringLiteral);
				if (stringLit) testName = stringLit.getLiteralText();
			}

			// Get test body (second argument should be arrow function or function)
			const bodyArg = args[1];
			const result = this.fingerprintNode(bodyArg);
			if (!result || result.statementCount < this.minStatements) continue;

			results.push({
				file: filePath,
				testName,
				fingerprint: result.hash,
				line: call.getStartLineNumber(),
				statementCount: result.statementCount,
			});
		}

		return results;
	}

	private findMatchingMethod(testFingerprint: string): MethodFingerprint | null {
		const matches = this.methodIndex.get(testFingerprint);
		return matches?.[0] ?? null;
	}

	private fingerprintMethod(
		method: MethodDeclaration,
	): { hash: string; statementCount: number } | null {
		const body = method.getBody();
		if (!body) return null;

		// Body should be a Block
		const block = body.asKind(SyntaxKind.Block);
		if (!block) return null;

		const statements = block.getStatements();
		if (statements.length < this.minStatements) return null;

		const normalized = statements.map((s) => this.normalizeNode(s)).join('|');
		return {
			hash: this.hashString(normalized),
			statementCount: statements.length,
		};
	}

	private fingerprintNode(node: Node): { hash: string; statementCount: number } | null {
		let body: Node | undefined;

		if (node.getKind() === SyntaxKind.ArrowFunction) {
			body = node.asKind(SyntaxKind.ArrowFunction)?.getBody();
		} else if (node.getKind() === SyntaxKind.FunctionExpression) {
			body = node.asKind(SyntaxKind.FunctionExpression)?.getBody();
		}

		if (!body) return null;

		const block = body.asKind(SyntaxKind.Block);
		if (!block) return null;

		const statements = block.getStatements();
		if (statements.length < this.minStatements) return null;

		const normalized = statements.map((s) => this.normalizeNode(s)).join('|');
		return {
			hash: this.hashString(normalized),
			statementCount: statements.length,
		};
	}

	private normalizeNode(node: Node): string {
		const kind = node.getKind();

		switch (kind) {
			// Await expression
			case SyntaxKind.AwaitExpression: {
				const children = node.getChildren();
				const expr = children.find((c) => c.getKind() !== SyntaxKind.AwaitKeyword);
				return `await(${expr ? this.normalizeNode(expr) : ''})`;
			}

			// Call expression - core pattern matching
			case SyntaxKind.CallExpression: {
				const call = node.asKind(SyntaxKind.CallExpression);
				if (!call) return 'call';

				const expr = call.getExpression();
				const normalizedExpr = this.normalizeExpression(expr);
				const argCount = call.getArguments().length;

				return `call(${normalizedExpr},args=${argCount})`;
			}

			// Property access - normalize but keep structure
			case SyntaxKind.PropertyAccessExpression: {
				const propAccess = node.asKind(SyntaxKind.PropertyAccessExpression);
				if (!propAccess) return 'prop';

				const obj = propAccess.getExpression();
				const name = propAccess.getName();

				// Keep method/property names but normalize the object
				return `${this.normalizeNode(obj)}.${name}`;
			}

			// Variable declaration
			case SyntaxKind.VariableStatement: {
				const varStmt = node.asKind(SyntaxKind.VariableStatement);
				if (!varStmt) return 'var';

				const decls = varStmt.getDeclarationList().getDeclarations();
				const patterns = decls.map((d) => {
					const init = d.getInitializer();
					return `VAR=${init ? this.normalizeNode(init) : 'undefined'}`;
				});
				return `var(${patterns.join(',')})`;
			}

			// Expression statement
			case SyntaxKind.ExpressionStatement: {
				const exprStmt = node.asKind(SyntaxKind.ExpressionStatement);
				if (!exprStmt) return 'expr';
				return this.normalizeNode(exprStmt.getExpression());
			}

			// Return statement
			case SyntaxKind.ReturnStatement: {
				const retStmt = node.asKind(SyntaxKind.ReturnStatement);
				if (!retStmt) return 'return';
				const expr = retStmt.getExpression();
				return `return(${expr ? this.normalizeNode(expr) : ''})`;
			}

			// If statement
			case SyntaxKind.IfStatement: {
				const ifStmt = node.asKind(SyntaxKind.IfStatement);
				if (!ifStmt) return 'if';

				const condition = this.normalizeNode(ifStmt.getExpression());
				const thenBranch = ifStmt.getThenStatement();
				const elseBranch = ifStmt.getElseStatement();

				let pattern = `if(${condition})`;
				if (thenBranch) pattern += `then(${this.countStatements(thenBranch)})`;
				if (elseBranch) pattern += `else(${this.countStatements(elseBranch)})`;
				return pattern;
			}

			// For loop
			case SyntaxKind.ForStatement:
			case SyntaxKind.ForOfStatement:
			case SyntaxKind.ForInStatement: {
				const forStmt =
					node.asKind(SyntaxKind.ForOfStatement) ??
					node.asKind(SyntaxKind.ForInStatement) ??
					node.asKind(SyntaxKind.ForStatement);
				if (!forStmt) return 'for';

				const body = forStmt.getStatement();
				return `for(body=${this.countStatements(body)})`;
			}

			// Identifiers - normalize to generic token
			case SyntaxKind.Identifier:
				return 'ID';

			// String literals - normalize to generic token
			case SyntaxKind.StringLiteral:
				return 'STR';

			// Number literals
			case SyntaxKind.NumericLiteral:
				return 'NUM';

			// Template literals
			case SyntaxKind.TemplateExpression:
			case SyntaxKind.NoSubstitutionTemplateLiteral:
				return 'TMPL';

			// Object/array literals
			case SyntaxKind.ObjectLiteralExpression:
				return 'OBJ';

			case SyntaxKind.ArrayLiteralExpression:
				return 'ARR';

			// Binary expressions
			case SyntaxKind.BinaryExpression: {
				const binExpr = node.asKind(SyntaxKind.BinaryExpression);
				if (!binExpr) return 'bin';

				const op = binExpr.getOperatorToken().getText();
				const left = this.normalizeNode(binExpr.getLeft());
				const right = this.normalizeNode(binExpr.getRight());
				return `bin(${left},${op},${right})`;
			}

			// Default - use kind name
			default:
				return SyntaxKind[kind] ?? 'unknown';
		}
	}

	private normalizeExpression(node: Node): string {
		const kind = node.getKind();
		const config = getConfig();

		if (kind === SyntaxKind.PropertyAccessExpression) {
			const propAccess = node.asKind(SyntaxKind.PropertyAccessExpression);
			if (!propAccess) return 'prop';

			const obj = propAccess.getExpression();
			const name = propAccess.getName();

			// Normalize this.page, this.request etc to FIXTURE for cross-layer matching
			if (obj.getKind() === SyntaxKind.ThisKeyword && PLAYWRIGHT_FIXTURES.includes(name)) {
				return 'FIXTURE';
			}

			const objNorm = this.normalizeExpression(obj);
			return `${objNorm}.${name}`;
		}

		if (kind === SyntaxKind.CallExpression) {
			const call = node.asKind(SyntaxKind.CallExpression);
			if (!call) return 'call';

			const expr = call.getExpression();
			return `${this.normalizeExpression(expr)}()`;
		}

		if (kind === SyntaxKind.ThisKeyword) {
			return 'this';
		}

		if (kind === SyntaxKind.Identifier) {
			const name = node.asKind(SyntaxKind.Identifier)?.getText() ?? 'id';

			if (PLAYWRIGHT_FIXTURES.includes(name)) return 'FIXTURE';
			if (name === config.fixtureObjectName || name === config.apiFixtureName) return 'APP';
			return 'VAR';
		}

		return 'expr';
	}

	private countStatements(node: Node): number {
		if (node.getKind() === SyntaxKind.Block) {
			const block = node.asKind(SyntaxKind.Block);
			return block?.getStatements().length ?? 0;
		}
		return 1;
	}

	/** djb2 hash for fingerprint strings */
	private hashString(str: string): string {
		let hash = 5381;
		for (let i = 0; i < str.length; i++) {
			hash = (hash * 33) ^ str.charCodeAt(i);
		}
		// Convert to hex string for readability
		return (hash >>> 0).toString(16);
	}
}
