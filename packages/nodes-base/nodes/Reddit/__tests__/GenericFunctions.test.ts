import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { redditApiRequest } from '../GenericFunctions';

describe('redditApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('subreddit');
		context.helpers.request.mockResolvedValue({});

		const subreddit = 'n8n/about?x=1';
		await redditApiRequest.call(context, 'GET', requestPath`r/${subreddit}/about/rules.json`, {});

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: requestUrl`https://www.reddit.com/r/n8n%2Fabout%3Fx=1/about/rules.json`,
			}),
		);
	});
});
