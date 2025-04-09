import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

import channels from './fixtures/channels.json';
import playlists from './fixtures/playlists.json';

describe('Test YouTube Node', () => {
	beforeAll(() => {
		jest
			.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] })
			.setSystemTime(new Date('2024-12-16 12:34:56.789Z'));
	});

	describe('Channel', () => {
		const youtubeNock = nock('https://www.googleapis.com/youtube');

		beforeAll(() => {
			//Mock Channels
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
			//Mock Playlists
			youtubeNock
				.post('/v3/playlists', {
					snippet: { title: 'Playlist 1', privacyStatus: 'public', defaultLanguage: 'en' },
				})
				.query({ part: 'snippet' })
				.reply(200, playlists[0]);
			youtubeNock
				.put('/v3/playlists', {
					id: 'playlist_id_1',
					snippet: { title: 'Test Updated', description: 'This description is updated' },
					status: { privacyStatus: 'private' },
				})
				.query({ part: 'snippet, status' })
				.reply(200, {
					...playlists[0],
					snippet: {
						...playlists[0].snippet,
						title: 'The title is updated',
						description: 'The description is updated',
						localized: {
							...playlists[0].snippet.localized,
							title: 'The title is updated',
							description: 'The description is updated',
						},
					},
				});
			youtubeNock
				.get('/v3/playlists')
				.query({
					part: 'contentDetails,id,localizations,player,snippet,status',
					id: 'playlist_id_1',
				})
				.reply(200, playlists[0]);
			youtubeNock
				.get('/v3/playlists')
				.query({
					part: 'contentDetails,id,localizations,player,snippet,status',
					mine: true,
					maxResults: 25,
				})
				.reply(200, { items: playlists });
			youtubeNock.delete('/v3/playlists', { id: 'playlist_id_1' }).reply(200, { success: true });
			nock.emitter.on('no match', (req) => {
				console.error('Unmatched request:', req);
			});
		});

		testWorkflows([
			'nodes/Google/YouTube/__test__/node/channels.workflow.json',
			'nodes/Google/YouTube/__test__/node/playlists.workflow.json',
		]);

		it('should make the correct network calls', () => {
			youtubeNock.done();
		});
	});
});
