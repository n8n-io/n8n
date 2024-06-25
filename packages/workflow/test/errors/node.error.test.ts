import { mock } from 'jest-mock-extended';
import type { INode } from '@/Interfaces';
import { NodeApiError } from '@/errors/node-api.error';
import { NodeOperationError } from '@/errors/node-operation.error';

describe('NodeError', () => {
	const node = mock<INode>();

	it('should prevent errors from being re-wrapped', () => {
		const apiError = new NodeApiError(node, mock({ message: 'Some error happened', code: 500 }));
		const opsError = new NodeOperationError(node, mock());

		expect(new NodeOperationError(node, apiError)).toEqual(apiError);
		expect(new NodeOperationError(node, opsError)).toEqual(opsError);
	});
});
