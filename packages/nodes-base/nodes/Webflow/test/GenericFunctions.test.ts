import type {
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INode,
} from 'n8n-workflow';

import { webflowApiRequest, webflowApiRequestAllItems } from '../GenericFunctions';

describe('Webflow -> webflowApiRequestAllItems', () => {
	let mockExecuteFunctions: IExecuteFunctions | ILoadOptionsFunctions;

	const v1Response = {
		items: [
			{ id: '1', name: 'Item 1' },
			{ id: '2', name: 'Item 2' },
		],
		total: 2,
	};

	const v2Response = {
		body: {
			items: [
				{ id: '1', name: 'Item 1' },
				{ id: '2', name: 'Item 2' },
			],
			pagination: {
				total: 2,
			},
		},
	};

	const setupMockFunctions = (typeVersion: number) => {
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({ typeVersion }),
			getNodeParameter: jest.fn(),
			helpers: {
				httpRequestWithAuthentication: jest
					.fn()
					.mockResolvedValue(typeVersion === 1 ? v1Response : v2Response),
			},
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions;
		jest.clearAllMocks();
	};

	beforeEach(() => {
		setupMockFunctions(1);
	});

	it('should return all items for type version 1', async () => {
		const result = await webflowApiRequestAllItems.call(
			mockExecuteFunctions,
			'GET',
			'/collections/collection_id/items',
		);

		expect(result).toEqual(v1Response.items);
	});

	it('should return all items for type version 2', async () => {
		setupMockFunctions(2);

		const result = await webflowApiRequestAllItems.call(
			mockExecuteFunctions,
			'GET',
			'/collections/collection_id/items',
		);

		expect(result).toEqual(v2Response.body.items);
	});
});

describe('Webflow -> webflowApiRequest', () => {
	const node: INode = {
		id: '8e3c489c-4905-4bc4-9fc6-f1912d0766ec',
		name: 'Webflow',
		type: 'n8n-nodes-base.webflow',
		typeVersion: 2,
		position: [0, 0],
		credentials: {
			webflowOAuth2Api: {
				id: 'xxyyzz',
				name: 'credential name',
			},
		},
		parameters: {
			operation: 'update',
			itemId: 'xxx',
			siteId: 'yyy',
			collectionId: 'zzz',
			live: true,
		},
	};
	it('should use live in the url for v2 when live is true', async () => {
		const mockThis = {
			helpers: {
				httpRequestWithAuthentication: jest.fn().mockResolvedValue({ statusCode: 200, data: 'x' }),
			},
			getNode() {
				return node;
			},
			getNodeParameter: jest.fn(),
		} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

		const method: IHttpRequestMethods = 'PATCH';
		const resource = `/collections/${node.parameters.collectionId}/items/${node.parameters.itemId}${node.parameters.live ? '/live' : ''}`;

		await webflowApiRequest.call(mockThis, method, resource);

		expect(mockThis.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'webflowOAuth2Api',
			{
				method: 'PATCH',
				returnFullResponse: true,
				url: 'https://api.webflow.com/v2/collections/zzz/items/xxx/live',
				json: true,
			},
		);
	});
	it('should skip live in the url for v2 when live is false', async () => {
		const mockThis = {
			helpers: {
				httpRequestWithAuthentication: jest.fn().mockResolvedValue({ statusCode: 200, data: 'x' }),
			},
			getNode() {
				return node;
			},
			getNodeParameter: jest.fn(),
		} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

		node.parameters.live = false;

		const method: IHttpRequestMethods = 'PATCH';
		const resource = `/collections/${node.parameters.collectionId}/items/${node.parameters.itemId}${node.parameters.live ? '/live' : ''}`;

		await webflowApiRequest.call(mockThis, method, resource);

		expect(mockThis.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'webflowOAuth2Api',
			{
				method: 'PATCH',
				returnFullResponse: true,
				url: 'https://api.webflow.com/v2/collections/zzz/items/xxx',
				json: true,
			},
		);
	});
});
