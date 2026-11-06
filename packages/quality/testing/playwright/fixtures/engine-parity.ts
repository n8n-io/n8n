import { UUID_V7_PATTERN } from '@n8n/constants';
import type { BrowserContext } from '@playwright/test';
import type { N8NConfig } from 'n8n-containers/stack';
import type { IWorkflowSettings, WorkflowExecuteMode } from 'n8n-workflow';

import { TestError } from '../Types';

/** The `engine-v2:e2e` project greps for this prefix, so every tag below is selected. */
export const ENGINE_TAG_PREFIX = '@engine:';

/**
 * Title tags that sort a spec into an engine v2 parity bucket. They only
 * matter under a stack that runs engine v2 (`engine-v2:e2e`); everywhere
 * else the spec runs as usual.
 */
export const ENGINE_TAGS = {
	/** Must pass on both engines. Runs there. */
	supported: `${ENGINE_TAG_PREFIX}v2`,
	/** Engine v2 will never support this behaviour. Skipped there. */
	unsupported: `${ENGINE_TAG_PREFIX}v1-only`,
	/** Engine v2 will support this, but does not yet. Expected to fail there. */
	pending: `${ENGINE_TAG_PREFIX}v2-pending`,
	/** Only engine v2 can run this. Skipped on a stack without it. */
	v2Only: `${ENGINE_TAG_PREFIX}v2-only`,
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
			`Unknown engine v2 tag: ${unknown.join(', ')}. Use one of: ${known.join(', ')}.`,
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

	if (!engine) {
		return tags.includes(ENGINE_TAGS.v2Only)
			? { action: 'skip', reason: 'Engine v1 does not support this test' }
			: { action: 'run' };
	}

	if (tags.includes(ENGINE_TAGS.unsupported)) {
		return { action: 'skip', reason: 'Engine v2 will never support this test' };
	}

	if (tags.includes(ENGINE_TAGS.pending)) {
		return { action: 'expect-fail', reason: 'Engine v2 does not support this test yet' };
	}

	return { action: 'run' };
}

/**
 * Workflow settings every API-created workflow gets on this stack. A stack
 * that runs engine v2 routes every workflow to it, so the same spec proves
 * parity without changes.
 */
export function workflowSettingsFor(config: N8NConfig): Partial<IWorkflowSettings> | undefined {
	if (!config.engine) return undefined;

	return { engineType: 'v2' };
}

/**
 * The modes the dispatcher sends to engine v2. Mirrors `ROUTED_MODES` in
 * `packages/cli/src/services/engine-v2-dispatcher.service.ts`.
 */
export const ROUTED_MODES: ReadonlySet<WorkflowExecuteMode> = new Set<WorkflowExecuteMode>([
	'manual',
	'webhook',
	'trigger',
]);

/**
 * Whether an execution id names a run on engine v2. A v1 id is numeric and a
 * v2 id is a uuidv7, which the engine validates on the wire
 * (`packages/cli/src/executions/execution-id.ts`), so the shape says which
 * plane ran it.
 */
export function isEngineV2ExecutionId(executionId: string): boolean {
	return UUID_V7_PATTERN.test(executionId);
}

/**
 * One message for every entry point, so a run that stayed on the legacy
 * engine names the same two causes wherever the spec started it.
 */
export function legacyEngineRunMessage(executionId: string): string {
	return (
		`Expected an engine v2 execution id, got "${executionId}", so the run stayed on the ` +
		'legacy engine. Either the workflow missed `settings.engineType`, which ' +
		'`api.workflows` applies from the stack, or this main does not run the `engine-v2` ' +
		'module.'
	);
}

export interface CanvasRunGuard {
	/** Throws when a run the browser started stayed on the legacy engine. */
	assertRoutedToEngine(): void;
	/** Call from a test that runs the legacy engine on purpose; the guard then stays silent for it. */
	allowLegacyRuns(): void;
}

/**
 * Watches the runs a context's pages start (`POST /rest/workflows/:id/run`: the
 * run button, a node's run button, the chat) and records every one the control
 * plane kept on the legacy engine. The fixture asserts after the test, so a run
 * from its page cannot pass on v1 unnoticed. A refused run and a
 * `waitingForWebhook` run carry no execution id and pass.
 */
export async function watchCanvasRuns(
	context: BrowserContext,
	workflowSettings: Partial<IWorkflowSettings> | undefined,
): Promise<CanvasRunGuard> {
	const legacyRuns: string[] = [];
	let legacyAllowed = false;

	if (workflowSettings?.engineType === 'v2') {
		await context.route(
			(url) => /\/rest\/workflows\/[^/]+\/run$/.test(url.pathname),
			async (route) => {
				const response = await route.fetch();
				if (response.ok()) {
					// A proxy error page is ok to the browser but not JSON; the route must still answer.
					const body = (await response.json().catch(() => null)) as { data?: unknown } | null;
					const run = (body?.data ?? body) as { executionId?: string } | null;
					const executionId = run?.executionId;
					if (executionId !== undefined && !isEngineV2ExecutionId(executionId)) {
						legacyRuns.push(executionId);
					}
				}
				await route.fulfill({ response });
			},
		);
	}

	return {
		assertRoutedToEngine() {
			if (legacyAllowed || legacyRuns.length === 0) return;
			throw new TestError(legacyRuns.map(legacyEngineRunMessage).join('\n'));
		},
		allowLegacyRuns() {
			legacyAllowed = true;
		},
	};
}
