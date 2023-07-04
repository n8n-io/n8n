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
		microsoftApiRequest: jest.fn(async function (method: string) {
			if (method === 'POST') {
				return {
					address: 'Sheet4!A1:D5',
					values: [
						['id', 'name', 'age', 'data'],
						[1, 'Sam', 33, 'data 1'],
						[2, 'Jon', 44, 'data 2'],
						[3, 'Sam', 34, 'data 4'],
						[3, 'Donald', 99, 'data 5'],
					],
				};
			}
		}),
	};
});

describe('Test MicrosoftExcelV2, table => convertToRange', () => {
	const workflows = ['nodes/Microsoft/Excel/test/v2/node/table/convertToRange.workflow.json'];
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
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/{A0883CFE-D27E-4ECC-B94B-981830AAD55B}/tables/{6321EE4A-AC21-48AD-87D9-B527637D94B3}/convertToRange',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => testNode(testData, nodeTypes));
	}
});
