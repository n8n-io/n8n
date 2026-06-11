import type { IHookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { gumroadApiRequest } from '../GenericFunctions';

describe('Gumroad GenericFunctions', () => {
	const baseUrl = 'https://api.gumroad.com/v2';

	const buildContext = (authentication: 'accessToken' | 'oAuth2') =>
		({
			getNodeParameter: jest.fn().mockImplementation((param: string) => {
				if (param === 'authentication') return authentication;
				return undefined;
			}),
			helpers: {
				httpRequestWithAuthentication: jest.fn(),
			},
			getNode: jest.fn().mockReturnValue({
				id: 'test-node-id',
				name: 'Gumroad Trigger',
				type: 'n8n-nodes-base.gumroadTrigger',
				typeVersion: 1,
			}),
		}) as unknown as IHookFunctions;

	describe('gumroadApiRequest', () => {
		it('should call httpRequestWithAuthentication with gumroadApi when authentication is accessToken', async () => {
			const ctx = buildContext('accessToken');
			(ctx.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				resource_subscriptions: [],
			});

			const result = await gumroadApiRequest.call(ctx, 'GET', '/resource_subscriptions');

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'gumroadApi',
				expect.objectContaining({
					method: 'GET',
					url: `${baseUrl}/resource_subscriptions`,
					json: true,
				}),
			);
			expect(result).toEqual({ resource_subscriptions: [] });
		});

		it('should call httpRequestWithAuthentication with gumroadOAuth2Api when authentication is oAuth2', async () => {
			const ctx = buildContext('oAuth2');
			(ctx.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({
				resource_subscriptions: [],
			});

			const result = await gumroadApiRequest.call(ctx, 'GET', '/resource_subscriptions');

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'gumroadOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					url: `${baseUrl}/resource_subscriptions`,
					json: true,
				}),
			);
			expect(result).toEqual({ resource_subscriptions: [] });
		});

		it('should pass body and query string through to the auth helper', async () => {
			const ctx = buildContext('accessToken');
			(ctx.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue({});

			await gumroadApiRequest.call(
				ctx,
				'PUT',
				'/resource_subscriptions',
				{ post_url: 'https://example.com/hook', resource_name: 'sale' },
				{ foo: 'bar' },
			);

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'gumroadApi',
				expect.objectContaining({
					method: 'PUT',
					body: { post_url: 'https://example.com/hook', resource_name: 'sale' },
					qs: { foo: 'bar' },
				}),
			);
		});

		it('should default to accessToken when the authentication parameter is missing', async () => {
			const ctx = {
				getNodeParameter: jest.fn().mockReturnValue(undefined),
				helpers: { httpRequestWithAuthentication: jest.fn().mockResolvedValue({}) },
				getNode: jest.fn().mockReturnValue({ id: 'n', name: 'Gumroad Trigger' }),
			} as unknown as IHookFunctions;

			// getNodeParameter receives the third-arg fallback 'accessToken' from gumroadApiRequest,
			// so even when the param isn't set on the node we route to the legacy credential.
			(ctx.getNodeParameter as jest.Mock).mockImplementation(
				(_param: string, _index: number, fallback: string) => fallback,
			);

			await gumroadApiRequest.call(ctx, 'GET', '/resource_subscriptions');

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'gumroadApi',
				expect.anything(),
			);
		});

		it('should wrap upstream errors in NodeApiError', async () => {
			const ctx = buildContext('accessToken');
			(ctx.helpers.httpRequestWithAuthentication as jest.Mock).mockRejectedValue({
				message: 'boom',
			});

			await expect(gumroadApiRequest.call(ctx, 'GET', '/resource_subscriptions')).rejects.toThrow(
				NodeApiError,
			);
		});
	});
});
