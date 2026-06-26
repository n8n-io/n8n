import { mock } from 'vitest-mock-extended';

import { NodeApiError } from '../../src/errors/node-api.error';
import { NodeOperationError } from '../../src/errors/node-operation.error';
import type { INode } from '../../src/interfaces';

describe('NodeError', () => {
	const node = mock<INode>();

	it('should update re-wrapped error level and message', () => {
		vi.useFakeTimers({ now: new Date() });

		const apiError = new NodeApiError(node, { message: 'Some error happened', code: 500 });
		const opsError = new NodeOperationError(node, mock(), { message: 'Some operation failed' });
		const wrapped1 = new NodeOperationError(node, apiError);
		const wrapped2 = new NodeOperationError(node, opsError);

		expect(wrapped1.level).toEqual(apiError.level);
		expect(wrapped1.message).toEqual(apiError.message);
		expect(wrapped2).toEqual(opsError);

		vi.useRealTimers();
	});

	describe('shouldReport', () => {
		it('should keep shouldReport consistent with the default warning level for NodeApiError', () => {
			// A 404 (and other API errors) default to `level: 'warning'`, so they
			// must not be flagged for reporting. These subclasses set `level` after
			// `super()`, so `shouldReport` must reflect that final level.
			const apiError = new NodeApiError(node, { message: 'not found', code: 404 });

			expect(apiError.level).toBe('warning');
			expect(apiError.shouldReport).toBe(false);
		});

		it('should keep shouldReport consistent with the default warning level for NodeOperationError', () => {
			const opsError = new NodeOperationError(node, 'boom');

			expect(opsError.level).toBe('warning');
			expect(opsError.shouldReport).toBe(false);
		});

		it('should flag error-level node errors for reporting', () => {
			const opsError = new NodeOperationError(node, 'boom', { level: 'error' });

			expect(opsError.level).toBe('error');
			expect(opsError.shouldReport).toBe(true);
		});
	});
});
