/* eslint-disable @typescript-eslint/no-loop-func */
import { setup, workflowToTests, getWorkflowFilenames } from '../../../../test/nodes/Helpers';

import nock from 'nock';
import { executeWorkflow } from '../../../../test/nodes/ExecuteWorkflow';

describe('Test n8nTEST Node', () => {
	const workflows = getWorkflowFilenames(__dirname);
	const tests = workflowToTests(workflows);

	const baseUrl = 'https://test.n8n.cloud/api/v1';

	beforeAll(() => {
		nock.disableNetConnect();

		//GET
		nock(baseUrl).get('/workflows').reply(200, {
			id: 1,
			todo: 'Do something nice for someone I care about',
			completed: true,
			userId: 26,
		});
	});

	afterAll(() => {
		nock.restore();
	});

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => {
			const { result } = await executeWorkflow(testData, nodeTypes);

			// const resultNodeData = getResultNodeData(result, testData);
			// console.log(JSON.stringify(await executeWorkflow(testData, nodeTypes), null, 2));
			// resultNodeData.forEach(({ nodeName, resultData }) => {
			// 	expect(resultData).toEqual(testData.output.nodeData[nodeName]);
			// });

			expect(result.finished).toBeUndefined();
		});
	}
});
