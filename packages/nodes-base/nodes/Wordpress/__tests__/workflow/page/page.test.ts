import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { pageCreate, pageGet, pageGetMany, pageUpdate } from '../apiResponses';
import { credentials } from '../credentials';

describe('Wordpress > Page Workflows', () => {
	beforeAll(() => {
		const mock = nock(credentials.wordpressApi.url);
		mock
			.post('/wp-json/wp/v2/pages', {
				title: 'A new page',
				content: 'Some content',
				status: 'draft',
				comment_status: 'closed',
				ping_status: 'closed',
				menu_order: 1,
			})
			.reply(200, pageCreate);
		mock.get('/wp-json/wp/v2/pages/2').reply(200, pageGet);
		mock.get('/wp-json/wp/v2/pages').query({ per_page: 1 }).reply(200, pageGetMany);
		mock
			.post('/wp-json/wp/v2/pages/2', {
				id: 2,
				title: 'New Title',
				content: 'Updated Content',
				slug: 'new-slug',
			})
			.reply(200, pageUpdate);
	});

	new NodeTestHarness().setupTests({ credentials });
});
