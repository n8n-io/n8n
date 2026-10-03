import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
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
		expect(result[0][0].error).toBeUndefined();
	});

	it('should fall back to the raw error detail for connection errors without a description', async () => {
		const connectionError = new NodeApiError(node, {
			message: 'connect ECONNREFUSED 10.0.0.5:443',
			code: 'ECONNREFUSED',
		});
		vi.mocked(alert.create.execute).mockRejectedValue(connectionError);
		executeFunctions.continueOnFail.mockReturnValue(true);

		const result = await router.call(executeFunctions);

		expect(result[0][0].json).toEqual({
			error: 'The service refused the connection - perhaps it is offline',
			description: 'connect ECONNREFUSED 10.0.0.5:443',
			httpCode: 'ECONNREFUSED',
		});
	});

	it('should attach the error to the item so core routes it to the error output', async () => {
		const apiError = new NodeApiError(node, {
			message: 'Alert test:ref:123 already exists in organisation Acme',
			httpCode: '400',
		});
		vi.mocked(alert.create.execute).mockRejectedValue(apiError);
		executeFunctions.continueOnFail.mockReturnValue(true);
		executeFunctions.getNode.mockReturnValue({ ...node, onError: 'continueErrorOutput' });

		const result = await router.call(executeFunctions);

		expect(result[0][0].error).toBe(apiError);
	});

	it('should attach a wrapped error to the item for non-node errors', async () => {
		vi.mocked(alert.create.execute).mockRejectedValue(new Error('some failure'));
		executeFunctions.continueOnFail.mockReturnValue(true);
		executeFunctions.getNode.mockReturnValue({ ...node, onError: 'continueErrorOutput' });

		const result = await router.call(executeFunctions);

		expect(result[0][0].error).toBeInstanceOf(NodeOperationError);
		expect((result[0][0].error as NodeOperationError).message).toBe('some failure');
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
