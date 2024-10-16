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
		microsoftApiRequestAllItemsSkip: jest.fn(async function (
			_property: string,
			_method: IHttpRequestMethods,
			endpoint: string,
		) {
			if (endpoint.includes('columns')) {
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
			}
			if (endpoint.includes('rows')) {
				return [
					{
						index: 0,
						values: [['uk', 'firefox', 1, 1]],
					},
					{
						index: 1,
						values: [['us', 'chrome', 1, 12]],
					},
					{
						index: 2,
						values: [['test', 'test', 55, 123]],
					},
					{
						index: 3,
						values: [['ua', 'chrome', 1, 3]],
					},
					{
						index: 4,
						values: [['ua', 'firefox', 1, 4]],
					},
					{
						index: 5,
						values: [['uk', 'chrome', 1, 55]],
					},
				];
			}
		}),
	};
});

describe('Test MicrosoftExcelV2, table => lookup', () => {
	const workflows = ['nodes/Microsoft/Excel/test/v2/node/table/lookup.workflow.json'];
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

		expect(transport.microsoftApiRequestAllItemsSkip).toHaveBeenCalledTimes(2);
		expect(transport.microsoftApiRequestAllItemsSkip).toHaveBeenCalledWith(
			'value',
			'GET',
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/{00000000-0001-0000-0000-000000000000}/tables/{613E8967-D581-44ED-81D3-82A01AA6A05C}/rows',
			{},
			{},
		);
		expect(transport.microsoftApiRequestAllItemsSkip).toHaveBeenCalledWith(
			'value',
			'GET',
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/{00000000-0001-0000-0000-000000000000}/tables/{613E8967-D581-44ED-81D3-82A01AA6A05C}/columns',
			{},
			{ $select: 'name' },
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
