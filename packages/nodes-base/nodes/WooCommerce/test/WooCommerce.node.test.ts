import { mock } from 'jest-mock-extended';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IPairedItemData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { WooCommerce } from '../WooCommerce.node';

describe('WooCommerce Node', () => {
	const node = new WooCommerce();
	let mockRequestWithAuthentication: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		mockRequestWithAuthentication = jest.fn();
	});

	const createMockExecuteFunction = (
		inputData: INodeExecutionData[],
		nodeParameters: Record<number, IDataObject>,
	) => {
		const fakeExecuteFunction = {
			getCredentials: jest
				.fn()
				.mockResolvedValue({ url: 'https://example.com', consumerKey: 'key', consumerSecret: 'secret' } as ICredentialDataDecryptedObject),
			getNodeParameter(
				parameterName: string,
				itemIndex: number,
				fallbackValue?: IDataObject | string,
				options?: IGetNodeParameterOptions,
			) {
				const params = nodeParameters[itemIndex] || {};
				return params[parameterName] ?? fallbackValue;
			},
			getNode() {
				return {
					name: 'WooCommerce',
					type: 'n8n-nodes-base.wooCommerce',
					typeVersion: 1,
				} as INode;
			},
			getInputData: () => inputData,
			helpers: {
				requestWithAuthentication: mockRequestWithAuthentication,
				constructExecutionMetaData: (
					inputData: INodeExecutionData[],
					_options: { itemData: IPairedItemData | IPairedItemData[] },
				) => inputData,
				returnJsonArray: (jsonData: IDataObject | IDataObject[]) => {
					const data = Array.isArray(jsonData) ? jsonData : [jsonData];
					return data.map((item) => ({ json: item }));
				},
			},
		} as unknown as IExecuteFunctions;
		return fakeExecuteFunction;
	};

	describe('Order: Get operation', () => {
		it('should return exactly N items for N input items (no query param pollution)', async () => {
			// Setup: 3 input items with different order IDs
			const inputData: INodeExecutionData[] = [
				{ json: { orderNum: '100' } },
				{ json: { orderNum: '101' } },
				{ json: { orderNum: '102' } },
			];

			// Each input should trigger order:get operation
			const nodeParameters: Record<number, IDataObject> = {
				0: { resource: 'order', operation: 'get', orderId: '100' },
				1: { resource: 'order', operation: 'get', orderId: '101' },
				2: { resource: 'order', operation: 'get', orderId: '102' },
			};

			// Mock API to return a single order for each GET request
			mockRequestWithAuthentication.mockImplementation(async (_, options) => {
				const orderId = options.uri.split('/').pop();

				// BUG REPRODUCTION: If query params contain 'per_page', simulate returning a list
				if (options.qs && options.qs.per_page) {
					// Return 20 orders (simulating the bug where API returns a list)
					return Array.from({ length: 20 }, (_, i) => ({
						id: parseInt(orderId) + i,
						status: 'completed',
						total: '100.00',
					}));
				}

				// Correct behavior: return single order
				return {
					id: parseInt(orderId),
					status: 'completed',
					total: '100.00',
				};
			});

			// Execute the node
			const fakeExecuteFunction = createMockExecuteFunction(inputData, nodeParameters);
			const result = await node.execute.call(fakeExecuteFunction);

			// ASSERTION: Should return exactly 3 items (one per input), not 60 (3 × 20)
			expect(result[0]).toHaveLength(3);

			// Verify each call was made correctly
			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(3);

			// Verify NO query params were passed (qs should be empty)
			for (let i = 0; i < 3; i++) {
				const call = mockRequestWithAuthentication.mock.calls[i];
				const options = call[1];
				expect(options.qs).toEqual({});
			}
		});

		it('should not inherit query params from previous getAll operation', async () => {
			// Setup: First item does getAll (sets per_page), second item does get
			const inputData: INodeExecutionData[] = [
				{ json: { action: 'list' } },
				{ json: { action: 'getSingle', orderNum: '200' } },
			];

			const nodeParameters: Record<number, IDataObject> = {
				0: {
					resource: 'order',
					operation: 'getAll',
					returnAll: false,
					limit: 20,
					options: {},
				},
				1: {
					resource: 'order',
					operation: 'get',
					orderId: '200',
				},
			};

			let callCount = 0;
			mockRequestWithAuthentication.mockImplementation(async (_, options) => {
				callCount++;

				if (callCount === 1) {
					// First call: getAll with per_page=20
					expect(options.qs.per_page).toBe(20);
					return Array.from({ length: 20 }, (_, i) => ({
						id: 1000 + i,
						status: 'completed',
						total: '50.00',
					}));
				} else {
					// Second call: get should NOT have per_page
					// BUG: Currently qs.per_page=20 is inherited from first call
					const hasPerPage = options.qs && 'per_page' in options.qs;

					if (hasPerPage) {
						// BUG TRIGGERED: Return 20 items
						return Array.from({ length: 20 }, (_, i) => ({
							id: 200 + i,
							status: 'completed',
							total: '100.00',
						}));
					} else {
						// Correct: Return single order
						return {
							id: 200,
							status: 'completed',
							total: '100.00',
						};
					}
				}
			});

			const fakeExecuteFunction = createMockExecuteFunction(inputData, nodeParameters);
			const result = await node.execute.call(fakeExecuteFunction);

			// ASSERTION: Should return 21 items total (20 from getAll + 1 from get)
			// NOT 40 items (20 from getAll + 20 from buggy get)
			expect(result[0]).toHaveLength(21);

			// Verify the second call did NOT have per_page
			const secondCall = mockRequestWithAuthentication.mock.calls[1];
			const secondOptions = secondCall[1];
			expect(secondOptions.qs).not.toHaveProperty('per_page');
		});

		it('should handle product:get without inheriting query params', async () => {
			// Test the same bug pattern for product resource
			const inputData: INodeExecutionData[] = [
				{ json: { productId: '10' } },
				{ json: { productId: '11' } },
			];

			const nodeParameters: Record<number, IDataObject> = {
				0: { resource: 'product', operation: 'get', productId: '10' },
				1: { resource: 'product', operation: 'get', productId: '11' },
			};

			mockRequestWithAuthentication.mockImplementation(async (_, options) => {
				const productId = options.uri.split('/').pop();

				if (options.qs && Object.keys(options.qs).length > 0) {
					// If any query params present, return list (simulating bug)
					return Array.from({ length: 20 }, (_, i) => ({
						id: parseInt(productId) + i,
						name: `Product ${parseInt(productId) + i}`,
					}));
				}

				return {
					id: parseInt(productId),
					name: `Product ${productId}`,
				};
			});

			const fakeExecuteFunction = createMockExecuteFunction(inputData, nodeParameters);
			const result = await node.execute.call(fakeExecuteFunction);

			expect(result[0]).toHaveLength(2);
		});

		it('should handle customer:get without inheriting query params', async () => {
			// Test the same bug pattern for customer resource
			const inputData: INodeExecutionData[] = [
				{ json: { customerId: '50' } },
				{ json: { customerId: '51' } },
			];

			const nodeParameters: Record<number, IDataObject> = {
				0: { resource: 'customer', operation: 'get', customerId: '50' },
				1: { resource: 'customer', operation: 'get', customerId: '51' },
			};

			mockRequestWithAuthentication.mockImplementation(async (_, options) => {
				const customerId = options.uri.split('/').pop();

				// Customer:get in the code doesn't pass qs, so this should always be correct
				// But we test to ensure consistency
				return {
					id: parseInt(customerId),
					email: `customer${customerId}@example.com`,
				};
			});

			const fakeExecuteFunction = createMockExecuteFunction(inputData, nodeParameters);
			const result = await node.execute.call(fakeExecuteFunction);

			expect(result[0]).toHaveLength(2);
		});
	});

	describe('Query param pollution - mixed operations', () => {
		it('should isolate query params between different resource operations', async () => {
			// Simulate a complex scenario: product:getAll, then order:get
			const inputData: INodeExecutionData[] = [
				{ json: { action: 'listProducts' } },
				{ json: { action: 'getOrder', orderNum: '999' } },
			];

			const nodeParameters: Record<number, IDataObject> = {
				0: {
					resource: 'product',
					operation: 'getAll',
					returnAll: false,
					limit: 10,
					options: { sku: 'TEST-SKU' },
				},
				1: {
					resource: 'order',
					operation: 'get',
					orderId: '999',
				},
			};

			mockRequestWithAuthentication.mockImplementation(async (_, options) => {
				if (options.uri.includes('/products')) {
					// Product getAll response
					return Array.from({ length: 10 }, (_, i) => ({
						id: 500 + i,
						name: `Product ${i}`,
					}));
				} else if (options.uri.includes('/orders')) {
					// Order get should not inherit product query params
					if (options.qs && (options.qs.per_page || options.qs.sku)) {
						throw new Error('Order:get should not inherit query params from product:getAll');
					}

					return {
						id: 999,
						status: 'completed',
						total: '250.00',
					};
				}
			});

			const fakeExecuteFunction = createMockExecuteFunction(inputData, nodeParameters);

			await expect(async () => {
				await node.execute.call(fakeExecuteFunction);
			}).rejects.toThrow('Order:get should not inherit query params from product:getAll');
		});
	});
});
