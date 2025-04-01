import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { workflowToTests, getWorkflowFilenames } from '@test/nodes/Helpers';

describe('Test N8n Node, expect base_url to be received from credentials', () => {
	const workflows = getWorkflowFilenames(__dirname);
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		//base url is set in fake credentials map packages/nodes-base/test/nodes/FakeCredentialsMap.ts
		const baseUrl = 'https://test.app.n8n.cloud/api/v1';
		nock(baseUrl).get('/workflows?tags=n8n-test').reply(200, {});
	});

	const testNode = async (testData: WorkflowTestData) => {
		const { result } = await executeWorkflow(testData);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData));
	}
});
