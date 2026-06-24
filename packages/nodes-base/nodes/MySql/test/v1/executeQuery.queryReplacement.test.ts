import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import type { Connection, QueryResult } from 'mysql2/promise';

const mockConnection = mock<Connection>();
const createConnection = jest.fn().mockReturnValue(mockConnection);
jest.mock('mysql2/promise', () => ({ createConnection }));

describe('Test MySqlV1, executeQuery with query parameters', () => {
	mockConnection.query.mockResolvedValue([{ success: true } as unknown as QueryResult, []]);

	new NodeTestHarness().setupTests({
		workflowFiles: ['executeQuery.queryReplacement.workflow.json'],
		customAssertions() {
			expect(mockConnection.query).toHaveBeenCalledTimes(1);
			expect(mockConnection.query).toHaveBeenCalledWith('select * from users where id = ?', [
				'1 OR 1=1',
			]);
		},
	});
});
