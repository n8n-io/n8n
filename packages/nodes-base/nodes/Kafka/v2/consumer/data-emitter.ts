import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sleep } from '@n8n/utils/sleep';
import type { INodeExecutionData, IRun, ITriggerFunctions } from 'n8n-workflow';
import { NodeOperationError, OperationalError } from 'n8n-workflow';

import { DEFAULT_ERROR_RETRY_DELAY_MS } from '../../utils';

/** When a message's read position is recorded as done. Mirrors v1.3's option. */
export type ResolveOffsetMode = 'immediately' | 'onCompletion' | 'onSuccess' | 'onStatus';

/** Whether the caller may advance past the chunk it just handed over. */
export interface EmitResult {
	success: boolean;
}

export type DataEmitter = (items: INodeExecutionData[]) => Promise<EmitResult>;

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

const DEFAULT_EXECUTION_TIMEOUT_SECONDS = 3600;

/**
 * Builds the function that starts an execution for a chunk of items and decides
 * whether its offsets may advance. `success: false` means the caller must not
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
	const { resolveOffsetMode } = options;

	if (resolveOffsetMode === 'immediately') {
		return async (items) => {
			// Never start an execution once the trigger is closing.
			if (closeSignal.aborted) return { success: false };
			ctx.emit([items]);
			return { success: true };
		};
	}

	const allowedStatuses: string[] = [];
	if (resolveOffsetMode === 'onSuccess') {
		allowedStatuses.push('success');
	} else if (resolveOffsetMode === 'onStatus') {
		if (!options.allowedStatuses?.length) {
			throw new NodeOperationError(
				ctx.getNode(),
				'At least one execution status must be selected to resolve offsets on selected statuses.',
			);
		}
		allowedStatuses.push(...options.allowedStatuses);
	}

	const executionTimeoutSeconds =
		options.executionTimeoutSeconds ?? DEFAULT_EXECUTION_TIMEOUT_SECONDS;
	const errorRetryDelay = options.errorRetryDelay ?? DEFAULT_ERROR_RETRY_DELAY_MS;

	// Rejects on close; kept handled so it can never become an unhandled rejection.
	const abortPromise = new Promise<never>((_, reject) => {
		closeSignal.addEventListener(
			'abort',
			() =>
				reject(
					new OperationalError(
						'Trigger closed before the execution finished, offsets not resolved.',
					),
				),
			{ once: true },
		);
	});
	void abortPromise.catch(() => undefined);

	return async (items) => {
		if (closeSignal.aborted) return { success: false };

		let timeoutId: NodeJS.Timeout | undefined;
		try {
			const responsePromise = ctx.helpers.createDeferredPromise<IRun>();
			ctx.emit([items], undefined, responsePromise);

			const timeoutPromise = new Promise<IRun>((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(
						new NodeOperationError(
							ctx.getNode(),
							`Execution took longer than the configured workflow timeout of ${executionTimeoutSeconds} seconds to complete, offsets not resolved.`,
						),
					);
				}, executionTimeoutSeconds * 1000);
			});

			const run = await Promise.race([responsePromise.promise, timeoutPromise, abortPromise]);

			if (resolveOffsetMode !== 'onCompletion' && !allowedStatuses.includes(run.status)) {
				throw new NodeOperationError(
					ctx.getNode(),
					'Execution status is not allowed for resolving offsets, current status: ' + run.status,
				);
			}

			return { success: true };
		} catch (e) {
			// The retry backoff must not delay teardown.
			if (!closeSignal.aborted) {
				await Promise.race([sleep(errorRetryDelay), abortPromise.catch(() => undefined)]);
			}
			const error = ensureError(e);
			ctx.logger.error(error.message, { error });
			return { success: false };
		} finally {
			if (timeoutId) clearTimeout(timeoutId);
		}
	};
}
