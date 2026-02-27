import { mock } from 'jest-mock-extended';
import * as mssql from 'mssql';
import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type { IExecuteFunctions } from 'n8n-workflow';

import { MicrosoftSql } from '../MicrosoftSql.node';

jest.mock('mssql');

function getMockedExecuteFunctions(overrides: Partial<IExecuteFunctions> = {}) {
	return mock<IExecuteFunctions>({
		getCredentials: jest.fn().mockResolvedValue({
			server: 'localhost',
			database: 'testdb',
			user: 'testuser',
			password: 'testpass',
			port: 1433,
			tls: false,
			allowUnauthorizedCerts: true,
			tdsVersion: '7_4',
			connectTimeout: 1000,
			requestTimeout: 10000,
		}),
		getInputData: jest.fn().mockReturnValue([{ json: {} }]),
		getNode: jest.fn().mockReturnValue({ typeVersion: 1.1 }),
		continueOnFail: jest.fn().mockReturnValue(true),
		helpers: {
			constructExecutionMetaData,
			returnJsonArray,
		},
		evaluateExpression: jest.fn((_val) => _val),
		...overrides,
	});
}

describe('MicrosoftSql Node', () => {
	let mockedConnectionPool: jest.MockedClass<typeof mssql.ConnectionPool>;

	beforeEach(() => {
		mockedConnectionPool = mssql.ConnectionPool as jest.MockedClass<typeof mssql.ConnectionPool>;
	});

	test('handles connection error with continueOnFail', async () => {
		const fakeError = new Error('Connection failed');
		mockedConnectionPool.mockReturnValue(
			mock<mssql.ConnectionPool>({
				connect: jest.fn().mockRejectedValue(fakeError),
				close: jest.fn(),
			}),
		);

		const node = new MicrosoftSql();
		const context = getMockedExecuteFunctions();
		const result = await node.execute.call(context);

		expect(result).toEqual([[{ json: { error: 'Connection failed' }, pairedItem: [{ item: 0 }] }]]);
	});

	test('executes query on happy path', async () => {
		const queryResult = { recordsets: [[{ value: 1 }]] };
		const mockRequest = { query: jest.fn().mockResolvedValue(queryResult) };
		const mockPool = mock<mssql.ConnectionPool>({
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn(),
			request: jest.fn().mockReturnValue(mockRequest),
		});

		mockedConnectionPool.mockReturnValue(mockPool);

		const node = new MicrosoftSql();
		const context = getMockedExecuteFunctions({
			getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'executeQuery';
				if (paramName === 'query') return 'SELECT 1 AS value';
				return undefined;
			}),
		});
		const result = await node.execute.call(context);

		expect(result).toEqual([[{ json: { value: 1 }, pairedItem: [{ item: 0 }] }]]);
		expect(mockRequest.query).toHaveBeenCalledWith('SELECT 1 AS value');
		expect(mockPool.close).toHaveBeenCalled();
	});

	test('correctly resolves expressions (does not remove $ characters)', async () => {
		const queryResult = { recordsets: [[{ value: 1 }]] };
		const mockRequest = { query: jest.fn().mockResolvedValue(queryResult) };
		const mockPool = mock<mssql.ConnectionPool>({
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn(),
			request: jest.fn().mockReturnValue(mockRequest),
		});

		mockedConnectionPool.mockReturnValue(mockPool);

		const node = new MicrosoftSql();
		const context = getMockedExecuteFunctions({
			getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'executeQuery';
				if (paramName === 'query') return "SELECT '{{ '$$$' }}'";
				return undefined;
			}),
		});
		context.evaluateExpression.mockReturnValue('$$$');

		await node.execute.call(context);

		expect(mockRequest.query).toHaveBeenCalledWith("SELECT '$$$'");
	});

	test('executes query with parameters supplied as comma-separated string', async () => {
		const queryResult = { recordsets: [[{ id: 5 }]] };
		const mockRequest = {
			query: jest.fn().mockResolvedValue(queryResult),
			input: jest.fn(),
		};
		const mockPool = mock<mssql.ConnectionPool>({
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn(),
			request: jest.fn().mockReturnValue(mockRequest),
		});

		mockedConnectionPool.mockReturnValue(mockPool);

		const node = new MicrosoftSql();
		const context = getMockedExecuteFunctions({
			getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'executeQuery';
				if (paramName === 'query') return 'SELECT * FROM users WHERE id = $1 AND active = $2';
				if (paramName === 'options.queryReplacement') return '5, true';
				return undefined;
			}),
		});
		const result = await node.execute.call(context);

		expect(mockRequest.query).toHaveBeenCalledWith(
			'SELECT * FROM users WHERE id = @p1 AND active = @p2',
		);
		expect(mockRequest.input).toHaveBeenCalledWith('p1', '5');
		expect(mockRequest.input).toHaveBeenCalledWith('p2', 'true');
		expect(result).toEqual([[{ json: { id: 5 }, pairedItem: [{ item: 0 }] }]]);
	});

	test('executes query with parameters supplied as an array', async () => {
		const queryResult = { recordsets: [[{ name: 'Alice' }]] };
		const mockRequest = {
			query: jest.fn().mockResolvedValue(queryResult),
			input: jest.fn(),
		};
		const mockPool = mock<mssql.ConnectionPool>({
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn(),
			request: jest.fn().mockReturnValue(mockRequest),
		});

		mockedConnectionPool.mockReturnValue(mockPool);

		const node = new MicrosoftSql();
		const context = getMockedExecuteFunctions({
			getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'executeQuery';
				if (paramName === 'query') return 'SELECT * FROM users WHERE name = $1';
				if (paramName === 'options.queryReplacement') return ['Alice'];
				return undefined;
			}),
		});
		await node.execute.call(context);

		expect(mockRequest.query).toHaveBeenCalledWith('SELECT * FROM users WHERE name = @p1');
		expect(mockRequest.input).toHaveBeenCalledWith('p1', 'Alice');
	});

	test('passes error to continueOnFail when query parameters value is invalid type', async () => {
		const mockRequest = {
			query: jest.fn(),
			input: jest.fn(),
		};
		const mockPool = mock<mssql.ConnectionPool>({
			connect: jest.fn().mockResolvedValue(undefined),
			close: jest.fn(),
			request: jest.fn().mockReturnValue(mockRequest),
		});

		mockedConnectionPool.mockReturnValue(mockPool);

		const node = new MicrosoftSql();
		const context = getMockedExecuteFunctions({
			getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'executeQuery';
				if (paramName === 'query') return 'SELECT * FROM users WHERE id = $1';
				if (paramName === 'options.queryReplacement') return 123; // number is not string or array
				return undefined;
			}),
		});
		const result = await node.execute.call(context);

		expect(mockRequest.query).not.toHaveBeenCalled();
		expect(result).toEqual([
			[
				{
					json: {
						error:
							'Query Parameters must be a string of comma-separated values or an array of values',
					},
					pairedItem: [{ item: 0 }],
				},
			],
		]);
	});
});
