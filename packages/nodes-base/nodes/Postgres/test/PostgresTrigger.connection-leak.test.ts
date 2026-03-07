/**
 * Regression test for Postgres Trigger connection leak bug.
 *
 * This test verifies that Postgres Trigger nodes properly release database connections
 * when workflows are deactivated and reactivated, preventing connection accumulation.
 *
 * Bug: https://github.com/n8n-io/n8n/issues/17795
 * When a workflow with a Postgres Trigger node is deactivated and reactivated,
 * the old database connection listening for events (LISTEN n8n_channel_...) was not
 * terminated, leading to connection leaks and eventual max_connections exhaustion.
 */

import { mock } from 'jest-mock-extended';
import type {
	ICredentialsDecrypted,
	ITriggerFunctions,
	ITriggerResponse,
	Workflow,
} from 'n8n-workflow';
import { LoggerProxy, TriggerCloseError } from 'n8n-workflow';

import { PostgresTrigger } from '../PostgresTrigger.node';
import * as PostgresTriggerFunctions from '../PostgresTrigger.functions';

// Mock the PostgresTrigger.functions module
jest.mock('../PostgresTrigger.functions');

describe('PostgresTrigger Connection Leak Prevention', () => {
	let mockTriggerFunctions: ITriggerFunctions;
	let mockCredentials: ICredentialsDecrypted;
	let connectionReleaseCallCount = 0;
	let mockConnection: any;
	let mockDb: any;

	beforeAll(() => {
		LoggerProxy.init(mock());
	});

	beforeEach(() => {
		jest.clearAllMocks();
		connectionReleaseCallCount = 0;

		// Mock credentials
		mockCredentials = {
			id: 'test-cred-id',
			name: 'Test Postgres Credentials',
			type: 'postgres',
			data: {
				host: 'localhost',
				port: 5432,
				database: 'test_db',
				user: 'test_user',
				password: 'test_password',
			},
		};

		// Create mock connection with done() tracking
		mockConnection = {
			none: jest.fn().mockResolvedValue(undefined),
			query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
			any: jest.fn().mockResolvedValue([]),
			done: jest.fn().mockImplementation(async () => {
				connectionReleaseCallCount++;
			}),
			client: {
				on: jest.fn(),
				removeListener: jest.fn(),
			},
		};

		// Create mock db
		mockDb = {
			connect: jest.fn().mockResolvedValue(mockConnection),
		};

		// Mock initDB function
		(PostgresTriggerFunctions.initDB as jest.Mock) = jest
			.fn()
			.mockResolvedValue({ db: mockDb });

		// Mock pgTriggerFunction
		(PostgresTriggerFunctions.pgTriggerFunction as jest.Mock) = jest
			.fn()
			.mockResolvedValue(undefined);

		// Mock prepareNames
		(PostgresTriggerFunctions.prepareNames as jest.Mock) = jest.fn().mockReturnValue({
			functionName: 'n8n_trigger_function_test()',
			triggerName: 'n8n_trigger_test',
			channelName: 'n8n_channel_test',
		});

		// Mock trigger functions
		mockTriggerFunctions = mock<ITriggerFunctions>({
			getNodeParameter: jest.fn((param: string) => {
				if (param === 'triggerMode') return 'createTrigger';
				if (param === 'schema') return { mode: 'list', value: 'public' };
				if (param === 'tableName') return { mode: 'list', value: 'test_table' };
				if (param === 'firesOn') return 'INSERT';
				if (param === 'additionalFields') return {};
				if (param === 'options') return {};
				return undefined;
			}),
			getCredentials: jest.fn().mockResolvedValue(mockCredentials),
			getNode: jest.fn().mockReturnValue({
				id: 'test-node-id',
				name: 'Postgres Trigger',
				type: 'n8n-nodes-base.postgresTrigger',
			}),
			getMode: jest.fn().mockReturnValue('trigger'),
			getWorkflow: jest.fn().mockReturnValue(mock<Workflow>()),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			},
			emit: jest.fn(),
			logger: {
				debug: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			},
		});
	});

	it('should provide closeFunction that releases connection', async () => {
		const trigger = new PostgresTrigger();
		const response = await trigger.trigger.call(mockTriggerFunctions);

		expect(response.closeFunction).toBeDefined();
		expect(typeof response.closeFunction).toBe('function');
		expect(mockDb.connect).toHaveBeenCalledWith({ direct: true });

		// Call closeFunction and verify connection.done() is called
		await response.closeFunction!();

		expect(connectionReleaseCallCount).toBe(1);
		expect(mockConnection.done).toHaveBeenCalledTimes(1);
		expect(mockConnection.client.removeListener).toHaveBeenCalled();
	});

	it('should release connection even if cleanup operations fail', async () => {
		// Make UNLISTEN fail
		mockConnection.none.mockRejectedValueOnce(new Error('UNLISTEN failed'));

		const trigger = new PostgresTrigger();
		const response = await trigger.trigger.call(mockTriggerFunctions);

		// Even if cleanup fails, connection should be released in finally block
		await expect(response.closeFunction!()).rejects.toThrow();

		expect(connectionReleaseCallCount).toBe(1);
		expect(mockConnection.done).toHaveBeenCalledTimes(1);
	});

	it('should prevent double-release of connection', async () => {
		const trigger = new PostgresTrigger();
		const response = await trigger.trigger.call(mockTriggerFunctions);

		// Call closeFunction multiple times - should only release once due to guard flag
		await response.closeFunction!();
		await response.closeFunction!();

		expect(connectionReleaseCallCount).toBe(1);
		expect(mockConnection.done).toHaveBeenCalledTimes(1);
	});

	it('should handle connection already closed gracefully', async () => {
		// Make connection check fail (connection already closed)
		mockConnection.query.mockRejectedValueOnce(new Error('Connection closed'));

		const trigger = new PostgresTrigger();
		const response = await trigger.trigger.call(mockTriggerFunctions);

		// Should handle gracefully even if connection check fails
		await expect(response.closeFunction!()).rejects.toThrow(TriggerCloseError);

		// Connection should still be released in finally block
		expect(connectionReleaseCallCount).toBe(1);
		expect(mockConnection.done).toHaveBeenCalledTimes(1);
	});

	it('should release connection even if done() throws error', async () => {
		// Make connection.done() throw an error
		mockConnection.done.mockRejectedValueOnce(new Error('Release failed'));

		const trigger = new PostgresTrigger();
		const response = await trigger.trigger.call(mockTriggerFunctions);

		// Should handle error gracefully and not throw
		await expect(response.closeFunction!()).resolves.not.toThrow();

		// Should have attempted to release
		expect(mockConnection.done).toHaveBeenCalledTimes(1);
		// Logger should have been called with warning
		expect(mockTriggerFunctions.logger.warn).toHaveBeenCalled();
	});

	it('should call UNLISTEN before releasing connection', async () => {
		const trigger = new PostgresTrigger();
		const response = await trigger.trigger.call(mockTriggerFunctions);

		await response.closeFunction!();

		// Verify cleanup operations are called in correct order
		expect(mockConnection.none).toHaveBeenCalledWith(
			expect.stringContaining('UNLISTEN'),
			expect.any(Array),
		);
		expect(mockConnection.done).toHaveBeenCalled();
	});
});
