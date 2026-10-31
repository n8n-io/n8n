import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { nasaApiRequest, nasaApiRequestAllItems } from '../GenericFunctions';

const API_KEY = 'test-api-key';
const DEFAULT_BASE_URL = 'https://api.nasa.gov';

const node: INode = {
	id: '1',
	name: 'NASA',
	type: 'n8n-nodes-base.nasa',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function createContext() {
	const context = mockDeep<IExecuteFunctions>();

	context.getNode.mockReturnValue(node);
	context.getCredentials.mockResolvedValue({ api_key: API_KEY });

	return context;
}

describe('NASA GenericFunctions', () => {
	describe('nasaApiRequest', () => {
		it('sends the request to the default base URL with the API key', async () => {
			const context = createContext();
			const response = { date: '2024-05-20', title: 'A picture' };
			context.helpers.request.mockResolvedValue(response);
			const qs = { date: '2024-05-20' };

			const result = await nasaApiRequest.call(context, 'GET', '/planetary/apod', qs);

			expect(result).toEqual(response);
			expect(qs).toHaveProperty('api_key', API_KEY);
			expect(context.helpers.request).toHaveBeenCalledWith({
				method: 'GET',
				qs: { date: '2024-05-20', api_key: API_KEY },
				uri: `${DEFAULT_BASE_URL}/planetary/apod`,
				json: true,
			});
		});

		it('uses the provided URI instead of the default base URL', async () => {
			const context = createContext();
			context.helpers.request.mockResolvedValue({ id: 'event-1' });
			const uri = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR';

			await nasaApiRequest.call(context, 'GET', '', {}, undefined, uri);

			expect(context.helpers.request).toHaveBeenCalledWith({
				method: 'GET',
				qs: { api_key: API_KEY },
				uri,
				json: true,
			});
		});

		it('merges additional request options', async () => {
			const context = createContext();
			context.helpers.request.mockResolvedValue(Buffer.from('image-bytes'));

			await nasaApiRequest.call(context, 'GET', '/planetary/earth/imagery', {}, { encoding: null });

			expect(context.helpers.request).toHaveBeenCalledWith({
				method: 'GET',
				qs: { api_key: API_KEY },
				uri: `${DEFAULT_BASE_URL}/planetary/earth/imagery`,
				json: true,
				encoding: null,
			});
		});

		it('wraps request failures in a NodeApiError', async () => {
			const context = createContext();
			context.helpers.request.mockRejectedValue(new Error('Request failed'));

			await expect(
				nasaApiRequest.call(context, 'GET', '/planetary/apod', {}),
			).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	describe('nasaApiRequestAllItems', () => {
		it('follows the next links and accumulates every page', async () => {
			const context = createContext();
			context.helpers.request
				.mockResolvedValueOnce({
					links: { next: `${DEFAULT_BASE_URL}/page-2` },
					near_earth_objects: [{ id: '1' }],
				})
				.mockResolvedValueOnce({
					links: {},
					near_earth_objects: [{ id: '2' }],
				});

			const result = await nasaApiRequestAllItems.call(
				context,
				'near_earth_objects',
				'GET',
				'/neo/rest/v1/neo/browse',
			);

			expect(result).toEqual([{ id: '1' }, { id: '2' }]);
			expect(context.helpers.request).toHaveBeenNthCalledWith(1, {
				method: 'GET',
				qs: { size: 20, api_key: API_KEY },
				uri: `${DEFAULT_BASE_URL}/neo/rest/v1/neo/browse`,
				json: true,
			});
			expect(context.helpers.request).toHaveBeenNthCalledWith(2, {
				method: 'GET',
				qs: { size: 20, api_key: API_KEY },
				uri: `${DEFAULT_BASE_URL}/page-2`,
				json: true,
			});
		});

		it('stops after the first page when there is no next link', async () => {
			const context = createContext();
			context.helpers.request.mockResolvedValue({
				links: {},
				near_earth_objects: [{ id: '1' }],
			});

			const result = await nasaApiRequestAllItems.call(
				context,
				'near_earth_objects',
				'GET',
				'/neo/rest/v1/neo/browse',
			);

			expect(result).toEqual([{ id: '1' }]);
			expect(context.helpers.request).toHaveBeenCalledTimes(1);
		});
	});
});
