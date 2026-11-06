import { mock } from 'vitest-mock-extended';
import type {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INode,
	INodeExecutionData,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { userOperations } from '../UserDescription';

const getOption = (userOperations[0].options as INodePropertyOptions[]).find(
	(option) => option.value === 'get',
)!;
const handleGetUserErrors = getOption.routing!.output!.postReceive![0] as (
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
) => Promise<INodeExecutionData[]>;

describe('n8n Node User get', () => {
	const context = mock<IExecuteSingleFunctions>();
	context.getNode.mockReturnValue(mock<INode>({ name: 'n8n' }));
	context.getNodeParameter.mockReturnValue('missing@example.com');

	const response = (statusCode: number, body: IDataObject = {}) =>
		mock<IN8nHttpFullResponse>({ statusCode, body, statusMessage: 'Error' });

	it('returns the items unchanged on a successful response', async () => {
		const items = [{ json: { id: 'user-1' } }];

		await expect(handleGetUserErrors.call(context, items, response(200))).resolves.toBe(items);
	});

	it('throws a user not found error that names the requested user on 404', async () => {
		const result = handleGetUserErrors.call(context, [], response(404));

		await expect(result).rejects.toThrow(NodeOperationError);
		await expect(result).rejects.toThrow('User not found: missing@example.com');
	});

	it('throws an API error with the status code on other error responses', async () => {
		const result = handleGetUserErrors.call(context, [], response(403, { message: 'Forbidden' }));

		await expect(result).rejects.toThrow(NodeApiError);
		await expect(result).rejects.toMatchObject({ httpCode: '403' });
	});
});
