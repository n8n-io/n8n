import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { mailchimpApiRequest } from '../GenericFunctions';

describe('mailchimpApiRequest', () => {
	it('should encode path values as a single segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('apiKey');
		context.getCredentials.mockResolvedValue({ apiKey: 'test0123456789abcdef-us19' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const listId = 'a1b2c3d4e5/members?x=1';
		await mailchimpApiRequest.call(context, requestPath`/lists/${listId}`, 'GET');

		const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
		expect(String(options.url)).toBe(
			'https://us19.api.mailchimp.com/3.0/lists/a1b2c3d4e5%2Fmembers%3Fx=1',
		);
	});

	it('should reject an API key data center that is not a host name', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('apiKey');
		context.getCredentials.mockResolvedValue({ apiKey: 'test0123456789abcdef-us19/lists' });

		await expect(mailchimpApiRequest.call(context, requestPath`/lists`, 'GET')).rejects.toThrow();
		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should reject an OAuth2 API endpoint that is not an http(s) URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('oAuth2');
		context.getCredentials.mockResolvedValue({
			metadataUrl: 'https://login.mailchimp.com/oauth2/metadata',
			oauthTokenData: { access_token: 'fake-access-token' },
		});
		context.helpers.request.mockResolvedValue({ api_endpoint: 'ftp://us19.api.mailchimp.com' });

		await expect(mailchimpApiRequest.call(context, requestPath`/lists`, 'GET')).rejects.toThrow();
		expect(context.helpers.requestOAuth2).not.toHaveBeenCalled();
	});

	it('should reject an OAuth2 metadata URL with a query', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('oAuth2');
		context.getCredentials.mockResolvedValue({
			metadataUrl: 'https://login.mailchimp.com/oauth2/metadata?x=1',
			oauthTokenData: { access_token: 'fake-access-token' },
		});

		await expect(mailchimpApiRequest.call(context, requestPath`/lists`, 'GET')).rejects.toThrow();
		expect(context.helpers.request).not.toHaveBeenCalled();
	});
});
