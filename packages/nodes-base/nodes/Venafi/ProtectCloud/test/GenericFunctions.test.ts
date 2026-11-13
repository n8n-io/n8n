import { mock, mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { venafiApiRequest, venafiApiRequestAllItems } from '../GenericFunctions';

describe('venafiApiRequest', () => {
	it('should encode path values and join them with the region host', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('get');
		context.getCredentials.mockResolvedValue({ region: 'eu', apiKey: 'fake-api-key' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const certificateId = '6f8b0d2e/contents?x=1';
		await venafiApiRequest.call(
			context,
			'GET',
			requestPath`/outagedetection/v1/certificates/${certificateId}`,
		);

		expect(String(context.helpers.requestWithAuthentication.mock.calls[0][1].uri)).toBe(
			'https://api.venafi.eu/outagedetection/v1/certificates/6f8b0d2e%2Fcontents%3Fx=1',
		);
	});

	it('should reject a region that is not a host label', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('get');
		context.getCredentials.mockResolvedValue({ region: 'eu/x', apiKey: 'fake-api-key' });

		await expect(
			venafiApiRequest.call(context, 'GET', requestPath`/v1/preferences`),
		).rejects.toThrow('Invalid host');
		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should follow the path and query of the next page link on the region host', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('get');
		context.getCredentials.mockResolvedValue({ region: 'eu', apiKey: 'fake-api-key' });
		context.helpers.requestWithAuthentication
			.mockResolvedValueOnce({
				items: [1],
				_links: [
					{ Next: 'https://other.example/outagedetection/v1/certificates?page=2&tag=a&tag=b' },
				],
			})
			.mockResolvedValueOnce({ items: [2] });

		const result = await venafiApiRequestAllItems.call(
			context,
			'items',
			'GET',
			requestPath`/outagedetection/v1/certificates`,
			{},
			{ page: 1 },
		);

		expect(result).toEqual([1, 2]);
		const calls = context.helpers.requestWithAuthentication.mock.calls;
		expect(String(calls[0][1].uri)).toBe('https://api.venafi.eu/outagedetection/v1/certificates');
		expect(calls[0][1].qs).toEqual({ page: 1 });
		expect(String(calls[1][1].uri)).toBe('https://api.venafi.eu/outagedetection/v1/certificates');
		expect(calls[1][1].qs).toEqual({ page: '2', tag: ['a', 'b'] });
	});

	it('should keep the current path for a next page link with only a query', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('get');
		context.getCredentials.mockResolvedValue({ region: 'eu', apiKey: 'fake-api-key' });
		context.helpers.requestWithAuthentication
			.mockResolvedValueOnce({ items: [1], _links: [{ Next: '?page=2&__proto__=x' }] })
			.mockResolvedValueOnce({ items: [2] });

		await venafiApiRequestAllItems.call(
			context,
			'items',
			'GET',
			requestPath`/outagedetection/v1/certificates`,
		);

		const second = context.helpers.requestWithAuthentication.mock.calls[1][1];
		expect(String(second.uri)).toBe('https://api.venafi.eu/outagedetection/v1/certificates');
		expect(Object.getPrototypeOf(second.qs)).toBe(Object.prototype);
		expect(Object.keys(second.qs as object)).toEqual(['page', '__proto__']);
	});

	it('should not send a request to another host for a link that starts with a dot or at sign', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('get');
		context.getCredentials.mockResolvedValue({ region: 'eu', apiKey: 'fake-api-key' });
		context.helpers.requestWithAuthentication.mockImplementation(async (_name, options) =>
			String(options.uri).endsWith('/v1/start')
				? { items: [1], _links: [{ Next: '@other.example/page' }] }
				: { items: [2] },
		);

		await venafiApiRequestAllItems.call(context, 'items', 'GET', requestPath`/v1/start`);

		const uris = context.helpers.requestWithAuthentication.mock.calls.map(([, o]) => String(o.uri));
		expect(uris).toHaveLength(2);
		for (const uri of uris) expect(uri.startsWith('https://api.venafi.eu/')).toBe(true);
	});

	it('should throw and stop when the next page link is not valid', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('get');
		context.getNode.mockReturnValue(mock<INode>());
		context.getCredentials.mockResolvedValue({ region: 'eu', apiKey: 'fake-api-key' });
		context.helpers.requestWithAuthentication.mockResolvedValue({
			items: [1],
			_links: [{ Next: '/v1/items/%E0%A4%A' }],
		});

		await expect(
			venafiApiRequestAllItems.call(context, 'items', 'GET', requestPath`/v1/start`),
		).rejects.toThrow('Unexpected next page link');
		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
	});
});
