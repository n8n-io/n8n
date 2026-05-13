import { Container } from '@n8n/di';
import { mockDeep } from 'jest-mock-extended';
import {
	FORM_OAUTH_SESSION_JWT_EXPIRY_SEC,
	InstanceSettings,
	signFormOauthJwt,
	type FormOauthSessionJwtPayload,
} from 'n8n-core';
import type { IWebhookFunctions } from 'n8n-workflow';

import { WebhookAuthorizationError, WebhookOauthAuthorizationError } from '../error';
import { validateWebhookAuthentication } from '../utils';

const HMAC_SECRET = 'oauth-login-test-secret';

const claims = {
	sub: 'user-1',
	name: 'Jane Doe',
	email: 'jane@example.com',
};

describe('validateWebhookAuthentication — oauthLogin mode', () => {
	beforeAll(() => {
		Container.set(InstanceSettings, { hmacSignatureSecret: HMAC_SECRET } as InstanceSettings);
	});

	const buildCtx = (body: Record<string, unknown>, query: Record<string, unknown> = {}) => {
		const ctx = mockDeep<IWebhookFunctions>();
		ctx.getNodeParameter.mockReturnValue('oauthLogin');
		ctx.getRequestObject.mockReturnValue({ body, query } as never);
		ctx.getHeaderData.mockReturnValue({} as never);
		return ctx;
	};

	it('returns the verified session JWT payload when form_auth is valid', async () => {
		const sessionJwt = signFormOauthJwt<FormOauthSessionJwtPayload>(
			{ wf: 'wf-1', node: 'n-1', claims },
			HMAC_SECRET,
			FORM_OAUTH_SESSION_JWT_EXPIRY_SEC,
		);
		const ctx = buildCtx({ form_auth: sessionJwt });

		const result = (await validateWebhookAuthentication(ctx, 'authentication')) as {
			claims: typeof claims;
		};

		expect(result).toBeDefined();
		expect(result.claims).toEqual(claims);
	});

	it('reads form_auth from multipart-parsed body.data (formidable shape)', async () => {
		const sessionJwt = signFormOauthJwt<FormOauthSessionJwtPayload>(
			{ wf: 'wf-1', node: 'n-1', claims },
			HMAC_SECRET,
			FORM_OAUTH_SESSION_JWT_EXPIRY_SEC,
		);
		// Form submissions arrive as multipart/form-data; the parser nests fields
		// under `body.data`.
		const ctx = buildCtx({ data: { form_auth: sessionJwt, 'field-0': 'some value' } });

		const result = (await validateWebhookAuthentication(ctx, 'authentication')) as {
			claims: typeof claims;
		};

		expect(result.claims).toEqual(claims);
	});

	it('throws WebhookOauthAuthorizationError with redirect URL when token is missing', async () => {
		const ctx = buildCtx({});
		ctx.helpers.getWebhookOauthRedirectUrl.mockResolvedValue('https://idp.example.com/authorize');

		const error = await validateWebhookAuthentication(ctx, 'authentication').catch((e) => e);

		expect(error).toBeInstanceOf(WebhookOauthAuthorizationError);
		expect(error).toBeInstanceOf(WebhookAuthorizationError);
		expect((error as WebhookOauthAuthorizationError).redirectUrl).toBe(
			'https://idp.example.com/authorize',
		);
		expect(ctx.helpers.getWebhookOauthRedirectUrl).toHaveBeenCalledWith({ reauth: false });
	});

	it('throws WebhookOauthAuthorizationError when token is tampered', async () => {
		const ctx = buildCtx({ form_auth: 'not-a-valid-jwt' });
		ctx.helpers.getWebhookOauthRedirectUrl.mockResolvedValue('https://idp.example.com/authorize');

		const error = await validateWebhookAuthentication(ctx, 'authentication').catch((e) => e);

		expect(error).toBeInstanceOf(WebhookOauthAuthorizationError);
	});

	it('requests reauth (prompt=login) when query.reauth is "1"', async () => {
		const ctx = buildCtx({}, { reauth: '1' });
		ctx.helpers.getWebhookOauthRedirectUrl.mockResolvedValue(
			'https://idp.example.com/?prompt=login',
		);

		await validateWebhookAuthentication(ctx, 'authentication').catch(() => undefined);

		expect(ctx.helpers.getWebhookOauthRedirectUrl).toHaveBeenCalledWith({ reauth: true });
	});

	it('throws WebhookOauthAuthorizationError when token is signed by a different secret', async () => {
		const sessionJwt = signFormOauthJwt<FormOauthSessionJwtPayload>(
			{ wf: 'wf-1', node: 'n-1', claims },
			'other-secret',
			FORM_OAUTH_SESSION_JWT_EXPIRY_SEC,
		);
		const ctx = buildCtx({ form_auth: sessionJwt });
		ctx.helpers.getWebhookOauthRedirectUrl.mockResolvedValue('https://idp.example.com/authorize');

		const error = await validateWebhookAuthentication(ctx, 'authentication').catch((e) => e);
		expect(error).toBeInstanceOf(WebhookOauthAuthorizationError);
	});
});
