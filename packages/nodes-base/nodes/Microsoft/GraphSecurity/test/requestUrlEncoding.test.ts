import type { IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { MicrosoftGraphSecurity } from '../MicrosoftGraphSecurity.node';

describe('Microsoft Graph Security - request URL encoding', () => {
	it('should encode a secure score ID with a slash as one path segment', async () => {
		const params: Record<string, unknown> = {
			resource: 'secureScore',
			operation: 'get',
			secureScoreId: 'abc/secureScoreControlProfiles',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
		context.getCredentials.mockResolvedValue({ oauthTokenData: { access_token: 'token' } });
		context.helpers.request.mockResolvedValue({ id: 'abc' });

		await new MicrosoftGraphSecurity().execute.call(context);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: requestUrl`https://graph.microsoft.com/v1.0/security/secureScores/abc%2FsecureScoreControlProfiles`,
			}),
		);
	});
});
