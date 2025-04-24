import nock from 'nock';

import { getWorkflowFilenames, testWorkflows } from '@test/nodes/Helpers';

describe('Test Binary Data Download', () => {
	const baseUrl = 'https://dummy.domain';

	beforeAll(async () => {
		nock(baseUrl)
			.persist()
			.get('/path/to/image.png')
			.reply(200, Buffer.from('test'), { 'content-type': 'image/png' });

		nock(baseUrl)
			.persist()
			.get('/redirect-to-image')
			.reply(302, {}, { location: baseUrl + '/path/to/image.png' });

		nock(baseUrl).persist().get('/custom-content-disposition').reply(200, Buffer.from('testing'), {
			'content-disposition': 'attachment; filename="testing.jpg"',
		});
	});

	const workflows = getWorkflowFilenames(__dirname);
	testWorkflows(workflows);
});
