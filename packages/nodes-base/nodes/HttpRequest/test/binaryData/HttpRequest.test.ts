import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test Binary Data Download', () => {
	const baseUrl = 'https://dummy.domain';

	beforeAll(async () => {
		nock(baseUrl)
			.persist()
			.get('/path/to/image.png')
			.reply(200, Buffer.from('test'), { 'content-type': 'image/png' });

		nock(baseUrl)
			.persist()
			.get('/path/to/text.txt')
			.reply(200, Buffer.from('test'), { 'content-type': 'text/plain; charset=utf-8' });

		nock(baseUrl)
			.persist()
			.get('/redirect-to-image')
			.reply(302, {}, { location: baseUrl + '/path/to/image.png' });

		nock(baseUrl).persist().get('/custom-content-disposition').reply(200, Buffer.from('testing'), {
			'content-disposition': 'attachment; filename="testing.jpg"',
		});
	});

	new NodeTestHarness().setupTests({ assertBinaryData: true });
});
