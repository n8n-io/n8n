import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock, { type Scope } from 'nock';
import { readFileSync } from 'node:fs';
import path from 'path';

/* eslint-disable import-x/extensions */
import complete from './fixtures/complete.json';
import models from './fixtures/models.json';
import okProcessed from './fixtures/okProcessed.json';
import okProcessing from './fixtures/okProcessing.json';
/* eslint-enable import-x/extensions */

const credentials = { mindeeApi: { apiKey: 'mindeeApiKey' } };
const filePath = path.join(__dirname, 'fixtures/invoice.pdf');
const ROOT_URL = 'https://api-v2.mindee.net/v2';

const workflows = [
	['extraction.workflow.json', 'extraction', '0bf988b2-e012-4172-9398-3750ce05e96a'],
	['classification.workflow.json', 'classification', '310e0b52-6772-4287-97cc-f5cf26a3676c'],
	['crop.workflow.json', 'crop', 'dd3221f4-20f6-4282-914d-9bbc60f599f3'],
	['ocr.workflow.json', 'ocr', '9829ace9-fdd6-4c60-a9da-0246d93d2f15'],
	['split.workflow.json', 'split', 'e4310989-e3ce-4a2c-8d35-c5cf77f91f6d'],
] as const;

function setupNocks(product: string, jobId: string): Scope[] {
	const bytes = readFileSync(filePath);

	/* eslint-disable @typescript-eslint/naming-convention */
	const fileScope = nock('https://example.com').get('/invoice.pdf').reply(200, bytes, {
		'Content-Type': 'application/pdf',
		'Content-Length': bytes.length.toString(),
	});
	/* eslint-enable @typescript-eslint/naming-convention */

	const pollingUrl = `${ROOT_URL}/jobs/${jobId}`;
	const resultUrl = `${ROOT_URL}/products/${product}/results/${jobId}`;
	const processing = { job: { ...okProcessing.job, id: jobId, polling_url: pollingUrl } };
	const processed = {
		job: { ...okProcessed.job, id: jobId, polling_url: pollingUrl, result_url: resultUrl },
	};

	const mindee = nock(ROOT_URL);
	mindee.get('/search/models').optionally().reply(200, models);
	mindee.post(`/products/${product}/enqueue`).reply(200, processing);
	mindee
		.get(`/jobs/${jobId}`)
		.times(3)
		.reply(200, processing)
		.get(`/jobs/${jobId}`)
		// eslint-disable-next-line @typescript-eslint/naming-convention
		.reply(302, processed, { Location: resultUrl });
	mindee.get(`/products/${product}/results/${jobId}`).reply(200, complete);

	return [fileScope, mindee];
}

for (const [wf, product, jobId] of workflows) {
	describe(`MindeeV2 – ${wf}`, () => {
		let scopes: Scope[];

		beforeAll(() => {
			nock.cleanAll();
			scopes = setupNocks(product, jobId);
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
