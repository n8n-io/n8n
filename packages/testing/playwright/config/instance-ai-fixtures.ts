import { nanoid } from 'nanoid';

import type { TestRequirements } from '../Types';

// ---------------------------------------------------------------------------
// SSE frame builder
// ---------------------------------------------------------------------------

interface SSEOptions {
	runId?: string;
	agentId?: string;
	userId?: string;
}

function sseFrame(id: number, data: object): string {
	return `id: ${id}\ndata: ${JSON.stringify(data)}\n\n`;
}

function defaults(opts?: SSEOptions) {
	return {
		runId: opts?.runId ?? nanoid(),
		agentId: opts?.agentId ?? nanoid(),
		userId: opts?.userId ?? 'user-test',
	};
}

// ---------------------------------------------------------------------------
// SSE event factories
// ---------------------------------------------------------------------------

/**
 * Builds a simple chat SSE stream: run-start -> text-delta -> run-finish.
 */
export function buildSimpleChatSSE(text: string, opts?: SSEOptions): string {
	const { runId, agentId, userId } = defaults(opts);
	const messageId = nanoid();

	return [
		sseFrame(1, {
			type: 'run-start',
			runId,
			agentId,
			userId,
			payload: { messageId },
		}),
		sseFrame(2, {
			type: 'text-delta',
			runId,
			agentId,
			userId,
			payload: { text },
		}),
		sseFrame(3, {
			type: 'run-finish',
			runId,
			agentId,
			userId,
			payload: { status: 'completed' },
		}),
	].join('');
}

/**
 * Builds a tool call SSE stream: run-start -> tool-call -> tool-result -> text-delta -> run-finish.
 */
export function buildToolCallSSE(
	toolName: string,
	args: Record<string, unknown>,
	result: unknown,
	opts?: SSEOptions,
): string {
	const { runId, agentId, userId } = defaults(opts);
	const messageId = nanoid();
	const toolCallId = nanoid();

	return [
		sseFrame(1, {
			type: 'run-start',
			runId,
			agentId,
			userId,
			payload: { messageId },
		}),
		sseFrame(2, {
			type: 'tool-call',
			runId,
			agentId,
			userId,
			payload: { toolCallId, toolName, args },
		}),
		sseFrame(3, {
			type: 'tool-result',
			runId,
			agentId,
			userId,
			payload: { toolCallId, result },
		}),
		sseFrame(4, {
			type: 'text-delta',
			runId,
			agentId,
			userId,
			payload: { text: `Completed ${toolName}` },
		}),
		sseFrame(5, {
			type: 'run-finish',
			runId,
			agentId,
			userId,
			payload: { status: 'completed' },
		}),
	].join('');
}

/**
 * Builds a tool error SSE stream: run-start -> tool-call -> tool-error -> run-finish.
 */
export function buildToolErrorSSE(
	toolName: string,
	args: Record<string, unknown>,
	error: string,
	opts?: SSEOptions,
): string {
	const { runId, agentId, userId } = defaults(opts);
	const messageId = nanoid();
	const toolCallId = nanoid();

	return [
		sseFrame(1, {
			type: 'run-start',
			runId,
			agentId,
			userId,
			payload: { messageId },
		}),
		sseFrame(2, {
			type: 'tool-call',
			runId,
			agentId,
			userId,
			payload: { toolCallId, toolName, args },
		}),
		sseFrame(3, {
			type: 'tool-error',
			runId,
			agentId,
			userId,
			payload: { toolCallId, error },
		}),
		sseFrame(4, {
			type: 'run-finish',
			runId,
			agentId,
			userId,
			payload: { status: 'error', reason: error },
		}),
	].join('');
}

/**
 * Builds a HITL confirmation SSE stream: run-start -> tool-call -> confirmation-request.
 * The run does NOT finish — the frontend must approve/deny to continue.
 */
export function buildHITLConfirmationSSE(
	requestId: string,
	message: string,
	opts?: SSEOptions,
): string {
	const { runId, agentId, userId } = defaults(opts);
	const messageId = nanoid();
	const toolCallId = nanoid();

	return [
		sseFrame(1, {
			type: 'run-start',
			runId,
			agentId,
			userId,
			payload: { messageId },
		}),
		sseFrame(2, {
			type: 'tool-call',
			runId,
			agentId,
			userId,
			payload: { toolCallId, toolName: 'run-workflow', args: {} },
		}),
		sseFrame(3, {
			type: 'confirmation-request',
			runId,
			agentId,
			userId,
			payload: {
				requestId,
				toolCallId,
				toolName: 'run-workflow',
				args: {},
				severity: 'warning',
				message,
			},
		}),
	].join('');
}

