import type { IExecuteFunctions } from 'n8n-workflow';

import {
	SEVEN_API_BASE_URL,
	sevenApiRequest,
	sevenApiRequestAllItems,
} from '../v2/GenericFunctions';

describe('seven v2 -> sevenApiRequest', () => {
	const buildContext = (response: unknown) =>
		({
			getNode: jest.fn().mockReturnValue({ name: 'seven', type: 'n8n-nodes-base.sms77' }),
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue(response),
			},
		}) as unknown as IExecuteFunctions;

	it('uses the seven gateway base URL and X-Api-Key auth via the credential', async () => {
		const ctx = buildContext({ ok: true });

		await sevenApiRequest.call(ctx, 'POST', '/sms', { to: '4912345', text: 'hi' });

		expect(ctx.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'sms77Api',
			expect.objectContaining({
				method: 'POST',
				uri: `${SEVEN_API_BASE_URL}/sms`,
				body: { to: '4912345', text: 'hi' },
				json: true,
				headers: expect.objectContaining({ SentWith: 'n8n', Accept: 'application/json' }),
			}),
		);
	});

	it('passes query params for GET requests and omits the body when empty', async () => {
		const ctx = buildContext({ amount: 12.34, currency: 'EUR' });

		await sevenApiRequest.call(ctx, 'GET', '/pricing', {}, { country: 'DE', format: 'json' });

		const call = (ctx.helpers.requestWithAuthentication as jest.Mock).mock.calls[0][1];
		expect(call.qs).toEqual({ country: 'DE', format: 'json' });
		expect(call.body).toBeUndefined();
	});

	it('wraps API errors as NodeApiError', async () => {
		const ctx = {
			getNode: jest.fn().mockReturnValue({ name: 'seven', type: 'n8n-nodes-base.sms77' }),
			helpers: {
				requestWithAuthentication: jest
					.fn()
					.mockRejectedValue({ message: 'boom', statusCode: 500 }),
			},
		} as unknown as IExecuteFunctions;

		await expect(sevenApiRequest.call(ctx, 'GET', '/balance')).rejects.toMatchObject({
			name: 'NodeApiError',
		});
	});
});

describe('seven v2 -> sevenApiRequestAllItems', () => {
	it('paginates until a partial page is returned', async () => {
		const responses = [
			{ data: Array.from({ length: 100 }, (_, i) => ({ id: i + 1 })) },
			{ data: Array.from({ length: 100 }, (_, i) => ({ id: i + 101 })) },
			{ data: Array.from({ length: 30 }, (_, i) => ({ id: i + 201 })) },
		];
		let call = 0;
		const ctx = {
			getNode: jest.fn().mockReturnValue({ name: 'seven', type: 'n8n-nodes-base.sms77' }),
			helpers: {
				requestWithAuthentication: jest.fn().mockImplementation(async () => responses[call++]),
			},
		} as unknown as IExecuteFunctions;

		const result = await sevenApiRequestAllItems.call(ctx, 'GET', '/contacts');

		expect(result).toHaveLength(230);
		expect(result[0]).toEqual({ id: 1 });
		expect(result[229]).toEqual({ id: 230 });
		expect(ctx.helpers.requestWithAuthentication).toHaveBeenCalledTimes(3);
	});

	it('stops immediately when an empty page is returned', async () => {
		const ctx = {
			getNode: jest.fn().mockReturnValue({ name: 'seven', type: 'n8n-nodes-base.sms77' }),
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ data: [] }),
			},
		} as unknown as IExecuteFunctions;

		const result = await sevenApiRequestAllItems.call(ctx, 'GET', '/contacts');

		expect(result).toEqual([]);
		expect(ctx.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('handles a top-level array response (no data wrapper)', async () => {
		const ctx = {
			getNode: jest.fn().mockReturnValue({ name: 'seven', type: 'n8n-nodes-base.sms77' }),
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
			},
		} as unknown as IExecuteFunctions;

		const result = await sevenApiRequestAllItems.call(ctx, 'GET', '/groups');

		expect(result).toEqual([{ id: 1 }, { id: 2 }]);
	});
});
