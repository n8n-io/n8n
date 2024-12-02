import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { webflowApiRequestAllItems } from '../GenericFunctions';

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
