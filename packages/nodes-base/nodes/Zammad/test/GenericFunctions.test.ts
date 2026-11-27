import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { ZammadOAuth2Api } from '../../../credentials/ZammadOAuth2Api.credentials';
import { zammadApiRequest } from '../GenericFunctions';

describe('zammadApiRequest', () => {
	it('should encode path values and join them with the credentials base URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('tokenAuth');
		context.getCredentials.mockResolvedValue({
			baseUrl: 'https://helpdesk.example.com/',
			accessToken: 'fake-access-token',
			allowUnauthorizedCerts: false,
		});
		context.helpers.request.mockResolvedValue({});

		const id = '7/delete?x=1';
		await zammadApiRequest.call(context, 'GET', requestPath`/users/${id}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://helpdesk.example.com/api/v1/users/7%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});

describe('zammadApiRequest with OAuth2', () => {
	it('should send the request through requestOAuth2 with the zammadOAuth2Api credential', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('oAuth2');
		context.getCredentials.mockResolvedValue({
			baseUrl: 'https://helpdesk.example.com',
			ignoreSSLIssues: false,
		});
		context.helpers.requestOAuth2.mockResolvedValue({ id: 1 });

		const result = await zammadApiRequest.call(context, 'POST', requestPath`/tickets`, {
			title: 'From the contact form',
		});

		expect(result).toEqual({ id: 1 });
		expect(context.getCredentials).toHaveBeenCalledWith('zammadOAuth2Api');
		expect(context.helpers.request).not.toHaveBeenCalled();
		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'zammadOAuth2Api',
			expect.objectContaining({
				method: 'POST',
				body: { title: 'From the contact form' },
				json: true,
				rejectUnauthorized: true,
				uri: expect.objectContaining({
					value: 'https://helpdesk.example.com/api/v1/tickets',
				}),
			}),
		);
		const options = context.helpers.requestOAuth2.mock.calls[0][1] as Record<string, unknown>;
		expect(options.headers).toBeUndefined();
		expect(options.auth).toBeUndefined();
		expect(options.qs).toBeUndefined();
	});
});

describe('zammadApiRequest with OAuth2 and a self-signed certificate', () => {
	it('should turn off certificate checks when Ignore SSL Issues is on', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('oAuth2');
		context.getCredentials.mockResolvedValue({
			baseUrl: 'https://helpdesk.example.com',
			ignoreSSLIssues: true,
		});
		context.helpers.requestOAuth2.mockResolvedValue({});

		await zammadApiRequest.call(context, 'GET', requestPath`/users/me`);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'zammadOAuth2Api',
			expect.objectContaining({ rejectUnauthorized: false }),
		);
	});

	it('should store the SSL switch under the name the OAuth2 request helper reads', () => {
		// requestOAuth2 sets rejectUnauthorized from credentials.ignoreSSLIssues and overwrites
		// the node's own value, so any other field name would make the switch do nothing.
		const names = new ZammadOAuth2Api().properties.map((property) => property.name);
		expect(names).toContain('ignoreSSLIssues');
		expect(names).not.toContain('allowUnauthorizedCerts');
	});
});
