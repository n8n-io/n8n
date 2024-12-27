import { ConnectionPoolManager } from '@utils/connection-pool-manager';

const ttl = 5 * 60 * 1000;
const cleanUpInterval = 60 * 1000;

let cpm: ConnectionPoolManager;

beforeAll(() => {
	jest.useFakeTimers();
	cpm = ConnectionPoolManager.getInstance();
});

beforeEach(async () => {
	await cpm.purgeConnections();
});

afterAll(() => {
	cpm.onShutdown();
});

test('getInstance returns a singleton', () => {
	const instance1 = ConnectionPoolManager.getInstance();
	const instance2 = ConnectionPoolManager.getInstance();

	expect(instance1).toBe(instance2);
});

describe('getConnection', () => {
	test('calls fallBackHandler only once and returns the first value', async () => {
		// ARRANGE
		const connectionType = {};
		const fallBackHandler = jest.fn().mockResolvedValue(connectionType);
		const cleanUpHandler = jest.fn();
		const options = {
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler,
			cleanUpHandler,
		};

		// ACT 1
		const connection = await cpm.getConnection<string>(options);

		// ASSERT 1
		expect(fallBackHandler).toHaveBeenCalledTimes(1);
		expect(connection).toBe(connectionType);

		// ACT 2
		const connection2 = await cpm.getConnection<string>(options);
		// ASSERT 2
		expect(fallBackHandler).toHaveBeenCalledTimes(1);
		expect(connection2).toBe(connectionType);
	});

	test('creates different pools for different node versions', async () => {
		// ARRANGE
		const connectionType1 = {};
		const fallBackHandler1 = jest.fn().mockResolvedValue(connectionType1);
		const cleanUpHandler1 = jest.fn();

		const connectionType2 = {};
		const fallBackHandler2 = jest.fn().mockResolvedValue(connectionType2);
		const cleanUpHandler2 = jest.fn();

		// ACT 1
		const connection1 = await cpm.getConnection<string>({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler: fallBackHandler1,
			cleanUpHandler: cleanUpHandler1,
		});
		const connection2 = await cpm.getConnection<string>({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '2',
			fallBackHandler: fallBackHandler2,
			cleanUpHandler: cleanUpHandler2,
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
		const fallBackHandler = jest.fn().mockResolvedValue(connectionType);
		const cleanUpHandler = jest.fn();
		await cpm.getConnection<string>({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler,
			cleanUpHandler,
		});

		// ACT
		jest.advanceTimersByTime(ttl + cleanUpInterval * 2);

		// ASSERT
		expect(cleanUpHandler).toHaveBeenCalledTimes(1);
	});
});

describe('onShutdown', () => {
	test('calls all clean up handlers', async () => {
		// ARRANGE
		const connectionType1 = {};
		const fallBackHandler1 = jest.fn().mockResolvedValue(connectionType1);
		const cleanUpHandler1 = jest.fn();
		await cpm.getConnection<string>({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler: fallBackHandler1,
			cleanUpHandler: cleanUpHandler1,
		});

		const connectionType2 = {};
		const fallBackHandler2 = jest.fn().mockResolvedValue(connectionType2);
		const cleanUpHandler2 = jest.fn();
		await cpm.getConnection<string>({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '2',
			fallBackHandler: fallBackHandler2,
			cleanUpHandler: cleanUpHandler2,
		});

		// ACT 1
		cpm.onShutdown();

		// ASSERT
		expect(cleanUpHandler1).toHaveBeenCalledTimes(1);
		expect(cleanUpHandler2).toHaveBeenCalledTimes(1);
	});

	test('calls all clean up handlers when `exit` is emitted on process', async () => {
		// ARRANGE
		const connectionType1 = {};
		const fallBackHandler1 = jest.fn().mockResolvedValue(connectionType1);
		const cleanUpHandler1 = jest.fn();
		await cpm.getConnection<string>({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '1',
			fallBackHandler: fallBackHandler1,
			cleanUpHandler: cleanUpHandler1,
		});

		const connectionType2 = {};
		const fallBackHandler2 = jest.fn().mockResolvedValue(connectionType2);
		const cleanUpHandler2 = jest.fn();
		await cpm.getConnection<string>({
			credentials: {},
			nodeType: 'example',
			nodeVersion: '2',
			fallBackHandler: fallBackHandler2,
			cleanUpHandler: cleanUpHandler2,
		});

		// ACT 1
		// @ts-expect-error we're not supposed to emit `exit` so it's missing from
		// the type definition
		process.emit('exit');

		// ASSERT
		expect(cleanUpHandler1).toHaveBeenCalledTimes(1);
		expect(cleanUpHandler2).toHaveBeenCalledTimes(1);
	});
});
