import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import * as alert from '../actions/alert';
import { router } from '../actions/router';

vi.mock('../actions/alert', () => ({
	create: { execute: vi.fn() },
}));

const node: INode = {
	id: '1',
	name: 'TheHive 5',
	type: 'n8n-nodes-base.theHiveProject',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('TheHiveProject router error handling', () => {
	let executeFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	beforeEach(() => {
		vi.clearAllMocks();

		executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNode.mockReturnValue(node);
		executeFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			const parameters: Record<string, string> = {
				resource: 'alert',
				operation: 'create',
			};
			return parameters[parameterName];
		});
		executeFunctions.helpers.returnJsonArray.mockImplementation((data) => [
			{ json: data } as INodeExecutionData,
		]);
		executeFunctions.helpers.constructExecutionMetaData.mockImplementation((data, { itemData }) =>
			data.map((item) => ({ ...item, pairedItem: itemData })),
		);
	});

	it('should include error description and http code in the error output item', async () => {
		const apiError = new NodeApiError(node, {
			message: 'Alert test:ref:123 already exists in organisation Acme',
			httpCode: '400',
		});
		vi.mocked(alert.create.execute).mockRejectedValue(apiError);
		executeFunctions.continueOnFail.mockReturnValue(true);

		const result = await router.call(executeFunctions);

		expect(result[0][0].json).toEqual({
			error: 'Bad request - please check your parameters',
			description: 'Alert test:ref:123 already exists in organisation Acme',
			httpCode: '400',
		});
		expect(result[0][0].pairedItem).toEqual({ item: 0 });
	});

	it('should output null description and http code for errors without them', async () => {
		vi.mocked(alert.create.execute).mockRejectedValue(new Error('some failure'));
		executeFunctions.continueOnFail.mockReturnValue(true);

		const result = await router.call(executeFunctions);

		expect(result[0][0].json).toEqual({
			error: 'some failure',
			description: null,
			httpCode: null,
		});
	});

	it('should throw when continueOnFail is false', async () => {
		const apiError = new NodeApiError(node, {
			message: 'Alert test:ref:123 already exists in organisation Acme',
			httpCode: '400',
		});
		vi.mocked(alert.create.execute).mockRejectedValue(apiError);
		executeFunctions.continueOnFail.mockReturnValue(false);

		await expect(router.call(executeFunctions)).rejects.toThrow(apiError);
	});
});
