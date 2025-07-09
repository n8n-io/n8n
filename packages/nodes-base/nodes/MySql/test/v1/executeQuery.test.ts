import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import type { Connection, QueryResult } from 'mysql2/promise';

const mockConnection = mock<Connection>();
const createConnection = jest.fn().mockReturnValue(mockConnection);
jest.mock('mysql2/promise', () => ({ createConnection }));

describe('Test MySqlV1, executeQuery', () => {
	mockConnection.query.mockResolvedValue([{ success: true } as unknown as QueryResult, []]);

	new NodeTestHarness().setupTests({
		workflowFiles: ['executeQuery.workflow.json'],
		customAssertions() {
			expect(mockConnection.query).toHaveBeenCalledTimes(1);
			expect(mockConnection.query).toHaveBeenCalledWith(
				"select * from family_parents where (parent_email = 'parent1@mail.com' or parent_email = 'parent2@mail.com') and parent_email <> '';",
			);
		},
	});
});
