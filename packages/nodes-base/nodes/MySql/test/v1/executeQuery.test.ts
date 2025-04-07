import { mock } from 'jest-mock-extended';
import type { Connection, QueryResult } from 'mysql2/promise';
import type { WorkflowTestData } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, workflowToTests } from '@test/nodes/Helpers';

const mockConnection = mock<Connection>();
const createConnection = jest.fn().mockReturnValue(mockConnection);
jest.mock('mysql2/promise', () => ({ createConnection }));

describe('Test MySqlV1, executeQuery', () => {
	mockConnection.query.mockResolvedValue([{ success: true } as unknown as QueryResult, []]);

	const workflows = ['nodes/MySql/test/v1/executeQuery.workflow.json'];
	const tests = workflowToTests(workflows);

	const testNode = async (testData: WorkflowTestData) => {
		const { result } = await executeWorkflow(testData);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(mockConnection.query).toHaveBeenCalledTimes(1);
		expect(mockConnection.query).toHaveBeenCalledWith(
			"select * from family_parents where (parent_email = 'parent1@mail.com' or parent_email = 'parent2@mail.com') and parent_email <> '';",
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData));
	}
});
