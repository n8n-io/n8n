import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import categories from './fixtures/categories.json';
import channels from './fixtures/channels.json';
import playlistItems from './fixtures/playlistItems.json';
import playlists from './fixtures/playlists.json';

describe('Test YouTube Node', () => {
	const credentials = {
		youTubeOAuth2Api: {
			scope: '',
			oauthTokenData: {
				access_token: 'ACCESSTOKEN',
			},
		},
	};

	const youtubeNock = nock('https://www.googleapis.com/youtube');
	beforeAll(() => {
		jest
			.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] })
			.setSystemTime(new Date('2024-12-16 12:34:56.789Z'));
	});

	describe('Channel', () => {
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
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['channels.workflow.json'],
		});
	});

	describe('Playlist', () => {
		beforeAll(() => {
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
				.reply(200, { items: [playlists[0]] });
			youtubeNock
				.get('/v3/playlists')
				.query({
					part: 'contentDetails,id,localizations,player,snippet,status',
					mine: true,
					maxResults: 25,
				})
				.reply(200, { items: playlists });
			youtubeNock.delete('/v3/playlists', { id: 'playlist_id_1' }).reply(200, { success: true });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['playlists.workflow.json'],
		});
	});

	describe('Video Categories', () => {
		beforeAll(() => {
			youtubeNock
				.get('/v3/videoCategories')
				.query({
					part: 'snippet',
					regionCode: 'GB',
				})
				.reply(200, { items: categories });
		});

		afterAll(() => youtubeNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['videoCategories.workflow.json'],
		});
	});

	describe('Playlist Item', () => {
		beforeAll(() => {
			youtubeNock
				.get('/v3/playlistItems')
				.query({
					part: 'contentDetails,id,snippet,status',
					id: 'fakePlaylistItemId1',
				})
				.reply(200, { items: playlistItems[0] });
			youtubeNock
				.get('/v3/playlistItems')
				.query({
					playlistId: 'PLXXXXFAKEPLAYLISTID01',
					part: 'contentDetails,id,snippet,status',
					maxResults: 3,
				})
				.reply(200, { items: playlistItems });
			youtubeNock
				.post('/v3/playlistItems', {
					snippet: {
						playlistId: 'PLXXXXFAKEPLAYLISTID01',
						resourceId: { kind: 'youtube#video', videoId: 'FAKEVIDID1' },
					},
					contentDetails: {},
				})
				.query({ part: 'snippet, contentDetails' })
				.reply(200, playlistItems[0]);
			youtubeNock
				.delete('/v3/playlistItems', (body) => {
					return body.id === 'UExWUDRtV2RxbGFhNWlwZEJRWXZVaFgyNk9RTENJRlV2cS41NkI0NEY2RDEwNTU3Q0M2';
				})
				.reply(200, {});
		});

		afterAll(() => youtubeNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['playlistItems.workflow.json'],
		});
	});
});
