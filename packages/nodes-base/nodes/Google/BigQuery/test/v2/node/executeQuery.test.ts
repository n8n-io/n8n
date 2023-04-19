import type { INodeTypes } from 'n8n-workflow';

import { setup, workflowToTests } from '../../../../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../../../../test/nodes/types';
import { executeWorkflow } from '../../../../../../test/nodes/ExecuteWorkflow';

import * as transport from '../../../v2/transport';

import nock from 'nock';

jest.mock('../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../v2/transport');
	return {
		...originalModule,
		googleApiRequest: jest.fn(async (method: string, resource: string) => {
			if (resource === '/v2/projects/test-project/jobs' && method === 'POST') {
				return Promise.resolve({
					jobReference: {
						jobId: 'job_123',
					},
					status: {
						state: 'DONE',
					},
				});
			}
			if (resource === '/v2/projects/test-project/queries/job_123' && method === 'GET') {
				return Promise.resolve({});
			}
			return Promise.resolve();
		}),
		// googleApiRequestAllItems: jest.fn(async () => Promise.resolve()),
	};
});

describe('Test Google BigQuery V2, executeQuery', () => {
	const workflows = ['nodes/Google/BigQuery/test/v2/node/executeQuery.workflow.json'];
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
			'POST',
			'/v2/projects/test-project/jobs',
			{
				configuration: {
					query: {
						query: 'SELECT * FROM bigquery_node_dev_test_dataset.test_json;',
						useLegacySql: false,
					},
				},
			},
		);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/v2/projects/test-project/queries/job_123',
			undefined,
			{},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => testNode(testData, nodeTypes));
	}
});
