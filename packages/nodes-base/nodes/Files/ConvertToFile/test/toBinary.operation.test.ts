import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

import { execute } from '../actions/toBinary.operation';

describe('Convert to File: Move Base64 String to File', () => {
	const helpers = mock<IExecuteFunctions['helpers']>();
	const executeFunctions = mock<IExecuteFunctions>({ helpers });
	const items: INodeExecutionData[] = [{ json: { payload: 'aGk==' } }];

	beforeEach(() => {
		vi.clearAllMocks();
		helpers.prepareBinaryData.mockResolvedValue({ data: '', mimeType: 'text/plain' });
		executeFunctions.getNodeParameter.mockImplementation((name: string) => {
			const parameters = {
				options: {},
				binaryPropertyName: 'data',
				sourceProperty: 'payload',
			};
			return parameters[name as keyof typeof parameters];
		});
	});

	it('keeps permissive Base64 decoding for version 1.1', async () => {
		executeFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));

		await execute.call(executeFunctions, items);

		expect(helpers.prepareBinaryData.mock.calls[0][0]).toEqual(Buffer.from('hi'));
	});

	it('uses strict Base64 validation for version 1.2', async () => {
		executeFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));

		await expect(execute.call(executeFunctions, items)).rejects.toThrow(
			'The value in "payload" is not valid Base64 data',
		);
		expect(helpers.prepareBinaryData).not.toHaveBeenCalled();
	});

	it('keeps permissive byte-array conversion for version 1.1', async () => {
		executeFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));

		await execute.call(executeFunctions, [{ json: { payload: [300, -1] } }]);

		expect(helpers.prepareBinaryData.mock.calls[0][0]).toEqual(Buffer.from([44, 255]));
	});

	it('rejects invalid byte arrays for version 1.2', async () => {
		executeFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));

		await expect(
			execute.call(executeFunctions, [{ json: { payload: [300, -1] } }]),
		).rejects.toThrow('The value in "payload" is not valid Base64 data');
		expect(helpers.prepareBinaryData).not.toHaveBeenCalled();
	});
});
