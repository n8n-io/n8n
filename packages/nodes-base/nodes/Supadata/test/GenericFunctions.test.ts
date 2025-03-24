import { NodeApiError } from 'n8n-workflow';

import { supadataApiRequest, supadataApiRequestAllItems } from '../GenericFunctions';

const mockThis = {
	getCredentials: jest.fn(),
	helpers: {
		httpRequest: jest.fn(),
	},
	getNode: jest.fn(() => ({})),
};

describe('supadataApiRequest', () => {
	it('makes a successful request with body and query', async () => {
		mockThis.getCredentials.mockResolvedValue({ apiKey: 'test-key' });
		mockThis.helpers.httpRequest.mockResolvedValue({ success: true });

		const response = await supadataApiRequest.call(
			mockThis as any,
			'GET',
			'/test-endpoint',
			{ key: 'value' },
			{ q: 'search' },
		);

		expect(response).toEqual({ success: true });
		expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				headers: expect.objectContaining({ 'x-api-key': 'test-key' }),
				url: expect.stringContaining('/test-endpoint'),
				body: { key: 'value' },
				qs: { q: 'search' },
			}),
		);
	});

	it('throws NodeApiError on request failure', async () => {
		mockThis.getCredentials.mockResolvedValue({ apiKey: 'test-key' });
		mockThis.helpers.httpRequest.mockRejectedValue(new Error('Request failed'));

		await expect(
			supadataApiRequest.call(mockThis as any, 'POST', '/fail', { test: 'data' }),
		).rejects.toThrow(NodeApiError);
	});
});

describe('supadataApiRequestAllItems', () => {
	it('fetches paginated results correctly', async () => {
		mockThis.getCredentials.mockResolvedValue({ apiKey: 'test-key' });

		const page1 = { items: [{ id: 1 }], next: 'next-url' };
		const page2 = { items: [{ id: 2 }], next: undefined };

		const httpRequestMock = jest.fn().mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

		mockThis.helpers.httpRequest = httpRequestMock;

		const results = await supadataApiRequestAllItems.call(
			mockThis as any,
			'items',
			'GET',
			'/paginated',
		);

		expect(results).toEqual([{ id: 1 }, { id: 2 }]);
		expect(httpRequestMock).toHaveBeenCalledTimes(2);
	});
});
