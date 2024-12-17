import type { INodeTypes } from 'n8n-workflow';
import nock from 'nock';
import * as transport from '../../../../v2/transport';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';

const microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequest');

microsoftApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'PATCH') {
		return {};
	}
});

describe('Test MicrosoftTeamsV2, channel => update', () => {
	const workflows = ['nodes/Microsoft/Teams/test/v2/node/channel/update.workflow.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.resetAllMocks();
	});

	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(microsoftApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
			'PATCH',
			'/v1.0/teams/e25bae35-7bcc-4fb7-b4f2-0d5caef251fd/channels/19:b9daa3647ff8450bacaf39490d3e05e2@thread.tacv2',
			{ description: 'new channel description', displayName: 'New Deals' },
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
