import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const volume = { id: 'zyTCAlFPjgYC', volumeInfo: { title: 'The Hobbit' } };
const shelf = { id: 4, title: 'Reading now' };

describe('Google Books Node - request URLs', () => {
	beforeAll(() => {
		const user = '/books/v1/users/104729384756102938475';
		const myLibrary = '/books/v1/mylibrary/bookshelves';

		nock('https://www.googleapis.com')
			.get('/books/v1/volumes/zyTCAlFPjgYC')
			.reply(200, volume)
			.get('/books/v1/volumes')
			.query({ q: 'tolkien', maxResults: 2 })
			.reply(200, { totalItems: 1, items: [volume] })
			.get('/books/v1/volumes')
			.query({ q: 'tolkien', maxResults: 40 })
			.reply(200, { totalItems: 1, items: [volume] })
			.get(`${user}/bookshelves/4`)
			.reply(200, shelf)
			.get(`${myLibrary}/4`)
			.reply(200, shelf)
			.get(`${user}/bookshelves`)
			.query({ maxResults: 5 })
			.reply(200, { items: [shelf] })
			.get(myLibrary)
			.query({ maxResults: 40 })
			.reply(200, { totalItems: 1, items: [shelf] })
			.post(`${myLibrary}/2/addVolume`, { volumeId: 'zyTCAlFPjgYC' })
			.reply(200, {})
			.post(`${myLibrary}/2/clearVolumes`)
			.reply(200, {})
			.get(`${user}/bookshelves/4/volumes`)
			.query({ maxResults: 5 })
			.reply(200, { items: [volume] })
			.get(`${myLibrary}/4/volumes`)
			.query({ maxResults: 40 })
			.reply(200, { totalItems: 1, items: [volume] })
			.post(`${myLibrary}/2/moveVolume`, { volumeId: 'zyTCAlFPjgYC', volumePosition: '1' })
			.reply(200, {})
			.post(`${myLibrary}/2/removeVolume`, { volumeId: 'zyTCAlFPjgYC' })
			.reply(200, {});
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleBooksOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/books',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['requests.workflow.json'],
	});
});
