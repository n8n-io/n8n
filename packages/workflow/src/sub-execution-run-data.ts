import type { ExecuteWorkflowData } from './interfaces';
import type { IRunExecutionData } from './run-execution-data/run-execution-data';

type WithSubExecutionRunData = ExecuteWorkflowData & {
	subExecutionRunData?: IRunExecutionData;
};

/**
 * Attaches the run data of a sub-execution to its result.
 * The property is not enumerable, so a copy or a serialization of the result does not include it.
 * Read back via {@link takeAttachedSubExecutionRunData}.
 */
export function attachSubExecutionRunData(
	result: ExecuteWorkflowData,
	runExecutionData: IRunExecutionData,
): ExecuteWorkflowData {
	return Object.defineProperty(result, 'subExecutionRunData', {
		value: runExecutionData,
		enumerable: false,
		configurable: true,
	});
}

/**
 * Reads back and removes the run data attached via {@link attachSubExecutionRunData}.
 * The run data is transport-only. Removal keeps it out of the result that the node gets.
 */
export function takeAttachedSubExecutionRunData(
	result: WithSubExecutionRunData,
): IRunExecutionData | undefined {
	const { subExecutionRunData } = result;
	Reflect.deleteProperty(result, 'subExecutionRunData');
	return subExecutionRunData;
}
