import nock from 'nock';

import {
	setup,
	equalityTest,
	workflowToTests,
	getWorkflowFilenames,
} from '../../../../../test/nodes/Helpers';
import { pageCreate, pageGet, pageGetMany, pageUpdate } from '../apiResponses';

describe('Wordpress > Page Workflows', () => {
	describe('Run workflow', () => {
		const workflows = getWorkflowFilenames(__dirname);
		const tests = workflowToTests(workflows);

		beforeAll(() => {
			const mock = nock('https://myblog.com');
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

		const nodeTypes = setup(tests);

		for (const testData of tests) {
			test(testData.description, async () => await equalityTest(testData, nodeTypes));
		}
	});
});
