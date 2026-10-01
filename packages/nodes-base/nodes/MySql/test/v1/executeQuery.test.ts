import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'vitest-mock-extended';
import mysql2 from 'mysql2/promise';
import type { Connection, QueryResult } from 'mysql2/promise';

const mockConnection = mock<Connection>();

describe('Test MySqlV1, executeQuery', () => {
	// The harness loads the node from dist via require(), so vi.mock cannot intercept its
	// `mysql2/promise` import. mysql2 is externalized, so the test and the node share the same
	// module instance — spy on it instead. Re-applied per test since restoreMocks resets spies.
	beforeEach(() => {
		vi.spyOn(mysql2, 'createConnection').mockResolvedValue(mockConnection);
		mockConnection.query.mockResolvedValue([{ success: true } as unknown as QueryResult, []]);
	});

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
