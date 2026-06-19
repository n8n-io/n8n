import type { CallExpression } from 'ts-morph';

import type { AstRule } from './ast';

/**
 * Is the current expression call being supressed by the `// janitor-disable-next-line` -directive?
 *
 * @example
 * ```javascript
 * // Disabled "no-raw-editor-navigation" rule
 * // janitor-disable-next-line no-raw-editor-navigation -- test exercises ?new=true URL routing directly; loader awaited below
 * await n8n.page.goto(`/workflow/${workflowId}?new=true`);
 *
 * // Disabled all rules
 * // janitor-disable-next-line no-raw-editor-navigation
 * await n8n.page.goto(`/workflow/${workflowId}?new=true`);
 * ```
 *
 * @example
 * ```javascript
 *
 * for (const file of files) {
 *		const lines = file.getFullText().split('\n');
 *		const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);
 *
 *		for (const call of calls) {
 *		if (isSuppressed(astRule: AstRule, lines: string[], call: CallExpression)) {
 *			continue;
 *		}
 * }
 * ```
 *
 * */
export function isSuppressed(astRule: AstRule, lines: string[], call: CallExpression): boolean {
	const lineNumber = call.getStartLineNumber();
	const previousLine = lines[lineNumber - 2] ?? '';
	const directive = /\/\/\s*janitor-disable-next-line\s+([^\s].*)?$/.exec(previousLine);
	if (!directive) {
		return false;
	}
	const ruleList = (directive[1] ?? '').split('--')[0];
	const rules = ruleList
		.split(/[\s,]+/)
		.map((r) => r.trim())
		.filter(Boolean);
	// A bare directive (no rule ids) suppresses everything; otherwise it must name this rule.
	return rules.length === 0 || rules.includes(astRule.id);
}
