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
		microsoftApiRequest: jest.fn(async function (method: IHttpRequestMethods, resource: string) {
			if (method === 'GET') {
				return {
					value: [
						{
							name: 'id',
						},
						{
							name: 'name',
						},
						{
							name: 'age',
						},
						{
							name: 'data',
						},
					],
				};
			}
			if (method === 'POST' && resource.includes('createSession')) {
				return {
					id: 12345,
				};
			}
			if (method === 'POST' && resource.includes('add')) {
				return {
					index: 3,
					values: [[3, 'Donald', 99, 'data 5']],
				};
			}
			if (method === 'POST' && resource.includes('closeSession')) {
				return;
			}
		}),
	};
});

describe('Test MicrosoftExcelV2, table => append', () => {
	const workflows = ['nodes/Microsoft/Excel/test/v2/node/table/append.workflow.json'];
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

		expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(4);

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/{A0883CFE-D27E-4ECC-B94B-981830AAD55B}/tables/{317CA469-7D1C-4A5D-9B0B-424444BF0336}/rows/add',
			{ values: [['3', 'Donald', '99', 'data 5']] },
			{},
			'',
			{ 'workbook-session-id': 12345 },
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
