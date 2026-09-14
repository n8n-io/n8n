import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from './constants';
import type { INodeExecutionData, IPinData } from './interfaces';

/**
 * The placeholder is FE-only and meant to be transient. If it ever appears in
 * pinData, the workflow's stored state has been corrupted (the placeholder
 * round-tripped through pinData → engine → DB), and any subsequent run will
 * reproduce the corruption. Use these helpers to detect and refuse it.
 */
export function isTrimmedNodeExecutionData(data: INodeExecutionData[] | null | undefined): boolean {
	return !!data?.some((entry) => entry?.json?.[TRIMMED_TASK_DATA_CONNECTIONS_KEY] === true);
}

export function getTrimmedPinDataNodeNames(pinData: IPinData | undefined): string[] {
	if (!pinData) return [];
	return Object.entries(pinData)
		.filter(([, items]) => Array.isArray(items) && isTrimmedNodeExecutionData(items))
		.map(([nodeName]) => nodeName);
}
