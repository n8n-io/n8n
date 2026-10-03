import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { setupSnowflakeMocks, snowflakeCredentials } from './snowflake-test-utils';

const { mockExecute } = setupSnowflakeMocks();

describe('Test Snowflake, update - parameter binding', () => {
	new NodeTestHarness().setupTests({
		workflowFiles: ['update.workflow.json'],
		credentials: { snowflake: snowflakeCredentials },
		customAssertions() {
			// One ALTER SESSION (STRICT_JSON_OUTPUT) call plus one UPDATE for the single row
			expect(mockExecute).toHaveBeenCalledTimes(2);
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({ sqlText: 'ALTER SESSION SET STRICT_JSON_OUTPUT = TRUE' }),
			);
			// Columns list is ["id", "status"] (updateKey "id" prepended since not in "status")
			// Binds: [id_value, status_value, updateKey_value]
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({
					sqlText: 'UPDATE "ORDERS" SET "ID" = ?,"STATUS" = ? WHERE "ID" = ?;',
					binds: [1, 'shipped', 1],
				}),
			);
		},
	});
});
