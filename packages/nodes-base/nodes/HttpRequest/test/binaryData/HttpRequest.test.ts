import nock from 'nock';

import {
	setup,
	equalityTest,
	workflowToTests,
	getWorkflowFilenames,
	initBinaryDataService,
} from '@test/nodes/Helpers';

describe('Test Binary Data Download', () => {
	const workflows = getWorkflowFilenames(__dirname);
	const tests = workflowToTests(workflows);

	const baseUrl = 'https://dummy.domain';

	beforeAll(async () => {
		await initBinaryDataService();

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
	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => await equalityTest(testData, nodeTypes));
	}
});
