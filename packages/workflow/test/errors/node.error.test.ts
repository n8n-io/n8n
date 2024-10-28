import { mock } from 'jest-mock-extended';
import type { INode } from '@/Interfaces';
import { NodeApiError } from '@/errors/node-api.error';
import { NodeOperationError } from '@/errors/node-operation.error';

describe('NodeError', () => {
	const node = mock<INode>();

	it('should update re-wrapped error level and message', () => {
		const apiError = new NodeApiError(node, { message: 'Some error happened', code: 500 });
		const opsError = new NodeOperationError(node, mock(), { message: 'Some operation failed' });
		const wrapped1 = new NodeOperationError(node, apiError);
		const wrapped2 = new NodeOperationError(node, opsError);

		expect(wrapped1).toEqual(apiError);
		expect(wrapped2).toEqual(opsError);
	});
});
