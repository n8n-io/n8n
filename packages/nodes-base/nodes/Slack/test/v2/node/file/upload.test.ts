import type { IHttpRequestMethods, INodeTypes, WorkflowTestData } from 'n8n-workflow';

import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';

import { executeWorkflow } from '../../../../../../test/nodes/ExecuteWorkflow';
import * as genericFunctions from '../../../../V2/GenericFunctions';

const API_RESPONSE = { files: { test: 'OK' } };

jest.mock('../../../../V2/GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../../V2/GenericFunctions');
	return {
		...originalModule,
		slackApiRequest: jest.fn(async function (method: IHttpRequestMethods) {
			if (method === 'POST') {
				return API_RESPONSE;
			}
			if (method === 'GET') {
				return { upload_url: 'https://slack.com/api/files.upload' };
			}
		}),
	};
});

describe('Test SlackV2, file => upload', () => {
	const workflows = ['nodes/Slack/test/v2/node/file/upload.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(genericFunctions.slackApiRequest).toHaveBeenCalledTimes(3);
		expect(genericFunctions.slackApiRequest).toHaveBeenCalledWith(
			'GET',
			'/files.getUploadURLExternal',
			{},
			{ filename: 'test _name.txt', length: 25 },
		);

		expect(genericFunctions.slackApiRequest).toHaveBeenCalledWith(
			'POST',
			'https://slack.com/api/files.upload',
			{},
			{},
			{ 'Content-Type': 'multipart/form-data' },
			expect.objectContaining({
				formData: expect.any(Object),
			}),
		);

		expect(genericFunctions.slackApiRequest).toHaveBeenCalledWith(
			'POST',
			'/files.completeUploadExternal',
			{
				files: [{ id: undefined, title: 'Test Title' }],
				initial_comment: 'test inline',
				thread_ts: '1734322671.726339',
			},
		);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
