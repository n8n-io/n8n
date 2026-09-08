import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sleep } from '@n8n/utils/sleep';
import { NodeOperationError, OperationalError } from 'n8n-workflow';
import { MAX_TIMER_DELAY_MS, resolveRetryDelay } from '../../utils';
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/**
 * The wait an absent workflow execution timeout falls back to. Exported because
 * the consumer's processing deadline has to agree with it: if the emitter waits
 * an hour for an execution the broker fenced ten minutes in, the message is
 * redelivered while n8n still thinks the run owns it.
 */
export const DEFAULT_EXECUTION_TIMEOUT_SECONDS = 3600;
// Every hand-off returns one of these two, so they are shared rather than
// rebuilt. Frozen because a caller mutating the one it was handed would change
// the verdict every later hand-off gets. `readonly` on the field catches that
// at compile time; the freeze covers callers outside this package's types.
const ADVANCE = Object.freeze({ mayAdvance: true });
const HOLD_BACK = Object.freeze({ mayAdvance: false });
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
export function createDataEmitter(ctx, options, closeSignal) {
    return options.resolveOffsetMode === 'immediately'
        ? createImmediateEmitter(ctx, closeSignal)
        : createAwaitingEmitter(ctx, options, closeSignal);
}
// ---------------------------------------------------------------------------
// The two emitter shapes
// ---------------------------------------------------------------------------
/** Hands the chunk over and advances at once, without waiting for the run. */
function createImmediateEmitter(ctx, closeSignal) {
    return async (items) => {
        // Never start an execution once the trigger is closing.
        if (closeSignal.aborted)
            return HOLD_BACK;
        ctx.emit([items]);
        return ADVANCE;
    };
}
/** Waits for the execution and advances only if its status is allowed. */
function createAwaitingEmitter(ctx, options, closeSignal) {
    const allowedStatuses = resolveAllowedStatuses(ctx, options);
    const deadlineSeconds = options.executionTimeoutSeconds ?? DEFAULT_EXECUTION_TIMEOUT_SECONDS;
    const errorRetryDelay = resolveRetryDelay(options.errorRetryDelay, ctx.logger);
    // Two views of closing, because the two waits below want different things.
    // The rejecting one ends the wait for an execution with a reason, which is
    // what gets logged. The quiet one only needs to stop the retry pause, and
    // deriving it here also handles the rejection, so the one that loses the race
    // is not reported as an unhandled rejection.
    const closedWithReason = rejectOnClose(closeSignal);
    const closedQuietly = closedWithReason.catch(() => undefined);
    return async (items) => {
        if (closeSignal.aborted)
            return HOLD_BACK;
        try {
            const run = await awaitExecution(ctx, items, deadlineSeconds, closedWithReason);
            if (allowedStatuses && !allowedStatuses.includes(run.status)) {
                throw new NodeOperationError(ctx.getNode(), `Execution status is not allowed for resolving offsets, current status: ${run.status}`);
            }
            return ADVANCE;
        }
        catch (caught) {
            // The retry backoff must not delay teardown.
            if (!closeSignal.aborted)
                await Promise.race([sleep(errorRetryDelay), closedQuietly]);
            const error = ensureError(caught);
            // Teardown cancelling an in-flight execution is expected, not a failure,
            // so it must not surface as an error in the log.
            if (closeSignal.aborted)
                ctx.logger.debug(error.message, { error });
            else
                ctx.logger.error(error.message, { error });
            return HOLD_BACK;
        }
    };
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** The statuses that let the offset advance, or undefined when any status does. */
function resolveAllowedStatuses(ctx, options) {
    if (options.resolveOffsetMode === 'onCompletion')
        return undefined;
    if (options.resolveOffsetMode === 'onSuccess')
        return ['success'];
    if (!options.allowedStatuses?.length) {
        throw new NodeOperationError(ctx.getNode(), 'At least one execution status must be selected to resolve offsets on selected statuses.');
    }
    return options.allowedStatuses;
}
/** Rejects when the trigger closes, so a wait ends with a reason rather than hanging. */
async function rejectOnClose(closeSignal) {
    return await new Promise((_, reject) => {
        const fail = () => reject(new OperationalError('Trigger closed before the execution finished, offsets not resolved.'));
        // The abort event fires once. If it already fired, no listener would run.
        if (closeSignal.aborted)
            return fail();
        closeSignal.addEventListener('abort', fail, { once: true });
    });
}
/**
 * Starts one execution and waits for it, bounded by the workflow's timeout and
 * by close.
 * @param deadlineSeconds - Zero or less means unbounded. n8n treats a workflow
 * timeout of <= 0 that way (workflow-execute-additional-data.ts:255), and handing
 * it to setTimeout would fire on the next tick and fail every hand-off. A
 * deadline too large for a timer is treated the same way, for the same reason.
 */
async function awaitExecution(ctx, items, deadlineSeconds, closedWithReason) {
    const response = ctx.helpers.createDeferredPromise();
    ctx.emit([items], undefined, response);
    const finished = Promise.race([response.promise, closedWithReason]);
    if (deadlineSeconds <= 0)
        return await finished;
    // Past the 32-bit timer limit setTimeout fires after 1ms instead of waiting,
    // which would fail every hand-off rather than time out a slow one. A deadline
    // of 24 days or more is unbounded in practice, so treat it as such.
    const deadlineMs = deadlineSeconds * 1000;
    if (deadlineMs > MAX_TIMER_DELAY_MS)
        return await finished;
    let timer;
    try {
        return await Promise.race([
            finished,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new NodeOperationError(ctx.getNode(), `Execution took longer than the configured workflow timeout of ${deadlineSeconds} seconds to complete, offsets not resolved.`)), deadlineMs);
            }),
        ]);
    }
    finally {
        clearTimeout(timer);
    }
}
//# sourceMappingURL=DataEmitter.js.map