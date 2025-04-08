import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '@test/nodes/Helpers';

import { postCreate, postGet, postGetMany, postUpdate } from '../apiResponses';

describe('Wordpress > Post Workflows', () => {
	const workflows = getWorkflowFilenames(__dirname);

	beforeAll(() => {
		const mock = nock('https://myblog.com');
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

	testWorkflows(workflows);
});
