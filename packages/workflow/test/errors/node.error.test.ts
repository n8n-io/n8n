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
});
