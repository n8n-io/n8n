import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { twitterApiRequest as twitterApiRequestV1 } from '../V1/GenericFunctions';
import { twitterApiRequest as twitterApiRequestV2 } from '../V2/GenericFunctions';

const tweetId = '1666357334740811776/delete?x=1';

describe('twitterApiRequest', () => {
	it('V1 should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestOAuth1.mockResolvedValue({});

		await twitterApiRequestV1.call(context, 'POST', requestPath`/statuses/destroy/${tweetId}.json`);

		expect(context.helpers.requestOAuth1).toHaveBeenCalledWith(
			'twitterOAuth1Api',
			expect.objectContaining({
				url: expect.objectContaining({
					value:
						'https://api.twitter.com/1.1/statuses/destroy/1666357334740811776%2Fdelete%3Fx=1.json',
				}),
			}),
		);
	});

	it('V2 should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestOAuth2.mockResolvedValue({ data: {} });

		await twitterApiRequestV2.call(context, 'DELETE', requestPath`/tweets/${tweetId}`);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'twitterOAuth2Api',
			expect.objectContaining({
				url: expect.objectContaining({
					value: 'https://api.twitter.com/2/tweets/1666357334740811776%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
