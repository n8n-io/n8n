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
			if (method === 'POST' && resource.includes('createSession')) {
				return {
					id: 12345,
				};
			}
			if (method === 'POST' && resource.includes('add')) {
				return {
					id: '{266ADAB7-25B6-4F28-A2D1-FD5BFBD7A4F0}',
					name: 'Sheet42',
					position: 8,
					visibility: 'Visible',
				};
			}
			if (method === 'POST' && resource.includes('closeSession')) {
				return;
			}
		}),
	};
});

describe('Test MicrosoftExcelV2, workbook => addWorksheet', () => {
	const workflows = ['nodes/Microsoft/Excel/test/v2/node/workbook/addWorksheet.workflow.json'];
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

		expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(3);
		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/createSession',
			{ persistChanges: true },
		);
		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/add',
			{ name: 'Sheet42' },
			{},
			'',
			{ 'workbook-session-id': 12345 },
		);
		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/closeSession',
			{},
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
