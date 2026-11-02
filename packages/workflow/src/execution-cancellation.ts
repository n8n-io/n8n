import { sleep } from '@n8n/utils/sleep';

import { NodeOperationError } from './errors';
import type { IAllExecuteFunctions } from './interfaces';

export function throwIfExecutionCancelled(context: IAllExecuteFunctions): void {
	if ('getExecutionCancelSignal' in context && context.getExecutionCancelSignal()?.aborted) {
		throw new NodeOperationError(context.getNode(), 'The execution was canceled');
	}
}

export async function sleepUnlessExecutionCancelled(
	context: IAllExecuteFunctions,
	ms: number,
): Promise<void> {
	throwIfExecutionCancelled(context);
	try {
		await sleep(
			ms,
			'getExecutionCancelSignal' in context ? context.getExecutionCancelSignal() : undefined,
		);
	} catch (error) {
		throwIfExecutionCancelled(context);
		throw error;
	}
}
