import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { microsoftApiRequestAllItems } from '../../v2/transport';

describe('MicrosoftTeamsV2 transport, microsoftApiRequestAllItems', () => {
	const makeContext = (requestOAuth2: ReturnType<typeof vi.fn>) =>
		({
			getNodeParameter: vi.fn().mockReturnValue(undefined),
			getCredentials: vi.fn().mockResolvedValue({}),
			getNode: vi.fn().mockReturnValue({ name: 'Microsoft Teams' } as INode),
			helpers: { requestOAuth2 },
		}) as unknown as IExecuteFunctions;

	const optionsOfCall = (requestOAuth2: ReturnType<typeof vi.fn>, index: number) =>
		requestOAuth2.mock.calls[index][1] as { qs: Record<string, unknown>; uri?: string };

	it('forwards the query and stops before the next page once the limit is satisfied', async () => {
		const requestOAuth2 = vi.fn().mockResolvedValue({
			value: [{ id: '1' }, { id: '2' }, { id: '3' }],
			'@odata.nextLink': 'https://graph.microsoft.com/next-page',
		});
		const ctx = makeContext(requestOAuth2);

		const result = await microsoftApiRequestAllItems.call(
			ctx,
			'value',
			'GET',
			'/beta/teams/1/channels/2/messages',
			{},
			{ $top: 2 },
			2,
		);

		expect(result).toEqual([{ id: '1' }, { id: '2' }]);
		expect(requestOAuth2).toHaveBeenCalledTimes(1);
		expect(optionsOfCall(requestOAuth2, 0).qs).toEqual({ $top: 2 });
	});

	it('paginates until the limit is reached without re-sending the query', async () => {
		const page = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
		const requestOAuth2 = vi
			.fn()
			.mockResolvedValueOnce({
				value: page(50),
				'@odata.nextLink': 'https://graph.microsoft.com/next-page',
			})
			.mockResolvedValueOnce({ value: page(50) });
		const ctx = makeContext(requestOAuth2);

		const result = await microsoftApiRequestAllItems.call(
			ctx,
			'value',
			'GET',
			'/beta/teams/1/channels/2/messages',
			{},
			{ $top: 100 },
			100,
		);

		expect(result).toHaveLength(100);
		expect(requestOAuth2).toHaveBeenCalledTimes(2);
		expect(optionsOfCall(requestOAuth2, 0).qs).toEqual({ $top: 100 });
		expect(optionsOfCall(requestOAuth2, 1).qs).toEqual({});
		expect(optionsOfCall(requestOAuth2, 1).uri).toBe('https://graph.microsoft.com/next-page');
	});

	it('walks every page when no limit is set', async () => {
		const requestOAuth2 = vi
			.fn()
			.mockResolvedValueOnce({
				value: [{ id: '1' }],
				'@odata.nextLink': 'https://graph.microsoft.com/next-page',
			})
			.mockResolvedValueOnce({ value: [{ id: '2' }] });
		const ctx = makeContext(requestOAuth2);

		const result = await microsoftApiRequestAllItems.call(
			ctx,
			'value',
			'GET',
			'/v1.0/teams/1/channels',
		);

		expect(result).toEqual([{ id: '1' }, { id: '2' }]);
		expect(requestOAuth2).toHaveBeenCalledTimes(2);
		expect(optionsOfCall(requestOAuth2, 0).qs).toEqual({});
	});
});
