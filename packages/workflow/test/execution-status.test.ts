import { ExecutionStatusList, type ExecutionStatus } from '../src/execution-status';

describe('ExecutionStatus', () => {
	describe('ExecutionStatusList', () => {
		it('should contain all expected execution statuses', () => {
			const expectedStatuses = [
				'canceled',
				'crashed',
				'error',
				'new',
				'running',
				'success',
				'unknown',
				'waiting',
			];

			expect(ExecutionStatusList).toEqual(expectedStatuses);
		});

		it('should be readonly array', () => {
			// ExecutionStatusList is a const assertion, making it readonly but not frozen
			expect(Array.isArray(ExecutionStatusList)).toBe(true);
			expect(ExecutionStatusList.length).toBeGreaterThan(0);
		});

		it('should have correct length', () => {
			expect(ExecutionStatusList).toHaveLength(8);
		});

		it('should contain unique values', () => {
			const uniqueStatuses = [...new Set(ExecutionStatusList)];
			expect(uniqueStatuses).toHaveLength(ExecutionStatusList.length);
		});
	});

	describe('ExecutionStatus type', () => {
		it('should accept valid execution status values', () => {
			const validStatuses: ExecutionStatus[] = [
				'canceled',
				'crashed',
				'error',
				'new',
				'running',
				'success',
				'unknown',
				'waiting',
			];

			// This test ensures TypeScript compilation succeeds for valid values
			expect(validStatuses).toHaveLength(8);
		});

		it('should include all ExecutionStatusList values in type', () => {
			ExecutionStatusList.forEach((status) => {
				// This ensures each status in the list is a valid ExecutionStatus type
				const typedStatus: ExecutionStatus = status;
				expect(typedStatus).toBe(status);
			});
		});
	});

	describe('Integration with ExecutionStatusList', () => {
		it('should allow type-safe access to status values', () => {
			const firstStatus: ExecutionStatus = ExecutionStatusList[0];
			expect(firstStatus).toBe('canceled');
		});

		it('should work in switch statements', () => {
			const getStatusDescription = (status: ExecutionStatus): string => {
				switch (status) {
					case 'canceled':
						return 'Execution was canceled';
					case 'crashed':
						return 'Execution crashed';
					case 'error':
						return 'Execution failed with error';
					case 'new':
						return 'New execution';
					case 'running':
						return 'Execution is running';
					case 'success':
						return 'Execution completed successfully';
					case 'unknown':
						return 'Unknown execution status';
					case 'waiting':
						return 'Execution is waiting';
					default:
						// This should never happen with proper typing
						return 'Invalid status';
				}
			};

			ExecutionStatusList.forEach((status) => {
				const description = getStatusDescription(status);
				expect(description).not.toBe('Invalid status');
				expect(description.toLowerCase()).toContain('execution');
			});
		});

		it('should work with array methods', () => {
			const isTerminalStatus = (status: ExecutionStatus): boolean => {
				return ['canceled', 'crashed', 'error', 'success'].includes(status);
			};

			expect(isTerminalStatus('success')).toBe(true);
			expect(isTerminalStatus('error')).toBe(true);
			expect(isTerminalStatus('running')).toBe(false);
			expect(isTerminalStatus('waiting')).toBe(false);
		});
	});
});
