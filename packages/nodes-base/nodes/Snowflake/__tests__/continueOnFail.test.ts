import type { IDataObject, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import snowflake from 'snowflake-sdk';
import { mock, mockDeep } from 'vitest-mock-extended';

import { Snowflake } from '../Snowflake.node';

const mockExecute = vi.fn();
const mockConnect = vi.fn();
const mockDestroy = vi.fn();
const mockConnection = { connect: mockConnect, execute: mockExecute, destroy: mockDestroy };

const snowflakeCredentials = {
	authentication: 'password',
	account: 'test-account',
	database: 'TEST_DB',
	schema: 'PUBLIC',
	warehouse: 'WH',
	role: 'SYSADMIN',
	clientSessionKeepAlive: false,
	username: 'user',
	password: 'pass',
};

const queryError = new Error('SQL compilation error: Object THIS does not exist');

type CompleteCallback = (error: Error | null, stmt: undefined, rows: unknown[] | undefined) => void;

beforeEach(() => {
	vi.spyOn(snowflake, 'configure').mockImplementation(() => ({}) as never);
	vi.spyOn(snowflake, 'createConnection').mockReturnValue(mockConnection as never);
	mockConnect.mockImplementation((callback: (err: null) => void) => callback(null));
	mockDestroy.mockImplementation((callback: (err: null) => void) => callback(null));
});

afterEach(() => vi.clearAllMocks());

/** An IExecuteFunctions whose data helpers behave like the real ones. */
function mockExecuteFunctions(items: INodeExecutionData[]) {
	const executeFns = mockDeep<IExecuteFunctions>();

	executeFns.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
	executeFns.getInputData.mockReturnValue(items);
	executeFns.getCredentials.mockResolvedValue(snowflakeCredentials);
	executeFns.helpers.copyInputItems.mockImplementation((inputItems, columns) =>
		inputItems.map((item) =>
			Object.fromEntries(columns.map((column) => [column, item.json[column]])),
		),
	);
	executeFns.helpers.returnJsonArray.mockImplementation((data) =>
		(Array.isArray(data) ? data : [data]).map((json) => ({ json: json as IDataObject })),
	);
	executeFns.helpers.constructExecutionMetaData.mockImplementation((data, { itemData }) =>
		data.map((entry) => ({ ...entry, pairedItem: itemData })),
	);

	return executeFns;
}

describe('Snowflake, on error "Continue"', () => {
	it('sends a failed query on as an error item instead of stopping the workflow', async () => {
		mockExecute.mockImplementation(
			({ sqlText, complete }: { sqlText: string } & { complete: CompleteCallback }) =>
				sqlText.startsWith('ALTER SESSION')
					? complete(null, undefined, [])
					: complete(queryError, undefined, undefined),
		);

		const executeFns = mockExecuteFunctions([{ json: {} }]);
		executeFns.continueOnFail.mockReturnValue(true);
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return 'credentials';
			if (name === 'operation') return 'executeQuery';
			if (name === 'query') return 'SELECT * FROM THIS WILL ERROR';
			return fallback;
		});

		const result = await new Snowflake().execute.call(executeFns);

		expect(result).toEqual([[{ json: { error: queryError.message }, pairedItem: { item: 0 } }]]);
		expect(mockDestroy).toHaveBeenCalled();
	});

	it('still throws when the node does not continue on fail', async () => {
		mockExecute.mockImplementation(
			({ sqlText, complete }: { sqlText: string } & { complete: CompleteCallback }) =>
				sqlText.startsWith('ALTER SESSION')
					? complete(null, undefined, [])
					: complete(queryError, undefined, undefined),
		);

		const executeFns = mockExecuteFunctions([{ json: {} }]);
		executeFns.continueOnFail.mockReturnValue(false);
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return 'credentials';
			if (name === 'operation') return 'executeQuery';
			if (name === 'query') return 'SELECT * FROM THIS WILL ERROR';
			return fallback;
		});

		await expect(new Snowflake().execute.call(executeFns)).rejects.toThrow(queryError.message);
	});

	it('keeps the rows that were updated and marks only the row that failed', async () => {
		let updateStatements = 0;
		mockExecute.mockImplementation(
			({ sqlText, complete }: { sqlText: string } & { complete: CompleteCallback }) => {
				if (sqlText.startsWith('ALTER SESSION')) return complete(null, undefined, []);
				updateStatements += 1;
				return updateStatements === 1
					? complete(null, undefined, [])
					: complete(queryError, undefined, undefined);
			},
		);

		const executeFns = mockExecuteFunctions([
			{ json: { id: 1, name: 'first' } },
			{ json: { id: 2, name: 'second' } },
		]);
		executeFns.continueOnFail.mockReturnValue(true);
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return 'credentials';
			if (name === 'operation') return 'update';
			if (name === 'table') return 'users';
			if (name === 'updateKey') return 'id';
			if (name === 'columns') return 'name';
			return fallback;
		});

		const result = await new Snowflake().execute.call(executeFns);

		expect(result).toEqual([
			[
				{ json: { id: 1, name: 'first' }, pairedItem: { item: 0 } },
				{ json: { error: queryError.message }, pairedItem: { item: 1 } },
			],
		]);
	});
});
