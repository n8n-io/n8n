import { SyntaxKind, type Project, type SourceFile } from 'ts-morph';
import { BaseRule } from './base-rule';
import type { Violation } from '../core/types';
import { isComponentFile } from '../utils/path-helpers';
import { getRelativePath } from '../core/project-loader';

interface TestIdUsage {
	file: string;
	line: number;
	column: number;
}

/**
 * Deduplication Rule
 *
 * Ensures getByTestId() string literals are unique within their scope.
 * Duplicate test IDs across page objects indicate potential consolidation opportunities.
 *
 * Scopes:
 * - pages/ (excluding components) = one scope
 * - pages/components/ = separate scope
 *
 * A test ID appearing in multiple files within the same scope is flagged.
 */
export class DeduplicationRule extends BaseRule {
	readonly id = 'deduplication';
	readonly name = 'Deduplication';
	readonly description = 'Test IDs should be unique within their scope';
	readonly severity = 'warning' as const;

	getTargetGlobs(): string[] {
		return ['pages/**/*.ts'];
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		// Collect test IDs by scope
		const pagesScope = new Map<string, TestIdUsage[]>();
		const componentsScope = new Map<string, TestIdUsage[]>();

		for (const file of files) {
			const filePath = file.getFilePath();
			const isComponent = isComponentFile(filePath);
			const scope = isComponent ? componentsScope : pagesScope;

			// Find all getByTestId calls with string literal arguments
			const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of calls) {
				const expr = call.getExpression();
				const text = expr.getText();

				// Only interested in getByTestId calls
				if (!text.endsWith('.getByTestId')) {
					continue;
				}

				const args = call.getArguments();
				if (args.length === 0) continue;

				const firstArg = args[0];
				if (firstArg.getKind() !== SyntaxKind.StringLiteral) continue;

				const stringLit = firstArg.asKind(SyntaxKind.StringLiteral);
				if (!stringLit) continue;

				const testId = stringLit.getLiteralText();
				const usage: TestIdUsage = {
					file: filePath,
					line: call.getStartLineNumber(),
					column: call.getStart() - call.getStartLinePos(),
				};

				if (!scope.has(testId)) {
					scope.set(testId, []);
				}
				scope.get(testId)!.push(usage);
			}
		}

		// Find duplicates in each scope
		violations.push(...this.findDuplicates(pagesScope, 'pages', files));
		violations.push(...this.findDuplicates(componentsScope, 'components', files));

		return violations;
	}

	private findDuplicates(
		scope: Map<string, TestIdUsage[]>,
		scopeName: string,
		files: SourceFile[],
	): Violation[] {
		const violations: Violation[] = [];

		for (const [testId, usages] of scope) {
			// Only flag if same test ID appears in multiple files
			const uniqueFiles = new Set(usages.map((u) => u.file));
			if (uniqueFiles.size <= 1) continue;

			// Create a violation for each usage except the first
			const sortedUsages = [...usages].sort((a, b) => a.file.localeCompare(b.file));
			const firstFile = getRelativePath(sortedUsages[0].file);

			for (let i = 1; i < sortedUsages.length; i++) {
				const usage = sortedUsages[i];
				const file = files.find((f) => f.getFilePath() === usage.file);
				if (!file) continue;

				violations.push(
					this.createViolation(
						file,
						usage.line,
						usage.column,
						`Duplicate test ID "${testId}" in ${scopeName} scope`,
						`Also used in ${firstFile}. Consider consolidating to a shared component or using a more specific test ID.`,
					),
				);
			}
		}

		return violations;
	}
}
