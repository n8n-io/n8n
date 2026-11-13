import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { getAlbum, getAlbumTracks, getNewReleases, searchForAlbum } from './apiResponses';

describe('Spotify', () => {
	describe('Run workflow', () => {
		beforeAll(() => {
			const mock = nock('https://api.spotify.com/v1');
			mock
				.get('/search')
				.query({ q: 'From Xero', type: 'album', limit: 2 })
				.reply(200, searchForAlbum);
			mock.get('/browse/new-releases').query({ limit: 2 }).reply(200, getNewReleases);
			mock.get('/albums/4R6FV9NSzhPihHR0h4pI93/tracks').reply(200, getAlbumTracks);
			mock.get('/albums/4R6FV9NSzhPihHR0h4pI93').reply(200, getAlbum);

			mock
				.get('/artists/0OdUWJ0sBjDrqHygGUXeCF/albums')
				.query({ limit: 2 })
				.reply(200, {
					items: [
						{ id: '1ATL5GLyefJaxhQzSPVrLX', name: 'Evolve' },
						{ id: '6nxDQi0FeEwccEPJeNySoS', name: 'Origins' },
					],
				});
			mock
				.get('/artists/0OdUWJ0sBjDrqHygGUXeCF/related-artists')
				.reply(200, { artists: [{ id: '53XhwfbYqKCa1cC15pYq2q', name: 'Imagine Dragons' }] });
			mock
				.get('/artists/0OdUWJ0sBjDrqHygGUXeCF/top-tracks')
				.query({ country: 'US' })
				.reply(200, { tracks: [{ id: '0pqnGHJpmpxLKifKRmU6WP', name: 'Believer' }] });
			mock
				.delete('/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks', {
					tracks: [{ uri: 'spotify:track:11dFghVXANMlKmJXsNCbNl' }],
				})
				.reply(200, { snapshot_id: 'AAAAB8C+GgDrvyxTxKr8M9W3jI2J' });
			mock
				.get('/playlists/37i9dQZF1DXcBWIGoYBM5M')
				.reply(200, { id: '37i9dQZF1DXcBWIGoYBM5M', name: 'Today’s Top Hits' });
			mock.get('/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks').reply(200, {
				items: [{ track: { id: '11dFghVXANMlKmJXsNCbNl' } }],
				next: 'https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks?offset=1&limit=1',
			});
			mock
				.get('/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks')
				.query({ offset: 1, limit: 1 })
				.reply(200, { items: [{ track: { id: '0pqnGHJpmpxLKifKRmU6WP' } }], next: null });
			mock
				.post('/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks')
				.query({ uris: 'spotify:track:11dFghVXANMlKmJXsNCbNl' })
				.reply(201, { snapshot_id: 'AAAAB8C+GgDrvyxTxKr8M9W3jI2J' });
			mock
				.get('/audio-features/11dFghVXANMlKmJXsNCbNl')
				.reply(200, { id: '11dFghVXANMlKmJXsNCbNl', tempo: 118.211 });
			mock
				.get('/tracks/11dFghVXANMlKmJXsNCbNl')
				.reply(200, { id: '11dFghVXANMlKmJXsNCbNl', name: 'Cut To The Feeling' });
		});

		afterAll(() => {
			expect(nock.pendingMocks()).toEqual([]);
		});

		new NodeTestHarness().setupTests();
	});
});
