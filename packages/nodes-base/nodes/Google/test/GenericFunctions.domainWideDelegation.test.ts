import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { IDataObject, IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { getGoogleAccessToken } from '../GenericFunctions';

describe('getGoogleAccessToken with domain-wide delegation', () => {
	const email = 'service-account@example.iam.gserviceaccount.com';
	const delegatedEmail = 'mailbox@example.com';
	const mailScope = 'https://mail.google.com/';
	const gmailScopes = [
		'https://www.googleapis.com/auth/gmail.labels',
		'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
		'https://www.googleapis.com/auth/gmail.addons.current.message.action',
		mailScope,
		'https://www.googleapis.com/auth/gmail.modify',
		'https://www.googleapis.com/auth/gmail.compose',
	];
	let privateKey: string;
	let publicKey: string;

	beforeAll(() => {
		({ privateKey, publicKey } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
			publicKeyEncoding: { type: 'spki', format: 'pem' },
		}));
	});

	it.each([
		{
			scenario: 'all Gmail scopes are authorized',
			authorizedScopes: gmailScopes,
			credentialScopes: gmailScopes.join(' '),
		},
		{
			scenario: 'only the selected mail scope is authorized',
			authorizedScopes: [mailScope],
			credentialScopes: mailScope,
		},
		{
			scenario: 'only the mail scope is authorized and no credential scopes are set',
			authorizedScopes: [mailScope],
			credentialScopes: undefined,
		},
	])('obtains a token when $scenario', async ({ authorizedScopes, credentialScopes }) => {
		const context = mockDeep<IExecuteFunctions>();
		const credentials: IDataObject = {
			email,
			privateKey,
			inpersonate: true,
			delegatedEmail,
			httpNode: false,
			scopes: credentialScopes,
		};
		const tokenResponse = { access_token: 'delegated-access-token', token_type: 'Bearer' };

		context.helpers.request.mockImplementation(async (options) => {
			const request = options as IRequestOptions;
			expect(request).toMatchObject({
				uri: 'https://oauth2.googleapis.com/token',
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				form: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer' },
			});

			const { assertion } = request.form as IDataObject;
			const claims = jwt.verify(assertion as string, publicKey, {
				algorithms: ['RS256'],
				audience: 'https://oauth2.googleapis.com/token',
				issuer: email,
			}) as jwt.JwtPayload;
			expect(claims.sub).toBe(delegatedEmail);
			expect(claims.scope).toEqual(expect.any(String));

			// NODE-5669: Workspace must authorize every scope in the delegated token request.
			const requestedScopes = (claims.scope as string).split(' ');
			if (requestedScopes.some((scope) => !authorizedScopes.includes(scope))) {
				throw Object.assign(new Error('401 unauthorized_client'), {
					statusCode: 401,
					error: {
						error: 'unauthorized_client',
						error_description:
							'Client is unauthorized to retrieve access tokens using this method, or client not authorized for any of the scopes requested.',
					},
				});
			}

			expect(requestedScopes).toEqual([mailScope]);

			return tokenResponse;
		});

		await expect(getGoogleAccessToken.call(context, credentials, 'gmail')).resolves.toEqual(
			tokenResponse,
		);
		expect(context.helpers.request).toHaveBeenCalledTimes(1);
	});
});
