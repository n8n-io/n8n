import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

import channels from './fixtures/channels.json';

describe('Test YouTube Node', () => {
	beforeAll(() => {
		jest
			.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] })
			.setSystemTime(new Date('2024-12-16 12:34:56.789Z'));
	});

	describe('Channel', () => {
		const youtubeNock = nock('https://www.googleapis.com/youtube');

		beforeAll(() => {
			youtubeNock
				.get('/v3/channels')
				.query({
					part: 'brandingSettings,contentDetails,contentOwnerDetails,id,localizations,snippet,statistics,status,topicDetails',
					mine: 'true',
					maxResults: '25',
				})
				.reply(200, { items: channels });
			youtubeNock
				.get('/v3/channels')
				.query({
					part: 'brandingSettings,contentDetails,contentOwnerDetails,id,localizations,snippet,statistics,status,topicDetails',
					id: 'UCabc123def456ghi789jkl',
				})
				.reply(200, { items: [channels[0]] });
			youtubeNock
				.put('/v3/channels', (body) => {
					return (
						body.id === 'UCabc123def456ghi789jkl' &&
						body.brandingSettings?.channel?.description === 'Test'
					);
				})
				.query({ part: 'brandingSettings' })
				.reply(200, {
					kind: 'youtube#channel',
					etag: 'someEtag',
					id: 'UCabc123def456ghi789jkl',
					brandingSettings: {
						channel: {
							description: 'Test',
						},
						image: {},
					},
				});
			nock.emitter.on('no match', (req) => {
				console.error('Unmatched request:', req);
			});
		});

		testWorkflows(['nodes/Google/YouTube/test/node/channels.workflow.json']);

		it('should make the correct network calls', () => {
			youtubeNock.done();
		});
	});
});
