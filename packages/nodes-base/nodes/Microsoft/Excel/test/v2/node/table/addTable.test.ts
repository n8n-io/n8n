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
			if (method === 'POST') {
				return {
					style: 'TableStyleMedium2',
					name: 'Table3',
					showFilterButton: true,
					id: '{317CA469-7D1C-4A5D-9B0B-424444BF0336}',
					highlightLastColumn: false,
					highlightFirstColumn: false,
					legacyId: '3',
					showBandedColumns: false,
					showBandedRows: true,
					showHeaders: true,
					showTotals: false,
				};
			}
		}),
	};
});

describe('Test MicrosoftExcelV2, table => addTable', () => {
	const workflows = ['nodes/Microsoft/Excel/test/v2/node/table/addTable.workflow.json'];
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
			'POST',
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/{A0883CFE-D27E-4ECC-B94B-981830AAD55B}/tables/add',
			{ address: 'A1:D4', hasHeaders: true },
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
