import type { IHookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { gumroadApiRequest } from '../GenericFunctions';

describe('Gumroad GenericFunctions', () => {
	const baseUri = 'https://api.gumroad.com/v2';

	const buildContext = (authentication: 'accessToken' | 'oAuth2') =>
		({
			getNodeParameter: jest.fn().mockImplementation((param: string) => {
				if (param === 'authentication') return authentication;
				return undefined;
			}),
			getCredentials: jest.fn().mockResolvedValue({
				accessToken: 'legacy-token',
			}),
			helpers: {
				request: jest.fn(),
				requestOAuth2: jest.fn(),
			},
			getNode: jest.fn().mockReturnValue({
				id: 'test-node-id',
				name: 'Gumroad Trigger',
				type: 'n8n-nodes-base.gumroadTrigger',
				typeVersion: 1,
			}),
		}) as unknown as IHookFunctions;

	describe('gumroadApiRequest', () => {
		it('should send the access_token in the body when authentication is accessToken', async () => {
			const ctx = buildContext('accessToken');
			(ctx.helpers.request as jest.Mock).mockResolvedValue({ resource_subscriptions: [] });

			const result = await gumroadApiRequest.call(ctx, 'GET', '/resource_subscriptions');

			expect(ctx.getCredentials).toHaveBeenCalledWith('gumroadApi');
			expect(ctx.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					uri: `${baseUri}/resource_subscriptions`,
					body: expect.objectContaining({ access_token: 'legacy-token' }),
					json: true,
				}),
			);
			expect(ctx.helpers.requestOAuth2).not.toHaveBeenCalled();
			expect(result).toEqual({ resource_subscriptions: [] });
		});

		it('should merge user-provided body with the access_token field', async () => {
			const ctx = buildContext('accessToken');
			(ctx.helpers.request as jest.Mock).mockResolvedValue({});

			await gumroadApiRequest.call(ctx, 'PUT', '/resource_subscriptions', {
				post_url: 'https://example.com/hook',
				resource_name: 'sale',
			});

			expect(ctx.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					body: {
						access_token: 'legacy-token',
						post_url: 'https://example.com/hook',
						resource_name: 'sale',
					},
				}),
			);
		});

		it('should call requestOAuth2 with the OAuth2 credential when authentication is oAuth2', async () => {
			const ctx = buildContext('oAuth2');
			(ctx.helpers.requestOAuth2 as jest.Mock).mockResolvedValue({
				resource_subscriptions: [],
			});

			const result = await gumroadApiRequest.call(ctx, 'GET', '/resource_subscriptions');

			expect(ctx.helpers.requestOAuth2).toHaveBeenCalledWith(
				'gumroadOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					uri: `${baseUri}/resource_subscriptions`,
					json: true,
				}),
			);
			expect(ctx.helpers.request).not.toHaveBeenCalled();
			// access_token must NOT be injected when using OAuth2 - the Bearer header carries the auth
			const callArgs = (ctx.helpers.requestOAuth2 as jest.Mock).mock.calls[0][1];
			expect(callArgs.body?.access_token).toBeUndefined();
			expect(result).toEqual({ resource_subscriptions: [] });
		});

		it('should not request the legacy gumroadApi credential when using OAuth2', async () => {
			const ctx = buildContext('oAuth2');
			(ctx.helpers.requestOAuth2 as jest.Mock).mockResolvedValue({});

			await gumroadApiRequest.call(ctx, 'GET', '/resource_subscriptions');

			expect(ctx.getCredentials).not.toHaveBeenCalled();
		});

		it('should wrap upstream errors in NodeApiError', async () => {
			const ctx = buildContext('accessToken');
			(ctx.helpers.request as jest.Mock).mockRejectedValue({ message: 'boom' });

			await expect(gumroadApiRequest.call(ctx, 'GET', '/resource_subscriptions')).rejects.toThrow(
				NodeApiError,
			);
		});
	});
});
