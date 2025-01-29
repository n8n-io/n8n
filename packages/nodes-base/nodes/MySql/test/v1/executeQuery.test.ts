import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

const queryMock = jest.fn(async function () {
	return [{ success: true }];
});

jest.mock('../../v1/GenericFunctions', () => {
	const originalModule = jest.requireActual('../../v1/GenericFunctions');
	return {
		...originalModule,
		createConnection: jest.fn(async function () {
			return {
				query: queryMock,
				end: jest.fn(),
			};
		}),
	};
});

describe('Test MySqlV1, executeQuery', () => {
	const workflows = ['nodes/MySql/test/v1/executeQuery.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(queryMock).toHaveBeenCalledTimes(1);
		expect(queryMock).toHaveBeenCalledWith(
			"select * from family_parents where (parent_email = 'parent1@mail.com' or parent_email = 'parent2@mail.com') and parent_email <> '';",
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
