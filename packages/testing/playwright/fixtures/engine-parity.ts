import type { N8NConfig } from 'n8n-containers/stack';
import type { IWorkflowSettings } from 'n8n-workflow';

/** The `engine-v2:e2e` project greps for this prefix, so every tag below is selected. */
export const ENGINE_TAG_PREFIX = '@engine:';

/**
 * Title tags that sort a spec into an engine 2.0 parity bucket. They only
 * matter under a stack that runs engine 2.0 (`engine-v2:e2e`); everywhere
 * else the spec runs as usual.
 */
export const ENGINE_TAGS = {
	/** Must pass on both engines. Runs there. */
	supported: `${ENGINE_TAG_PREFIX}v2`,
	/** Engine 2.0 will never support this behaviour. Skipped there. */
	unsupported: `${ENGINE_TAG_PREFIX}v1-only`,
	/** Engine 2.0 will support this, but does not yet. Expected to fail there. */
	pending: `${ENGINE_TAG_PREFIX}v2-pending`,
} as const;

/**
 * A tag that starts with the prefix but names no bucket is a typo. The
 * `engine-v2:e2e` project greps for the prefix, so it would be selected and
 * then treated as supported: a spec meant to be skipped or to fail becomes a
 * required green, and the required check goes red with nothing naming the tag.
 */
function assertKnownTags(tags: readonly string[]): void {
	const known: readonly string[] = Object.values(ENGINE_TAGS);
	const unknown = tags.filter((tag) => tag.startsWith(ENGINE_TAG_PREFIX) && !known.includes(tag));

	if (unknown.length > 0) {
		// The separator carries no behaviour, and pinning the whole sentence to catch
		// it breaks on any rewording.
		throw new Error(
			// Stryker disable next-line StringLiteral
			`Unknown engine 2.0 tag: ${unknown.join(', ')}. Use one of: ${known.join(', ')}.`,
		);
	}
}

export type EngineParityDisposition =
	| { action: 'run' }
	| { action: 'skip' | 'expect-fail'; reason: string };

/**
 * What the parity fixture does with a test, given its tags and the engine
 * mode of the stack it runs on.
 */
export function engineParityDisposition(
	tags: readonly string[],
	engine: N8NConfig['engine'],
): EngineParityDisposition {
	assertKnownTags(tags);

	if (!engine) return { action: 'run' };

	if (tags.includes(ENGINE_TAGS.unsupported)) {
		return { action: 'skip', reason: 'Engine 2.0 will never support this test' };
	}

	if (tags.includes(ENGINE_TAGS.pending)) {
		return { action: 'expect-fail', reason: 'Engine 2.0 does not support this test yet' };
	}

	return { action: 'run' };
}

/**
 * Workflow settings every API-created workflow gets on this stack. A stack
 * that runs engine 2.0 routes every workflow to it, so the same spec proves
 * parity without changes.
 */
export function workflowSettingsFor(config: N8NConfig): Partial<IWorkflowSettings> | undefined {
	if (!config.engine) return undefined;

	return { engineType: 'v2' };
}
