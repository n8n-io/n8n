import type { IHttpRequestMethods, INodeTypes } from 'n8n-workflow';

import nock from 'nock';
import * as transport from '../../../../v2/transport';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: jest.fn(async function (method: IHttpRequestMethods) {
			if (method === 'GET') {
				return {
					value: [
						{
							id: '{00000000-0001-0000-0000-000000000000}',
							name: 'Sheet1',
						},
						{
							id: '{F7AF92FE-D42D-452F-8E4A-901B1D1EBF3F}',
							name: 'Sheet2',
						},
						{
							id: '{BF7BD843-4912-4B81-A0AC-4FBBC2783E20}',
							name: 'foo2',
						},
					],
				};
			}
		}),
	};
});

describe('Test MicrosoftExcelV2, worksheet => getAll', () => {
	const workflows = ['nodes/Microsoft/Excel/test/v2/node/worksheet/getAll.workflow.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../../v2/transport');
	});

	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets',
			{},
			{ $select: 'name', $top: 3 },
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
