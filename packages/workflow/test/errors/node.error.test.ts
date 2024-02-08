import { mock } from 'jest-mock-extended';
import type { INode } from '@/Interfaces';
import { NodeApiError } from '@/errors/node-api.error';
import { NodeOperationError } from '@/errors/node-operation.error';

describe('NodeError', () => {
	const node = mock<INode>();

	it('should update re-wrapped error level and message', () => {
		const apiError = new NodeApiError(node, mock({ message: 'Some error happened', code: 500 }));
		const opsError = new NodeOperationError(node, mock(), { message: 'Some operation failed' });
		const wrapped1 = new NodeOperationError(node, apiError);
		const wrapped2 = new NodeOperationError(node, opsError);

		expect(wrapped1.level).toEqual('error');
		expect(wrapped1.message).toEqual(
			'[RE-WRAPPED]: The service was not able to process your request',
		);
		expect(wrapped2.level).toEqual('error');
		expect(wrapped2.message).toEqual('[RE-WRAPPED]: Some operation failed');
	});
});
