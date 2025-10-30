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
			getNodeParameter: jest
				.fn()
				.mockReturnValueOnce('executeQuery')
				.mockReturnValueOnce('SELECT 1 AS value'),
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
			getNodeParameter: jest
				.fn()
				.mockReturnValueOnce('executeQuery')
				.mockReturnValueOnce("SELECT '{{ '$$$' }}'"),
		});
		context.evaluateExpression.mockReturnValue('$$$');

		await node.execute.call(context);

		expect(mockRequest.query).toHaveBeenCalledWith("SELECT '$$$'");
	});
});
