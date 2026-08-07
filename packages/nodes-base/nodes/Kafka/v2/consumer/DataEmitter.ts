import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sleep } from '@n8n/utils/sleep';
import type { INodeExecutionData, IRun, ITriggerFunctions } from 'n8n-workflow';
import { NodeOperationError, OperationalError } from 'n8n-workflow';

import { DEFAULT_ERROR_RETRY_DELAY_MS } from '../../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** When a message's read position is recorded as done. Mirrors v1.3's option. */
export type ResolveOffsetMode = 'immediately' | 'onCompletion' | 'onSuccess' | 'onStatus';

/** Whether the caller may advance past the chunk it just handed over. */
export interface OffsetVerdict {
	mayAdvance: boolean;
}

export type DataEmitter = (items: INodeExecutionData[]) => Promise<OffsetVerdict>;

/**
 * The slice of the trigger context the emitter needs, so it can be exercised
 * without a node.
 */
export type DataEmitterContext = Pick<ITriggerFunctions, 'emit' | 'logger' | 'getNode'> & {
	helpers: Pick<ITriggerFunctions['helpers'], 'createDeferredPromise'>;
};

export interface DataEmitterOptions {
	resolveOffsetMode: ResolveOffsetMode;
	/** Required when the mode is `onStatus`. */
	allowedStatuses?: string[];
	/** Seconds an execution may run before the wait is abandoned. */
	executionTimeoutSeconds?: number;
	errorRetryDelay?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_EXECUTION_TIMEOUT_SECONDS = 3600;

const ADVANCE: OffsetVerdict = { mayAdvance: true };
const HOLD_BACK: OffsetVerdict = { mayAdvance: false };

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Builds the function that starts an execution for a chunk of items and decides
 * whether its offsets may advance. `mayAdvance: false` means the caller must not
 * record the chunk as done, so Kafka delivers it again.
 *
 * `immediately` never waits, which is at-most-once. The other three wait for the
 * execution and are at-least-once. This mirrors v1's `configureDataEmitter`,
 * with the mode and its inputs resolved by the caller rather than read from node
 * parameters here.
 * @param ctx - Trigger context used to emit and log
 * @param options - Resolved offset mode and its inputs
 * @param closeSignal - Aborted on teardown, so a wait never outlives the trigger
 */
export function createDataEmitter(
	ctx: DataEmitterContext,
	options: DataEmitterOptions,
	closeSignal: AbortSignal,
): DataEmitter {
	return options.resolveOffsetMode === 'immediately'
		? createImmediateEmitter(ctx, closeSignal)
		: createAwaitingEmitter(ctx, options, closeSignal);
}

// ---------------------------------------------------------------------------
// The two emitter shapes
// ---------------------------------------------------------------------------

/** Hands the chunk over and advances at once, without waiting for the run. */
function createImmediateEmitter(ctx: DataEmitterContext, closeSignal: AbortSignal): DataEmitter {
	return async (items) => {
		// Never start an execution once the trigger is closing.
		if (closeSignal.aborted) return HOLD_BACK;
		ctx.emit([items]);
		return ADVANCE;
	};
}

/** Waits for the execution and advances only if its status is allowed. */
function createAwaitingEmitter(
	ctx: DataEmitterContext,
	options: DataEmitterOptions,
	closeSignal: AbortSignal,
): DataEmitter {
	const allowedStatuses = resolveAllowedStatuses(ctx, options);
	const deadlineSeconds = options.executionTimeoutSeconds ?? DEFAULT_EXECUTION_TIMEOUT_SECONDS;
	const errorRetryDelay = options.errorRetryDelay ?? DEFAULT_ERROR_RETRY_DELAY_MS;

	// Two views of the same event: one to end a wait with a reason, one to cut a
	// wait short quietly. Deriving the quiet one also keeps the rejection handled.
	const closedWithReason = rejectOnClose(closeSignal);
	const closedQuietly = closedWithReason.catch(() => undefined);

	return async (items) => {
		if (closeSignal.aborted) return HOLD_BACK;

		try {
			const run = await awaitExecution(ctx, items, deadlineSeconds, closedWithReason);

			if (allowedStatuses && !allowedStatuses.includes(run.status)) {
				throw new NodeOperationError(
					ctx.getNode(),
					`Execution status is not allowed for resolving offsets, current status: ${run.status}`,
				);
			}

			return ADVANCE;
		} catch (caught) {
			// The retry backoff must not delay teardown.
			if (!closeSignal.aborted) await Promise.race([sleep(errorRetryDelay), closedQuietly]);

			const error = ensureError(caught);
			// Teardown cancelling an in-flight execution is expected, not a failure,
			// so it must not surface as an error in the log.
			if (closeSignal.aborted) ctx.logger.debug(error.message, { error });
			else ctx.logger.error(error.message, { error });

			return HOLD_BACK;
		}
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The statuses that let the offset advance, or undefined when any status does. */
function resolveAllowedStatuses(
	ctx: DataEmitterContext,
	options: DataEmitterOptions,
): string[] | undefined {
	if (options.resolveOffsetMode === 'onCompletion') return undefined;
	if (options.resolveOffsetMode === 'onSuccess') return ['success'];

	if (!options.allowedStatuses?.length) {
		throw new NodeOperationError(
			ctx.getNode(),
			'At least one execution status must be selected to resolve offsets on selected statuses.',
		);
	}
	return options.allowedStatuses;
}

/** Rejects when the trigger closes, so a wait ends with a reason rather than hanging. */
async function rejectOnClose(closeSignal: AbortSignal): Promise<never> {
	return await new Promise<never>((_, reject) => {
		const fail = () =>
			reject(
				new OperationalError('Trigger closed before the execution finished, offsets not resolved.'),
			);
		if (closeSignal.aborted) return fail();
		closeSignal.addEventListener('abort', fail, { once: true });
	});
}

/**
 * Starts one execution and waits for it, bounded by the workflow's timeout and
 * by close.
 * @param deadlineSeconds - Zero or less means unbounded. n8n treats a workflow
 * timeout of <= 0 that way (workflow-execute-additional-data.ts:255), and handing
 * it to setTimeout would fire on the next tick and fail every hand-off.
 */
async function awaitExecution(
	ctx: DataEmitterContext,
	items: INodeExecutionData[],
	deadlineSeconds: number,
	closedWithReason: Promise<never>,
): Promise<IRun> {
	const response = ctx.helpers.createDeferredPromise<IRun>();
	ctx.emit([items], undefined, response);

	const finished = Promise.race([response.promise, closedWithReason]);
	if (deadlineSeconds <= 0) return await finished;

	let timer: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			finished,
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() =>
						reject(
							new NodeOperationError(
								ctx.getNode(),
								`Execution took longer than the configured workflow timeout of ${deadlineSeconds} seconds to complete, offsets not resolved.`,
							),
						),
					deadlineSeconds * 1000,
				);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}
