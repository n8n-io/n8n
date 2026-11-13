import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	ghostContentApi: {
		url: 'https://blog.example.com',
		apiKey: 'fake-content-key',
	},
	ghostAdminApi: {
		url: 'https://blog.example.com',
		apiKey:
			'5f2a1b3c4d5e6f7a8b9c0d1e:abababababababababababababababababababababababababababababababab',
	},
};

describe('Ghost > Request URLs', () => {
	beforeAll(() => {
		const mock = nock('https://blog.example.com/ghost/api');
		mock
			.get('/v3/content/posts/5f2a1b3c4d5e6f7a8b9c0d1e')
			.query(true)
			.reply(200, {
				posts: [
					{
						id: '5f2a1b3c4d5e6f7a8b9c0d1e',
						slug: 'welcome',
						title: 'Welcome',
						updated_at: '2025-09-01T10:00:00.000Z',
					},
				],
			});
		mock
			.get('/v3/content/posts/slug/welcome')
			.query(true)
			.reply(200, {
				posts: [
					{
						id: '5f2a1b3c4d5e6f7a8b9c0d1e',
						slug: 'welcome',
						title: 'Welcome',
						updated_at: '2025-09-01T10:00:00.000Z',
					},
				],
			});
		mock
			.get('/v3/content/posts')
			.query(true)
			.reply(200, {
				posts: [
					{
						id: '5f2a1b3c4d5e6f7a8b9c0d1e',
						slug: 'welcome',
						title: 'Welcome',
						updated_at: '2025-09-01T10:00:00.000Z',
					},
				],
			});
		mock
			.get('/v3/content/posts')
			.query(true)
			.reply(200, {
				posts: [
					{
						id: '5f2a1b3c4d5e6f7a8b9c0d1e',
						slug: 'welcome',
						title: 'Welcome',
						updated_at: '2025-09-01T10:00:00.000Z',
					},
				],
				meta: { pagination: { next: null } },
			});
		mock
			.post('/v2/admin/posts')
			.query(true)
			.reply(201, {
				posts: [
					{
						id: '5f2a1b3c4d5e6f7a8b9c0d1e',
						slug: 'welcome',
						title: 'Welcome',
						updated_at: '2025-09-01T10:00:00.000Z',
					},
				],
			});
		mock.delete('/v2/admin/posts/5f2a1b3c4d5e6f7a8b9c0d1e').reply(200, {});
		mock
			.get('/v2/admin/posts/5f2a1b3c4d5e6f7a8b9c0d1e')
			.query(true)
			.reply(200, {
				posts: [
					{
						id: '5f2a1b3c4d5e6f7a8b9c0d1e',
						slug: 'welcome',
						title: 'Welcome',
						updated_at: '2025-09-01T10:00:00.000Z',
					},
				],
			});
		mock
			.get('/v2/admin/posts/slug/welcome')
			.query(true)
			.reply(200, {
				posts: [
					{
						id: '5f2a1b3c4d5e6f7a8b9c0d1e',
						slug: 'welcome',
						title: 'Welcome',
						updated_at: '2025-09-01T10:00:00.000Z',
					},
				],
			});
		mock
			.get('/v2/admin/posts')
			.query(true)
			.reply(200, {
				posts: [
					{
						id: '5f2a1b3c4d5e6f7a8b9c0d1e',
						slug: 'welcome',
						title: 'Welcome',
						updated_at: '2025-09-01T10:00:00.000Z',
					},
				],
			});
		mock
			.get('/v2/admin/posts/5f2a1b3c4d5e6f7a8b9c0d1e')
			.query(true)
			.reply(200, {
				posts: [
					{
						id: '5f2a1b3c4d5e6f7a8b9c0d1e',
						slug: 'welcome',
						title: 'Welcome',
						updated_at: '2025-09-01T10:00:00.000Z',
					},
				],
			});
		mock
			.put('/v2/admin/posts/5f2a1b3c4d5e6f7a8b9c0d1e')
			.query(true)
			.reply(200, {
				posts: [
					{
						id: '5f2a1b3c4d5e6f7a8b9c0d1e',
						slug: 'welcome',
						title: 'Welcome',
						updated_at: '2025-09-01T10:00:00.000Z',
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
