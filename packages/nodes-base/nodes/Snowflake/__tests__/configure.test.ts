import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import snowflake from 'snowflake-sdk';

import { setupSnowflakeMocks, snowflakeCredentials } from './snowflake-test-utils';

const { mockExecute } = setupSnowflakeMocks();

describe('Snowflake node — VARIANT column parser configuration', () => {
	new NodeTestHarness().setupTests({
		workflowFiles: ['insert.workflow.json'],
		credentials: { snowflake: snowflakeCredentials },
		customAssertions() {
			// VARIANT/OBJECT/ARRAY columns are parsed with JSON.parse.
			expect(snowflake.configure).toHaveBeenCalledWith(
				expect.objectContaining({ jsonColumnVariantParser: JSON.parse }),
			);

			// The session forces valid JSON output for those columns.
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({ sqlText: 'ALTER SESSION SET STRICT_JSON_OUTPUT = TRUE' }),
			);
		},
	});
});
