import { mock, mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode, INodeTypeBaseDescription } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { MindeeV2 } from '../MindeeV2.node';

describe('MindeeV2 > execute', () => {
	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'Mindee',
		name: 'mindee',
		icon: 'file:mindee.svg',
		group: ['input'],
		description: 'Consume Mindee API',
	};

	function createContext(operation: string, continueOnFail: boolean) {
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 4 }));
		context.getNodeParameter.mockReturnValue(operation as never);
		context.continueOnFail.mockReturnValue(continueOnFail);
		return context;
	}

	it('should reject an operation outside the allow-list', async () => {
		const node = new MindeeV2(baseDescription);

		await expect(node.execute.call(createContext('../jobs', false))).rejects.toThrow(
			NodeOperationError,
		);
	});

	it('should return the error with its paired item when continue on fail is on', async () => {
		const node = new MindeeV2(baseDescription);

		const [output] = await node.execute.call(createContext('../jobs', true));

		expect(output).toEqual([
			{ json: { error: 'Unknown operation: ../jobs' }, pairedItem: { item: 0 } },
		]);
	});
});
