import {
	ExecutionStatusList,
	isTerminalExecutionStatus,
	UNFINISHED_EXECUTION_STATUSES,
} from '../src/execution-status';

describe('UNFINISHED_EXECUTION_STATUSES', () => {
	it.each(ExecutionStatusList)('should hold %s only when the status is not terminal', (status) => {
		const isUnfinished = (UNFINISHED_EXECUTION_STATUSES as readonly string[]).includes(status);

		expect(isUnfinished).toBe(!isTerminalExecutionStatus(status));
	});
});
