import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('NASA workflow', () => {
	const credentials = { nasaApi: { api_key: 'test-api-key' } };

	beforeAll(() => {
		nock('https://api.nasa.gov')
			.get('/planetary/apod')
			.query({ date: '2024-05-20', api_key: 'test-api-key' })
			.reply(200, {
				date: '2024-05-20',
				title: 'A picture',
				media_type: 'image',
				url: 'https://example.com/apod.jpg',
				hdurl: 'https://example.com/hd/apod.jpg',
			});
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['workflow.json'] });
});