/**
 * Builds the SSE stream that follows after an approval:
 * tool-result -> text-delta -> run-finish.
 */
export function buildPostApprovalSSE(toolCallId: string, opts?: SSEOptions): string {
	const { runId, agentId, userId } = defaults(opts);

	return [
		sseFrame(1, {
			type: 'tool-result',
			runId,
			agentId,
			userId,
			payload: { toolCallId, result: 'Approved by user' },
		}),
		sseFrame(2, {
			type: 'text-delta',
			runId,
			agentId,
			userId,
			payload: { text: 'Action approved and executed.' },
		}),
		sseFrame(3, {
			type: 'run-finish',
			runId,
			agentId,
			userId,
			payload: { status: 'completed' },
		}),
	].join('');
}

/**
 * Builds an error SSE stream: run-start -> error -> run-finish(error).
 */
export function buildErrorSSE(errorMessage: string, opts?: SSEOptions): string {
	const { runId, agentId, userId } = defaults(opts);
	const messageId = nanoid();

	return [
		sseFrame(1, {
			type: 'run-start',
			runId,
			agentId,
			userId,
			payload: { messageId },
		}),
		sseFrame(2, {
			type: 'error',
			runId,
			agentId,
			userId,
			payload: { content: errorMessage },
		}),
		sseFrame(3, {
			type: 'run-finish',
			runId,
			agentId,
			userId,
			payload: { status: 'error', reason: errorMessage },
		}),
	].join('');
}

/**
 * Builds a plan-update SSE stream: run-start -> plan-update -> run-finish.
 */
export function buildPlanSSE(
	goal: string,
	steps: Array<{ phase: string; description: string; status: string }>,
	opts?: SSEOptions,
): string {
	const { runId, agentId, userId } = defaults(opts);
	const messageId = nanoid();

	return [
		sseFrame(1, {
			type: 'run-start',
			runId,
			agentId,
			userId,
			payload: { messageId },
		}),
		sseFrame(2, {
			type: 'plan-update',
			runId,
			agentId,
			userId,
			payload: {
				plan: {
					goal,
					currentPhase: 'build',
					iteration: 0,
					steps,
				},
			},
		}),
		sseFrame(3, {
			type: 'run-finish',
			runId,
			agentId,
			userId,
			payload: { status: 'completed' },
		}),
	].join('');
}

/**
 * Builds a delegation SSE stream: run-start -> agent-spawned -> agent-completed -> run-finish.
 */
export function buildDelegationSSE(
	childRole: string,
	childResult: string,
	opts?: SSEOptions,
): string {
	const { runId, agentId, userId } = defaults(opts);
	const messageId = nanoid();
	const childAgentId = nanoid();

	return [
		sseFrame(1, {
			type: 'run-start',
			runId,
			agentId,
			userId,
			payload: { messageId },
		}),
		sseFrame(2, {
			type: 'agent-spawned',
			runId,
			agentId: childAgentId,
			userId,
			payload: {
				parentId: agentId,
				role: childRole,
				tools: [],
			},
		}),
		sseFrame(3, {
			type: 'agent-completed',
			runId,
			agentId: childAgentId,
			userId,
			payload: {
				role: childRole,
				result: childResult,
			},
		}),
		sseFrame(4, {
			type: 'text-delta',
			runId,
			agentId,
			userId,
			payload: { text: childResult },
		}),
		sseFrame(5, {
			type: 'run-finish',
			runId,
			agentId,
			userId,
			payload: { status: 'completed' },
		}),
	].join('');
}

// ---------------------------------------------------------------------------
// Test requirements
// ---------------------------------------------------------------------------

/**
 * TestRequirements for Instance AI tests.
 *
 * The `setupRequirements` fixture intercepts `config.settings` for FrontendSettings.
 * Module settings need separate `page.route()` interception — see `setupInstanceAiMocks`.
 */
export const instanceAiEnabledRequirements: TestRequirements = {
	config: {
		settings: {},
	},
};
