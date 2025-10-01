import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock, { type Scope } from 'nock';
import { readFileSync } from 'node:fs';
import path from 'path';

import complete from './fixtures/complete.json';
import models from './fixtures/models.json';
import okProcessed from './fixtures/okProcessed.json';
import okProcessing from './fixtures/okProcessing.json';

const credentials = { mindeeApiKey: { apiKey: 'mindeeApiKey' } };
const filePath = path.join(__dirname, 'fixtures/invoice.pdf');

function setupNocks(): Scope[] {
	const bytes = readFileSync(filePath);

	const fileScope = nock('https://example.com').get('/invoice.pdf').reply(200, bytes, {
		'Content-Type': 'application/pdf',
		'Content-Length': bytes.length.toString(),
	});

	const mindee = nock('https://api-v2.mindee.net/v2');
	mindee.get('/search/models').optionally().reply(200, models);
	mindee.post('/inferences/enqueue').reply(200, okProcessing);
	mindee
		.get('/jobs/12345678-1234-1234-1234-123456789ABC')
		.times(3)
		.reply(200, okProcessing)
		.get('/jobs/12345678-1234-1234-1234-123456789ABC')
		.reply(302, okProcessed, {
			Location: 'https://api-v2.mindee.net/v2/inferences/12345678-1234-1234-1234-123456789ABC',
		});
	mindee.get('/inferences/12345678-1234-1234-1234-123456789ABC').reply(200, complete);

	return [fileScope, mindee];
}

for (const wf of ['workflow.json', 'workflow2.json']) {
	describe(`MindeeV2 – ${wf}`, () => {
		let scopes: Scope[];

		beforeAll(() => {
			nock.cleanAll();
			scopes = setupNocks();
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: [wf],
		});

		afterAll(() => {
			scopes.forEach((s) => s.done());
			nock.cleanAll();
		});
	});
}
