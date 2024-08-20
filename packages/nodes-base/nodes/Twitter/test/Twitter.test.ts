import nock from 'nock';
import type { INodeParameterResourceLocator } from 'n8n-workflow';
import { returnId } from '../V2/GenericFunctions';
import { getWorkflowFilenames, testWorkflows } from '@test/nodes/Helpers';

const searchResult = {
	data: [
		{
			edit_history_tweet_ids: ['1666357334740811776'],
			id: '1666357334740811776',
			text: 'RT @business: Extreme heat is happening earlier than usual this year in Asia. That’s posing a grave risk to agriculture and industrial acti…',
		},
		{
			edit_history_tweet_ids: ['1666357331276230656'],
			id: '1666357331276230656',
			text:
				'@ROBVME @sheepsleepdeep @mattxiv Bit like Bloomberg, but then for an incredible average beer brand, to which grown ass adults have some deeply emotional attachment to and going through a teenage break-up with, because a tiktok.\n' +
				'Got it.',
		},
		{
			edit_history_tweet_ids: ['1666357319381180417'],
			id: '1666357319381180417',
			text: "The global economy is set for a weak recovery from the shocks of Covid and Russia’s war in Ukraine, dogged by persistent inflation and central banks' restrictive policies, the OECD warns https://t.co/HPtelXu8iR https://t.co/rziWHhr8Np",
		},
		{
			edit_history_tweet_ids: ['1666357315946303488'],
			id: '1666357315946303488',
			text:
				'RT @lukedepulford: Love this so much. Variations of “Glory to Hong Kong” are THE WHOLE TOP TEN of the most downloaded song on iTunes.\n' +
				'\n' +
				'✊\n' +
				'\n' +
				'h…',
		},
		{
			edit_history_tweet_ids: ['1666357265320869891'],
			id: '1666357265320869891',
			text: 'RT @business: The SEC said it’s seeking to freeze https://t.co/35sr7lifRX’s assets and protect customer funds, including through the repatr…',
		},
		{
			edit_history_tweet_ids: ['1666357244760555520'],
			id: '1666357244760555520',
			text: 'RT @BloombergJapan: オプション市場で日経平均先高観強まる、３万4000円に備える買い急増 https://t.co/mIcdkgokYj',
		},
		{
			edit_history_tweet_ids: ['1666357239710359552'],
			id: '1666357239710359552',
			text: "Twitter'a mı girdim bloomberg mi anlamadım,dolar euro altın..maşallahları var,tl mi onun anası sikilmiş.",
		},
		{
			edit_history_tweet_ids: ['1666357235340165120'],
			id: '1666357235340165120',
			text: 'RT @business: These charts show why Germany needs mass migration https://t.co/rvZixuwwnu',
		},
		{
			edit_history_tweet_ids: ['1666357210409213952'],
			id: '1666357210409213952',
			text: 'RT @elonmusk: @MattWalshBlog View count is actually understated, as it does not include anything from our API, for example tweets you see i…',
		},
		{
			edit_history_tweet_ids: ['1666357208983166976'],
			id: '1666357208983166976',
			text: 'RT @coinbureau: There we go. Without proving in a court of law that these tokens are "securities" the SEC may be able to restrict access to…',
		},
	],
};

const meResult = {
	data: { id: '1285192200213626880', name: 'Integration-n8n', username: 'IntegrationN8n' },
};

describe('Test Twitter Request Node', () => {
	beforeAll(() => {
		const baseUrl = 'https://api.twitter.com/2';
		nock.disableNetConnect();
		//GET
		nock(baseUrl).get('/users/me').reply(200, meResult);

		nock(baseUrl)
			.get('/tweets/search/recent?query=bloomberg&max_results=10')
			.reply(200, searchResult);
	});

	afterEach(() => {
		nock.restore();
	});

	const workflows = getWorkflowFilenames(__dirname);
	testWorkflows(workflows);
});

describe('X / Twitter Node unit tests', () => {
	describe('returnId', () => {
		it('should return the id when mode is id', () => {
			const tweetId: INodeParameterResourceLocator = {
				__rl: true,
				mode: 'id',
				value: '12345',
			};
			expect(returnId(tweetId)).toBe('12345');
		});

		it('should extract the tweetId from url when the domain is twitter.com', () => {
			const tweetId: INodeParameterResourceLocator = {
				__rl: true,
				mode: 'url',
				value: 'https://twitter.com/user/status/12345?utm=6789',
			};
			expect(returnId(tweetId)).toBe('12345');
		});

		it('should extract the tweetId from url when the domain is x.com', () => {
			const tweetId: INodeParameterResourceLocator = {
				__rl: true,
				mode: 'url',
				value: 'https://x.com/user/status/12345?utm=6789',
			};
			expect(returnId(tweetId)).toBe('12345');
		});

		it('should throw an error when mode is not valid', () => {
			const tweetId: INodeParameterResourceLocator = {
				__rl: true,
				mode: 'invalid',
				value: 'https://twitter.com/user/status/12345',
			};
			expect(() => returnId(tweetId)).toThrow();
		});

		describe('should throw an error when the URL is not valid', () => {
			test.each([
				'https://twitter.com/user/',
				'https://twitter.com/user/status/',
				'https://twitter.com/user/profile/12345',
				'https://twitter.com/search?param=12345',
			])('%s', (value) => {
				expect(() =>
					returnId({
						__rl: true,
						mode: 'url',
						value,
					}),
				).toThrow();
			});
		});
	});
});
