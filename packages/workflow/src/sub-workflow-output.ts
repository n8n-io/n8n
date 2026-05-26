import type { INodeExecutionData, ITaskData } from './interfaces';

/**
 * For each output branch, concatenate items from every run in the order they were produced.
 */
export function mergeRunsPerBranch(runs: ITaskData[]): Array<INodeExecutionData[] | null> {
	const branchCount = runs.reduce((max, run) => Math.max(max, run.data?.main?.length ?? 0), 0);
	return Array.from({ length: branchCount }, (_, branch) =>
		runs.flatMap((run) => run.data?.main?.[branch] ?? []),
	);
}
