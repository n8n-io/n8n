import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Race } from './Race.node';

describe('Race', () => {
	it('fails on the v1 engine, since only engine v2 runs it', async () => {
		const context = mock<IExecuteFunctions>();
		context.getNode.mockReturnValue(mock<INode>({ name: 'Race' }));

		await expect(new Race().execute.call(context)).rejects.toThrow(NodeOperationError);
		await expect(new Race().execute.call(context)).rejects.toThrow('only works on engine v2');
	});
});
