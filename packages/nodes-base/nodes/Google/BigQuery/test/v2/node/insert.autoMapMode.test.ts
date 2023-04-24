import type { INodeTypes } from 'n8n-workflow';

import { setup, workflowToTests } from '../../../../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../../../../test/nodes/types';
import { executeWorkflow } from '../../../../../../test/nodes/ExecuteWorkflow';
import nock from 'nock';

import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../v2/transport');
	return {
		...originalModule,
		googleApiRequest: jest.fn(async (method: string, resource: string) => {
			if (
				resource ===
					'/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/num_text' &&
				method === 'GET'
			) {
				return {
					schema: {
						fields: [
							{ name: 'id', type: 'INT' },
							{ name: 'test', type: 'STRING' },
						],
					},
				};
			}
			if (
				resource ===
					'/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/num_text/insertAll' &&
				method === 'POST'
			) {
				return { kind: 'bigquery#tableDataInsertAllResponse' };
			}
		}),
		googleApiRequestAllItems: jest.fn(async () => {}),
	};
});

describe('Test Google BigQuery V2, insert auto map', () => {
	const workflows = ['nodes/Google/BigQuery/test/v2/node/insert.autoMapMode.workflow.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../v2/transport');
	});

	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		expect(transport.googleApiRequest).toHaveBeenCalledTimes(2);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/num_text',
			{},
		);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/num_text/insertAll',
			{
				rows: [
					{ json: { id: 1, test: '111' } },
					{ json: { id: 2, test: '222' } },
					{ json: { id: 3, test: '333' } },
				],
				traceId: 'trace_id',
			},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => testNode(testData, nodeTypes));
	}
});
