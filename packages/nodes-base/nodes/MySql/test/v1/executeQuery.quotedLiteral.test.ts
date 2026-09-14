import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import mysql2 from 'mysql2/promise';
import type { Connection, QueryResult } from 'mysql2/promise';
import { mock } from 'vitest-mock-extended';

const mockConnection = mock<Connection>();

describe('Test MySqlV1, executeQuery leaves placeholders inside quotes untouched', () => {
	// The harness loads the node from dist via require(), so vi.mock cannot intercept its
	// `mysql2/promise` import. mysql2 is externalized, so the test and the node share the same
	// module instance — spy on it instead. Re-applied per test since restoreMocks resets spies.
	beforeEach(() => {
		vi.spyOn(mysql2, 'createConnection').mockResolvedValue(mockConnection);
		mockConnection.query.mockResolvedValue([{ success: true } as unknown as QueryResult, []]);
	});

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
