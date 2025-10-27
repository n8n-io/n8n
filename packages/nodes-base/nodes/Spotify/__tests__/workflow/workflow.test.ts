import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import {
	getAlbum,
	getAlbumTracks,
	getArtist,
	getNewReleases,
	searchForAlbum,
} from './apiResponses';

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
			mock.get('/artists/12Chz98pHFMPJEknJQMWvI').reply(200, getArtist);
		});

		new NodeTestHarness().setupTests();
	});
});
