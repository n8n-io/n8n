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

/**
 * The calling `Execute Sub-workflow` node has a single main output, so items the
 * sub-workflow's last node put on any other branch have nowhere to go and are
 * dropped. Concatenate every branch into one, in branch order.
 */
export function mergeBranchesIntoSingleOutput(
	branches: Array<INodeExecutionData[] | null>,
): Array<INodeExecutionData[] | null> {
	if (branches.length <= 1) return branches;
	return [branches.flatMap((branch) => branch ?? [])];
}
