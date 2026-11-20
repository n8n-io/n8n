import { createRunExecutionData, type ExecuteWorkflowData } from '../src';
import {
	attachSubExecutionRunData,
	takeAttachedSubExecutionRunData,
} from '../src/sub-execution-run-data';

describe('sub-execution run data', () => {
	const newResult = (): ExecuteWorkflowData => ({ executionId: '1', data: [[]] });

	it('should return the attached run data', () => {
		const runExecutionData = createRunExecutionData();
		const result = attachSubExecutionRunData(newResult(), runExecutionData);

		expect(takeAttachedSubExecutionRunData(result)).toBe(runExecutionData);
	});

	it('should keep the run data out of a copy and a serialization of the result', () => {
		const result = attachSubExecutionRunData(newResult(), createRunExecutionData());

		expect({ ...result }).toStrictEqual(newResult());
		expect(JSON.stringify(result)).toBe(JSON.stringify(newResult()));
	});

	it('should remove the run data from the result', () => {
		const result = attachSubExecutionRunData(newResult(), createRunExecutionData());

		takeAttachedSubExecutionRunData(result);

		expect(result).toEqual(newResult());
		expect(takeAttachedSubExecutionRunData(result)).toBeUndefined();
	});

	it('should return undefined when no run data is attached', () => {
		expect(takeAttachedSubExecutionRunData(newResult())).toBeUndefined();
	});
});
