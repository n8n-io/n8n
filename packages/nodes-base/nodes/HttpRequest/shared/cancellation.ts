import { sleep } from '@n8n/utils/sleep';
import { ManualExecutionCancelledError } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';

export function throwIfExecutionCancelled(context: IExecuteFunctions) {
	if (context.getExecutionCancelSignal()?.aborted) {
		throw new ManualExecutionCancelledError(context.getExecutionId());
	}
}

export async function sleepUnlessCancelled(context: IExecuteFunctions, ms: number) {
	throwIfExecutionCancelled(context);
	try {
		await sleep(ms, context.getExecutionCancelSignal());
	} catch (error) {
		throwIfExecutionCancelled(context);
		throw error;
	}
}
