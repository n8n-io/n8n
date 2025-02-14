import type { IHttpRequestMethods, INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../v2/transport');
	return {
		...originalModule,
		googleBigQueryApiRequest: jest.fn(async (method: IHttpRequestMethods, resource: string) => {
			if (
				resource ===
					'/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/test_json' &&
				method === 'GET'
			) {
				return {
					schema: {
						fields: [
							{ name: 'json', type: 'JSON' },
							{ name: 'name with space', type: 'STRING' },
							{ name: 'active', type: 'BOOLEAN' },
						],
					},
				};
			}
			if (
				resource ===
					'/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/test_json/insertAll' &&
				method === 'POST'
			) {
				return { kind: 'bigquery#tableDataInsertAllResponse' };
			}
		}),
		googleApiRequestAllItems: jest.fn(async () => {}),
	};
});

describe('Test Google BigQuery V2, insert define manually', () => {
	const workflows = ['nodes/Google/BigQuery/test/v2/node/insert.manualMode.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		expect(transport.googleBigQueryApiRequest).toHaveBeenCalledTimes(2);
		expect(transport.googleBigQueryApiRequest).toHaveBeenCalledWith(
			'GET',
			'/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/test_json',
			{},
		);
		expect(transport.googleBigQueryApiRequest).toHaveBeenCalledWith(
			'POST',
			'/v2/projects/test-project/datasets/bigquery_node_dev_test_dataset/tables/test_json/insertAll',
			{
				rows: [{ json: { active: 'true', json: '{"test": 1}', 'name with space': 'some name' } }],
				traceId: 'trace_id',
			},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
