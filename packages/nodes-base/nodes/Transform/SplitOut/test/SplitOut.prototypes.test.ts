import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData, INodeTypeBaseDescription } from 'n8n-workflow';

import { SplitOut } from '../SplitOut.node';
import type { Mock } from 'vitest';

describe('SplitOut prototype pollution', () => {
	let node: SplitOut;
	let executeFunctions: IExecuteFunctions;

	beforeEach(() => {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Split Out',
			name: 'splitOut',
			icon: 'node:split-out',
			iconColor: 'violet',
			group: ['transform'],
			description: 'Turn a list inside item(s) into separate items',
		};
		node = new SplitOut();
		(node as unknown as { description: INodeTypeBaseDescription }).description = baseDescription;
		executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getInputData = vi.fn();
		executeFunctions.getNodeParameter = vi.fn();
		executeFunctions.getNode = vi.fn().mockReturnValue({});
	});

	it('should reject prototype pollution in destination field name', async () => {
		const items: INodeExecutionData[] = [
			{
				json: {
					data: {
						id: 1,
						name: 'Alice',
						items: [{ age: 20 }],
					},
				},
			},
		];

		(executeFunctions.getInputData as Mock<any>).mockReturnValue(items);
		(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
			if (paramName === 'fieldToSplitOut') return 'data.items';
			if (paramName === 'include') return 'noOtherFields';
			if (paramName === 'options') return { destinationFieldName: '__proto__.polluted' };
			return undefined;
		});

		await expect(node.execute.call(executeFunctions)).rejects.toThrow(
			'Invalid destination field name',
		);
	});
});
