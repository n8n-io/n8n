import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Storyblok', () => {
	const credentials = {
		storyblokContentApi: { apiKey: 'test-content-token' },
		storyblokManagementApi: { accessToken: 'test-management-token' },
	};
	const story = { id: 7891011, name: 'My first post', full_slug: 'blog/my-first-post' };

	describe('Run workflow', () => {
		beforeAll(() => {
			const content = nock('https://api.storyblok.com');
			content
				.get('/v1/cdn/stories/blog/my-first-post')
				.query({ token: 'test-content-token' })
				.reply(200, { story });
			content
				.get('/v1/cdn/stories')
				.query({ per_page: 2, token: 'test-content-token' })
				.reply(200, { stories: [story] });

			const management = nock('https://mapi.storyblok.com', {
				reqheaders: { authorization: 'test-management-token' },
			});
			management.get('/v1/spaces/123456/stories/7891011').reply(200, { story });
			management.delete('/v1/spaces/123456/stories/7891011').reply(200, { story });
			management
				.get('/v1/spaces/123456/stories')
				.query({ per_page: 2 })
				.reply(200, { stories: [story] });
			management.get('/v1/spaces/123456/stories/7891011/publish').reply(200, { story });
			management.get('/v1/spaces/123456/stories/7891011/unpublish').reply(200, { story });
		});

		afterAll(() => {
			expect(nock.pendingMocks()).toEqual([]);
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
