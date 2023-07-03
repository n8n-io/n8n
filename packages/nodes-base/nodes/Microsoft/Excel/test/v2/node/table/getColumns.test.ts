import type { INodeTypes } from 'n8n-workflow';

import { getResultNodeData, setup, workflowToTests } from '../../../../../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../../../../../test/nodes/types';
import { executeWorkflow } from '../../../../../../../test/nodes/ExecuteWorkflow';

import * as transport from '../../../../v2/transport';

import nock from 'nock';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequestAllItemsSkip: jest.fn(async function () {
			return [
				{
					name: 'country',
				},
				{
					name: 'browser',
				},
				{
					name: 'session_duration',
				},
				{
					name: 'visits',
				},
			];
		}),
	};
});

describe('Test MicrosoftExcelV2, table => getColumns', () => {
	const workflows = ['nodes/Microsoft/Excel/test/v2/node/table/getColumns.workflow.json'];
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

		expect(transport.microsoftApiRequestAllItemsSkip).toHaveBeenCalledTimes(1);
		expect(transport.microsoftApiRequestAllItemsSkip).toHaveBeenCalledWith(
			'value',
			'GET',
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/{00000000-0001-0000-0000-000000000000}/tables/{613E8967-D581-44ED-81D3-82A01AA6A05C}/columns',
			{},
			{},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => testNode(testData, nodeTypes));
	}
});
