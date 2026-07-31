import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import type { Connection, QueryResult } from 'mysql2/promise';

const mockConnection = mock<Connection>();
const createConnection = jest.fn().mockReturnValue(mockConnection);
jest.mock('mysql2/promise', () => ({ createConnection }));

describe('Test MySqlV1, executeQuery leaves placeholders inside quotes untouched', () => {
	mockConnection.query.mockResolvedValue([{ success: true } as unknown as QueryResult, []]);

	new NodeTestHarness().setupTests({
		workflowFiles: ['executeQuery.quotedLiteral.workflow.json'],
		customAssertions() {
			// `'$5'` is inside a string literal and must be preserved verbatim,
			// while `$1` outside quotes is bound as a parameter.
			expect(mockConnection.query).toHaveBeenCalledTimes(1);
			expect(mockConnection.query).toHaveBeenCalledWith(
				"select * from users where label = '$5' and id = ?",
				['7'],
			);
		},
	});
});
