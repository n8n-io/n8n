import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { getGoogleAccessToken } from '../../../GenericFunctions';
import { googleApiRequest } from '../../GenericFunctions';

vi.mock('../../../GenericFunctions', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../../GenericFunctions')>()),
	getGoogleAccessToken: vi.fn(async () => ({ access_token: 'token' })),
}));

const SETTINGS_SCOPE = 'https://www.googleapis.com/auth/gmail.settings.basic';

function context(authentication: string, request: () => Promise<unknown>) {
	const ctx = mock<IExecuteFunctions>();
	ctx.getNode.mockReturnValue(mock<INode>({ name: 'Gmail', typeVersion: 2.2 }));
	ctx.getNodeParameter.mockImplementation(
		((name: string) => ({ authentication, resource: 'filter' })[name]) as never,
	);
	ctx.getCredentials.mockResolvedValue({ email: 'sa@example.com', privateKey: 'key' });
	// Called via `.call()`, so it must be a real function, not a proxy.
	ctx.helpers = { requestWithAuthentication: vi.fn(request) } as never;
	return ctx;
}

describe('Gmail filter scopes', () => {
	beforeEach(() => vi.mocked(getGoogleAccessToken).mockClear());

	it('should request the settings scope for service-account filter calls only', async () => {
		const ctx = context('serviceAccount', async () => ({}));

		await googleApiRequest.call(ctx, 'GET', '/gmail/v1/users/me/settings/filters');
		await googleApiRequest.call(ctx, 'GET', '/gmail/v1/users/me/labels');

		const extraScopes = vi.mocked(getGoogleAccessToken).mock.calls.map((call) => call[2]);
		expect(extraScopes).toEqual([[SETTINGS_SCOPE], []]);
	});

	it.each([
		['serviceAccount', 'domain-wide delegation'],
		['oAuth2', 'Reconnect the Gmail OAuth2 credential'],
	])('should explain a 403 on filters for %s auth', async (authentication, hint) => {
		const ctx = context(authentication, async () => {
			throw Object.assign(new Error('Forbidden'), {
				httpCode: '403',
				response: { status: 403 },
			});
		});

		const error = await googleApiRequest
			.call(ctx, 'GET', '/gmail/v1/users/me/settings/filters')
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect((error as NodeApiError).description).toContain(hint);
	});
});
