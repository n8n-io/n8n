import { mock } from 'jest-mock-extended';
import { OperationalError, type Logger } from 'n8n-workflow';

import { ConnectionPoolManager } from '@utils/connection-pool-manager';

const ttl = 5 * 60 * 1000;
const cleanUpInterval = 60 * 1000;

const logger = mock<Logger>();

let cpm: ConnectionPoolManager;

beforeAll(() => {
	jest.useFakeTimers();
	cpm = ConnectionPoolManager.getInstance(logger);
});

beforeEach(async () => {
	cpm.purgeConnections();
});

afterAll(() => {
	cpm.purgeConnections();
});

test('getInstance returns a singleton', () => {
	const instance1 = ConnectionPoolManager.getInstance(logger);
	const instance2 = ConnectionPoolManager.getInstance(logger);

	expect(instance1).toBe(instance2);
});

describe('getConnection', () => {
	test('calls fallBackHandler only once and returns the first value', async () => {
		// ARRANGE
		const connectionType = {};
		const fallBackHandler = jest.fn(async () => {
			return connectionType;
		});

		const options = {
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler,
			wasUsed: jest.fn(),
		};

		// ACT 1
		const connection = await cpm.getConnection(options);

		// ASSERT 1
		expect(fallBackHandler).toHaveBeenCalledTimes(1);
		expect(connection).toBe(connectionType);

		// ACT 2
		const connection2 = await cpm.getConnection(options);
		// ASSERT 2
		expect(fallBackHandler).toHaveBeenCalledTimes(1);
		expect(connection2).toBe(connectionType);
	});

	test('creates different pools for different node versions', async () => {
		// ARRANGE
		const connectionType1 = {};
		const fallBackHandler1 = jest.fn(async () => {
			return connectionType1;
		});

		const connectionType2 = {};
		const fallBackHandler2 = jest.fn(async () => {
			return connectionType2;
		});

		// ACT 1
		const connection1 = await cpm.getConnection({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler: fallBackHandler1,
			wasUsed: jest.fn(),
		});
		const connection2 = await cpm.getConnection({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '2',
			fallBackHandler: fallBackHandler2,
			wasUsed: jest.fn(),
		});

		// ASSERT
		expect(fallBackHandler1).toHaveBeenCalledTimes(1);
		expect(connection1).toBe(connectionType1);

		expect(fallBackHandler2).toHaveBeenCalledTimes(1);
		expect(connection2).toBe(connectionType2);

		expect(connection1).not.toBe(connection2);
	});

	test('calls cleanUpHandler after TTL expires', async () => {
		// ARRANGE
		const connectionType = {};
		let abortController: AbortController | undefined;
		const fallBackHandler = jest.fn(async (ac: AbortController) => {
			abortController = ac;
			return connectionType;
		});
		await cpm.getConnection({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler,
			wasUsed: jest.fn(),
		});

		// ACT
		jest.advanceTimersByTime(ttl + cleanUpInterval * 2);

		// ASSERT
		if (abortController === undefined) {
			fail("abortController haven't been initialized");
		}
		expect(abortController.signal.aborted).toBe(true);
	});

	test('throws OperationsError if the fallBackHandler aborts during connection initialization', async () => {
		// ARRANGE
		const connectionType = {};
		const fallBackHandler = jest.fn(async (ac: AbortController) => {
			ac.abort();
			return connectionType;
		});

		// ACT
		const connectionPromise = cpm.getConnection({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler,
			wasUsed: jest.fn(),
		});

		// ASSERT

		await expect(connectionPromise).rejects.toThrow(OperationalError);
		await expect(connectionPromise).rejects.toThrow(
			'Could not create pool. Connection attempt was aborted.',
		);
	});
});

describe('onShutdown', () => {
	test('calls all clean up handlers', async () => {
		// ARRANGE
		const connectionType1 = {};
		let abortController1: AbortController | undefined;
		const fallBackHandler1 = jest.fn(async (ac: AbortController) => {
			abortController1 = ac;
			return connectionType1;
		});
		await cpm.getConnection({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler: fallBackHandler1,
			wasUsed: jest.fn(),
		});

		const connectionType2 = {};
		let abortController2: AbortController | undefined;
		const fallBackHandler2 = jest.fn(async (ac: AbortController) => {
			abortController2 = ac;
			return connectionType2;
		});
		await cpm.getConnection({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '2',
			fallBackHandler: fallBackHandler2,
			wasUsed: jest.fn(),
		});

		// ACT
		cpm.purgeConnections();

		// ASSERT
		if (abortController1 === undefined || abortController2 === undefined) {
			fail("abortController haven't been initialized");
		}
		expect(abortController1.signal.aborted).toBe(true);
		expect(abortController2.signal.aborted).toBe(true);
	});

	test('calls all clean up handlers when `exit` is emitted on process', async () => {
		// ARRANGE
		const connectionType1 = {};
		let abortController1: AbortController | undefined;
		const fallBackHandler1 = jest.fn(async (ac: AbortController) => {
			abortController1 = ac;
			return connectionType1;
		});
		await cpm.getConnection({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler: fallBackHandler1,
			wasUsed: jest.fn(),
		});

		const connectionType2 = {};
		let abortController2: AbortController | undefined;
		const fallBackHandler2 = jest.fn(async (ac: AbortController) => {
			abortController2 = ac;
			return connectionType2;
		});
		await cpm.getConnection({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '2',
			fallBackHandler: fallBackHandler2,
			wasUsed: jest.fn(),
		});

		// ACT
		// @ts-expect-error we're not supposed to emit `exit` so it's missing from
		// the type definition
		process.emit('exit');

		// ASSERT
		if (abortController1 === undefined || abortController2 === undefined) {
			fail("abortController haven't been initialized");
		}
		expect(abortController1.signal.aborted).toBe(true);
		expect(abortController2.signal.aborted).toBe(true);
	});
});

describe('wasUsed', () => {
	test('is called for every successive `getConnection` call', async () => {
		// ARRANGE
		const connectionType = {};
		const fallBackHandler = jest.fn(async () => {
			return connectionType;
		});

		const wasUsed = jest.fn();
		const options = {
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler,
			wasUsed,
		};

		// ACT 1
		await cpm.getConnection(options);

		// ASSERT 1
		expect(wasUsed).toHaveBeenCalledTimes(0);

		// ACT 2
		await cpm.getConnection(options);

		// ASSERT 2
		expect(wasUsed).toHaveBeenCalledTimes(1);
	});
});
