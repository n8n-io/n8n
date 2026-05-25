import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { Harvest } from '../Harvest.node';

jest.mock('../GenericFunctions');

describe('Harvest Node', () => {
	let harvest: Harvest;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	const mockHarvestApiRequest = GenericFunctions.harvestApiRequest as jest.MockedFunction<
		typeof GenericFunctions.harvestApiRequest
	>;
	const mockGetAllResource = GenericFunctions.getAllResource as jest.MockedFunction<
		typeof GenericFunctions.getAllResource
	>;

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'Harvest',
		type: 'n8n-nodes-base.harvest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		harvest = new Harvest();
		mockExecuteFunctions = mock<IExecuteFunctions>({
			helpers: {
				constructExecutionMetaData: jest.fn((data: any, options: any) =>
					data.map((item: any) => ({
						...item,
						pairedItem: { item: options?.itemData?.item ?? 0 },
					})),
				),
				returnJsonArray: jest.fn((data: any) =>
					Array.isArray(data) ? data.map((d) => ({ json: d })) : [{ json: data }],
				),
			},
		});

		jest.clearAllMocks();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	describe('User resource', () => {
		it('should return all users on getAll', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'user',
					operation: 'getAll',
				};
				return params[paramName];
			});

			const mockUsers = [
				{ id: 1, first_name: 'Alice', last_name: 'Anderson', email: 'alice@example.com' },
				{ id: 2, first_name: 'Bob', last_name: 'Brown', email: 'bob@example.com' },
			];
			mockGetAllResource.mockResolvedValue(mockUsers);

			const result = await harvest.execute.call(mockExecuteFunctions);

			expect(mockGetAllResource).toHaveBeenCalledWith('users', 0);
			expect(result).toEqual([
				[
					{ json: mockUsers[0], pairedItem: { item: 0 } },
					{ json: mockUsers[1], pairedItem: { item: 0 } },
				],
			]);
		});

		it('should call the users/{id} endpoint on get', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'user',
					operation: 'get',
					id: '42',
				};
				return params[paramName];
			});

			const mockUser = { id: 42, first_name: 'Carol', last_name: 'Clarke' };
			mockHarvestApiRequest.mockResolvedValue(mockUser);

			const result = await harvest.execute.call(mockExecuteFunctions);

			expect(mockHarvestApiRequest).toHaveBeenCalledWith('GET', {}, 'users/42');
			expect(result).toEqual([[{ json: mockUser, pairedItem: { item: 0 } }]]);
		});
	});

	describe('Error handling', () => {
		it('should propagate a NodeApiError from the API request', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'user',
					operation: 'get',
					id: '999',
				};
				return params[paramName];
			});

			const apiError = new NodeApiError(mockNode, {
				message: 'Unauthorized',
				httpCode: '401',
			});
			mockHarvestApiRequest.mockRejectedValue(apiError);

			await expect(harvest.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeApiError);
		});

		it('should surface the error on the item when continueOnFail is true', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'user',
					operation: 'get',
					id: '999',
				};
				return params[paramName];
			});

			mockHarvestApiRequest.mockRejectedValue(new Error('User not found'));

			const result = await harvest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[{ json: { error: 'User not found' }, pairedItem: { item: 0 } }],
			]);
		});
	});
});
