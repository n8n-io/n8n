import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { gristApiRequest } from '../GenericFunctions';

describe('gristApiRequest', () => {
	const setup = (authentication: string, credentials: Record<string, unknown>) => {
		const request = vi.fn().mockResolvedValue({ records: [] });
		const requestOAuth2 = vi.fn().mockResolvedValue({ records: [] });
		const ctx = mock<IExecuteFunctions>();
		// Keyed by name so an unexpected parameter read fails loudly, rather than silently
		// receiving the auth string.
		ctx.getNodeParameter.mockImplementation((name) => {
			if (name === 'authentication') return authentication;
			throw new Error(`unexpected getNodeParameter(${String(name)})`);
		});
		ctx.getCredentials.mockResolvedValue(credentials);
		ctx.helpers = { ...ctx.helpers, request, requestOAuth2 };
		return { ctx, request, requestOAuth2 };
	};

	it('sends the API key as a bearer token when authenticating with an API key', async () => {
		const { ctx, request, requestOAuth2 } = setup('apiKey', {
			apiKey: 'k',
			url: 'https://api.getgrist.com',
		});

		await gristApiRequest.call(ctx, 'GET', '/docs/abc/tables/People/records');

		expect(ctx.getCredentials).toHaveBeenCalledWith('gristApi');
		expect(requestOAuth2).not.toHaveBeenCalled();
		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: 'https://api.getgrist.com/api/docs/abc/tables/People/records',
				headers: { Authorization: 'Bearer k' },
			}),
		);
	});

	// The URL here is deliberately sloppy: a clean one would pass even if this path skipped
	// normalization, since the raw and normalized values would be identical.
	it('routes through requestOAuth2 when authenticating with OAuth2, normalizing the URL', async () => {
		const { ctx, request, requestOAuth2 } = setup('oAuth2', {
			url: 'https://grist.example.com/api/',
		});

		await gristApiRequest.call(ctx, 'GET', '/orgs');

		expect(ctx.getCredentials).toHaveBeenCalledWith('gristOAuth2Api');
		expect(request).not.toHaveBeenCalled();
		expect(requestOAuth2).toHaveBeenCalledWith(
			'gristOAuth2Api',
			expect.objectContaining({ uri: 'https://grist.example.com/api/orgs' }),
		);
		// The OAuth helper attaches the token itself, so nothing sets an Authorization header here.
		const [, options] = requestOAuth2.mock.calls[0] as [string, IRequestOptions];
		expect(options.headers).toBeUndefined();
	});

	it.each(['apiKey', 'oAuth2'])(
		'wraps a failing %s request in a NodeApiError',
		async (authentication) => {
			const { ctx, request, requestOAuth2 } = setup(authentication, {
				apiKey: 'k',
				url: 'https://api.getgrist.com',
			});
			const failure = { message: 'Forbidden', statusCode: 403 };
			request.mockRejectedValue(failure);
			requestOAuth2.mockRejectedValue(failure);

			await expect(gristApiRequest.call(ctx, 'GET', '/orgs')).rejects.toBeInstanceOf(NodeApiError);
		},
	);
});
