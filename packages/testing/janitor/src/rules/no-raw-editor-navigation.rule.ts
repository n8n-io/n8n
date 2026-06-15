import { AstRule } from '@n8n/rules-engine/ast';
import type { AstProjectConfig } from '@n8n/rules-engine/ast';
import { SyntaxKind, type Project, type SourceFile, type CallExpression } from 'ts-morph';

import { getConfig, ruleAllows } from '../config.js';
import type { Violation } from '../types.js';
import { truncateText } from '../utils/ast-helpers.js';

/**
 * No Raw Editor Navigation Rule
 *
 * Tests must not navigate to the workflow editor with a raw `page.goto()`.
 *
 * The editor renders a full-screen `node-view-loader` overlay while the
 * workflow loads. `page.goto()` resolves on the `load` event, before that
 * overlay clears, so a test that navigates raw and then interacts with the
 * canvas hits a button that Playwright reports as "stable" while the overlay
 * silently intercepts the click — the action then hangs until it times out.
 *
 * Entry composers (`n8n.start.fromImportedWorkflow()`,
 * `n8n.start.fromBlankCanvas()`) own the readiness wait
 * (`canvas.waitForCanvasReady()`), so navigation must go through them.
 *
 * Matches editor routes only (`/workflow/<id>`, `/workflow/new`); the workflow
 * list (`/workflows`, `/home/workflows`) is deliberately not flagged.
 *
 * Violations:
 * - page.goto('/workflow/123')
 * - this.page.goto(`/workflow/${id}`)
 * - n8n.page.goto(ROUTES.NEW_WORKFLOW_PAGE)
 */
export class NoRawEditorNavigationRule extends AstRule<{ rootDir: string }> {
	readonly id = 'no-raw-editor-navigation';
	readonly name = 'No Raw Editor Navigation';
	readonly description =
		'Tests must navigate to the workflow editor via entry composers, not raw page.goto()';
	readonly severity = 'error' as const;

	/** Editor routes carry the canvas loader; the list routes do not. */
	private static readonly EDITOR_ROUTE = /workflow\//;
	private static readonly NEW_WORKFLOW_CONSTANT = /NEW_WORKFLOW_PAGE/;

	getTargetGlobs(): string[] {
		return getConfig().patterns.tests;
	}

	protected projectConfig(): AstProjectConfig {
		return { packages: ['.'], spec: { globs: this.getTargetGlobs() } };
	}

	analyze(context: { rootDir: string }): Violation[] {
		return this.projects(context).flatMap(({ project }) => this.analyzeProject(project));
	}

	analyzeProject(project: Project, files: SourceFile[] = project.getSourceFiles()): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of calls) {
				if (!this.isPageGoto(call)) {
					continue;
				}

				const [firstArg] = call.getArguments();
				if (!firstArg) {
					continue;
				}

				const argText = firstArg.getText();
				if (!this.isEditorRoute(argText)) {
					continue;
				}

				const callText = call.getText();
				if (ruleAllows(this.id, callText)) {
					continue;
				}

				violations.push(
					this.fileViolation(
						file,
						call.getStartLineNumber(),
						call.getStart() - call.getStartLinePos(),
						`Raw navigation to the workflow editor: ${truncateText(callText, 60)}`,
						'Use n8n.start.fromImportedWorkflow() or n8n.start.fromBlankCanvas() so the canvas loader is awaited before interacting',
					),
				);
			}
		}

		return violations;
	}

	/** True for `page.goto`, `this.page.goto`, or `<fixture>.page.goto`. */
	private isPageGoto(call: CallExpression): boolean {
		const expr = call.getExpression();
		if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) {
			return false;
		}

		const propAccess = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
		if (propAccess.getName() !== 'goto') {
			return false;
		}

		const objectText = propAccess.getExpression().getText();
		return objectText === 'page' || /(^|\.)page$/.test(objectText);
	}

	private isEditorRoute(argText: string): boolean {
		return (
			NoRawEditorNavigationRule.EDITOR_ROUTE.test(argText) ||
			NoRawEditorNavigationRule.NEW_WORKFLOW_CONSTANT.test(argText)
		);
	}
}
