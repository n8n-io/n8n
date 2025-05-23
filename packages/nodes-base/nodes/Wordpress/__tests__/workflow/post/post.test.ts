import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { postCreate, postGet, postGetMany, postUpdate } from '../apiResponses';
import { credentials } from '../credentials';

describe('Wordpress > Post Workflows', () => {
	beforeAll(() => {
		const mock = nock(credentials.wordpressApi.url);
		mock.get('/wp-json/wp/v2/posts/1').reply(200, postGet);
		mock.get('/wp-json/wp/v2/posts').query({ per_page: 10, page: 1 }).reply(200, postGetMany);
		mock
			.post('/wp-json/wp/v2/posts', {
				title: 'New Post',
				author: 1,
				content: 'This is my content',
				slug: 'new-post',
				status: 'future',
				comment_status: 'closed',
				ping_status: 'closed',
				sticky: true,
				categories: [1],
				format: 'standard',
			})
			.reply(200, postCreate);
		mock
			.post('/wp-json/wp/v2/posts/1', {
				id: 1,
				title: 'New Title',
				content: 'Some new content',
				status: 'publish',
			})
			.reply(200, postUpdate);
	});

	new NodeTestHarness().setupTests({ credentials });
});
