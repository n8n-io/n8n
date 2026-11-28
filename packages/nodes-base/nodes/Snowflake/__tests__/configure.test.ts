import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import snowflake from 'snowflake-sdk';

import { setupSnowflakeMocks, snowflakeCredentials } from './snowflake-test-utils';

const { mockExecute } = setupSnowflakeMocks();

describe('Snowflake node — SDK and session configuration', () => {
	new NodeTestHarness().setupTests({
		workflowFiles: ['insert.workflow.json'],
		credentials: { snowflake: snowflakeCredentials },
		customAssertions() {
			expect(snowflake.configure).toHaveBeenCalledWith(
				expect.objectContaining({
					jsonColumnVariantParser: JSON.parse,
					ocspFailOpen: true,
				}),
			);
			expect(snowflake.configure).toHaveBeenCalledBefore(vi.mocked(snowflake.createConnection));

			// The session forces valid JSON output for those columns.
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({ sqlText: 'ALTER SESSION SET STRICT_JSON_OUTPUT = TRUE' }),
			);
		},
	});
});
