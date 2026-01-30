import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock = require('nock');

describe('Wordpress Node', () => {
	const credentials = {
		wordpressApi: {
			username: 'user',
			password: 'password',
			url: 'https://example.com',
		},
	};

	describe('Media: create', () => {
		const wordpressNock = nock('https://example.com/wp-json/wp/v2');

		beforeAll(() => {
			wordpressNock
				.post('/media')
				.matchHeader('content-type', 'image/png')
				.matchHeader('content-disposition', 'attachment; filename="image.png"')
				.reply(201, {
					id: 123,
					title: { rendered: 'image' },
					source_url: 'http://example.com/wp-content/uploads/2023/10/image.png',
				});
		});

		afterAll(() => wordpressNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['media-create.workflow.json'],
		});
	});
});
