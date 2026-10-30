/**
 * Expression globals that were removed in a major version, with the API that
 * replaces each one.
 *
 * An unbound global resolves to `undefined`, so a workflow calling a removed
 * helper would keep running and feed `undefined` into its downstream data. Both
 * engines therefore bind these names to a function that throws, which turns a
 * silent wrong result into an error naming the replacement.
 *
 * The VM engine cannot read this file: its context is bundled into the isolate
 * from `@n8n/expression-runtime`, which does not depend on this package. It
 * keeps its own copy, and `removed-globals.test.ts` fails if the two drift.
 */
export const REMOVED_EXPRESSION_GLOBALS = {
	$getPairedItem: "$('Node').item, $('Node').itemMatching(n), or $('Node').pairedItem(n)",
} as const;

export type RemovedExpressionGlobal = keyof typeof REMOVED_EXPRESSION_GLOBALS;

/** The message both engines raise when a removed global is called. */
export function removedGlobalMessage(name: RemovedExpressionGlobal): string {
	return `${name} was removed. Use ${REMOVED_EXPRESSION_GLOBALS[name]} instead`;
}
