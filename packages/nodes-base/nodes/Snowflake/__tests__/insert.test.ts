import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import snowflake from 'snowflake-sdk';

import { setupSnowflakeMocks, snowflakeCredentials } from './snowflake-test-utils';

const { mockExecute } = setupSnowflakeMocks();

describe('Test Snowflake, insert - parameter binding without origin hostname', () => {
	new NodeTestHarness().setupTests({
		workflowFiles: ['insert.workflow.json'],
		credentials: { snowflake: snowflakeCredentials },
		customAssertions() {
			expect(snowflake.createConnection).toHaveBeenCalledWith({
				account: 'test-account',
				database: 'TEST_DB',
				schema: 'PUBLIC',
				warehouse: 'WH',
				role: 'SYSADMIN',
				clientSessionKeepAlive: false,
				username: 'user',
				password: 'pass',
			});
			// One ALTER SESSION (STRICT_JSON_OUTPUT) call plus one INSERT for the single row
			expect(mockExecute).toHaveBeenCalledTimes(2);
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({ sqlText: 'ALTER SESSION SET STRICT_JSON_OUTPUT = TRUE' }),
			);
			expect(mockExecute).toHaveBeenCalledWith(
				expect.objectContaining({
					sqlText: 'INSERT INTO "ORDERS" ("NAME","STATUS") VALUES (?,?)',
					binds: [['Alice', 'active']],
				}),
			);
		},
	});
});

describe('Test Snowflake, insert - parameter binding with origin hostname', () => {
	new NodeTestHarness().setupTests({
		workflowFiles: ['insert.workflow.json'],
		credentials: {
			snowflake: {
				...snowflakeCredentials,
				host: 'acme-org.us-east-1.snowflakecomputing.com',
			},
		},
		customAssertions() {
			expect(snowflake.createConnection).toHaveBeenCalledWith({
				account: 'test-account',
				database: 'TEST_DB',
				schema: 'PUBLIC',
				warehouse: 'WH',
				role: 'SYSADMIN',
				clientSessionKeepAlive: false,
				host: 'acme-org.us-east-1.snowflakecomputing.com',
				username: 'user',
				password: 'pass',
			});
			expect(mockExecute).toHaveBeenCalledTimes(2);
		},
	});
});
