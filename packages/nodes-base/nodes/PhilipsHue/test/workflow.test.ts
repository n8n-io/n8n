import nock from 'nock';

import { setup, equalityTest, workflowToTests, getWorkflowFilenames } from '@test/nodes/Helpers';

import { getLightsResponse, getConfigResponse } from './apiResponses';

describe('PhilipsHue', () => {
	describe('Run workflow', () => {
		const workflows = getWorkflowFilenames(__dirname);
		const tests = workflowToTests(workflows);

		beforeAll(() => {
			nock.disableNetConnect();
			nock('https://api.meethue.com/route')
				.get('/api/0/config')
				.reply(200, getConfigResponse)
				.get('/api/n8n/lights')
				.reply(200, getLightsResponse);
		});

		afterAll(() => {
			nock.restore();
		});

		const nodeTypes = setup(tests);

		for (const testData of tests) {
			test(testData.description, async () => await equalityTest(testData, nodeTypes));
		}
	});
});
