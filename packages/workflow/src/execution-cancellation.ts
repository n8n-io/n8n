import { sleep } from '@n8n/utils/sleep';

import { NodeOperationError } from './errors';
import type { IExecuteFunctions } from './interfaces';

export function throwIfExecutionCancelled(context: IExecuteFunctions): void {
	if (context.getExecutionCancelSignal()?.aborted) {
		throw new NodeOperationError(context.getNode(), 'The execution was canceled');
	}
}

export async function sleepUnlessExecutionCancelled(
	context: IExecuteFunctions,
	ms: number,
): Promise<void> {
	throwIfExecutionCancelled(context);
	try {
		await sleep(ms, context.getExecutionCancelSignal());
	} catch (error) {
		throwIfExecutionCancelled(context);
		throw error;
	}
}
