import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Strapi', () => {
	const credentials = {
		strapiTokenApi: {
			apiToken: 'test-api-token',
			url: 'https://strapi.example.com/',
			apiVersion: 'v4',
		},
		strapiApi: {
			email: 'nathan@example.com',
			password: 'test-password',
			url: 'https://cms.example.com',
			apiVersion: 'v3',
		},
	};
	const entry = { id: 1, attributes: { title: 'Hello' } };

	describe('Run workflow', () => {
		beforeAll(() => {
			const v4 = nock('https://strapi.example.com');
			v4.post('/api/posts', { data: { id: 1, title: 'Hello' } }).reply(200, { data: entry });
			v4.put('/api/posts/1', { data: { id: 1, title: 'Hello' } }).reply(200, { data: entry });
			v4.get('/api/posts/1').reply(200, { data: entry });
			v4.delete('/api/posts/1').reply(200, { data: entry });
			v4.get('/api/posts')
				.query({ 'pagination[pageSize]': 2 })
				.reply(200, { data: [entry] });

			const v3 = nock('https://cms.example.com');
			v3.post('/auth/local', { identifier: 'nathan@example.com', password: 'test-password' }).reply(
				200,
				{ jwt: 'test-jwt' },
			);
			v3.get('/articles/7').reply(200, { id: 7, title: 'Hello' });
		});

		afterAll(() => {
			expect(nock.pendingMocks()).toEqual([]);
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
