import type { IExecuteSingleFunctions, IN8nHttpFullResponse } from 'n8n-workflow';

import { addNotePostReceiveAction, highLevelApiRequest } from '../GenericFunctions';
import type { Mock } from 'vitest';

describe('GenericFunctions - highLevelApiRequest', () => {
	let mockContext: any;
	let mockHttpRequestWithAuthentication: Mock;

	beforeEach(() => {
		mockHttpRequestWithAuthentication = vi.fn();
		mockContext = {
			helpers: {
				httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
			},
		};
	});

	test('should make a successful request with all parameters', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValueOnce(mockResponse);

		const method = 'POST';
		const resource = '/example-resource';
		const body = { key: 'value' };
		const qs = { query: 'test' };
		const url = 'https://custom-url.example.com/api';
		const option = { headers: { Authorization: 'Bearer test-token' } };

		const result = await highLevelApiRequest.call(
			mockContext,
			method,
			resource,
			body,
			qs,
			url,
			option,
		);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith('highLevelOAuth2Api', {
			headers: { Authorization: 'Bearer test-token' },
			method: 'POST',
			body: { key: 'value' },
			qs: { query: 'test' },
			url: 'https://custom-url.example.com/api',
			json: true,
		});

		expect(result).toEqual(mockResponse);
	});

	test('should default to the base URL when no custom URL is provided', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValueOnce(mockResponse);

		const method = 'GET';
		const resource = '/default-resource';

		const result = await highLevelApiRequest.call(mockContext, method, resource);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith('highLevelOAuth2Api', {
			headers: {
				'Content-Type': 'application/json',
				Version: '2021-07-28',
			},
			method: 'GET',
			url: 'https://services.leadconnectorhq.com/default-resource',
			json: true,
		});

		expect(result).toEqual(mockResponse);
	});

	test('should remove the body property if it is empty', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValueOnce(mockResponse);

		const method = 'DELETE';
		const resource = '/example-resource';
		const body = {};

		const result = await highLevelApiRequest.call(mockContext, method, resource, body);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith('highLevelOAuth2Api', {
			headers: {
				'Content-Type': 'application/json',
				Version: '2021-07-28',
			},
			method: 'DELETE',
			url: 'https://services.leadconnectorhq.com/example-resource',
			json: true,
		});

		expect(result).toEqual(mockResponse);
	});

	test('should remove the query string property if it is empty', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValueOnce(mockResponse);

		const method = 'PATCH';
		const resource = '/example-resource';
		const qs = {};

		const result = await highLevelApiRequest.call(mockContext, method, resource, {}, qs);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith('highLevelOAuth2Api', {
			headers: {
				'Content-Type': 'application/json',
				Version: '2021-07-28',
			},
			method: 'PATCH',
			url: 'https://services.leadconnectorhq.com/example-resource',
			json: true,
		});

		expect(result).toEqual(mockResponse);
	});
});

describe('addNotePostReceiveAction', () => {
	it('encodes the contact ID as one URL path segment', async () => {
		const httpRequestWithAuthentication = vi.fn().mockResolvedValue({});
		const context = {
			getNodeParameter: vi.fn().mockReturnValue('A note'),
			helpers: { httpRequestWithAuthentication },
		};

		await addNotePostReceiveAction.call(
			context as unknown as IExecuteSingleFunctions,
			[{ json: {} }],
			{
				body: { contact: { id: 'contact/id?x#y', locationId: 'location-id' } },
			} as IN8nHttpFullResponse,
		);

		expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
			'highLevelOAuth2Api',
			expect.objectContaining({
				url: 'https://services.leadconnectorhq.com/contacts/contact%2Fid%3Fx%23y/notes',
			}),
		);
	});

	it('rejects an invalid contact ID before sending a request', async () => {
		const httpRequestWithAuthentication = vi.fn();
		const context = {
			getNodeParameter: vi.fn().mockReturnValue('A note'),
			helpers: { httpRequestWithAuthentication },
		};

		await expect(
			addNotePostReceiveAction.call(context as unknown as IExecuteSingleFunctions, [{ json: {} }], {
				body: { contact: { id: '..', locationId: 'location-id' } },
			} as IN8nHttpFullResponse),
		).rejects.toThrow('Invalid identifier');

		expect(httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});
