import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
	type WorkflowTestData,
} from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { Snowflake } from '../Snowflake.node';
import { setupSnowflakeMocks, snowflakeCredentials } from './snowflake-test-utils';

const { mockExecute, mockConnect, mockDestroy } = setupSnowflakeMocks();

const queryError = new Error('SQL compilation error: Object THIS does not exist');

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
		mockExecute.mockImplementation(({ sqlText, complete }) =>
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
		mockExecute.mockImplementation(({ sqlText, complete }) =>
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

	it('marks every input item when one insert statement fails', async () => {
		mockExecute.mockImplementation(({ sqlText, complete }) =>
			sqlText.startsWith('ALTER SESSION')
				? complete(null, undefined, [])
				: complete(queryError, undefined, undefined),
		);

		const executeFns = mockExecuteFunctions([
			{ json: { id: 1, name: 'first' } },
			{ json: { id: 2, name: 'second' } },
		]);
		executeFns.continueOnFail.mockReturnValue(true);
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return 'credentials';
			if (name === 'operation') return 'insert';
			if (name === 'table') return 'users';
			if (name === 'columns') return 'id,name';
			return fallback;
		});

		const result = await new Snowflake().execute.call(executeFns);

		expect(result).toEqual([
			[
				{ json: { error: queryError.message }, pairedItem: { item: 0 } },
				{ json: { error: queryError.message }, pairedItem: { item: 1 } },
			],
		]);
		expect(mockExecute).toHaveBeenCalledTimes(2);
		expect(mockDestroy).toHaveBeenCalled();
	});

	it('throws when one insert statement fails and the node must stop', async () => {
		mockExecute.mockImplementation(({ sqlText, complete }) =>
			sqlText.startsWith('ALTER SESSION')
				? complete(null, undefined, [])
				: complete(queryError, undefined, undefined),
		);

		const executeFns = mockExecuteFunctions([{ json: { id: 1, name: 'first' } }]);
		executeFns.continueOnFail.mockReturnValue(false);
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return 'credentials';
			if (name === 'operation') return 'insert';
			if (name === 'table') return 'users';
			if (name === 'columns') return 'id,name';
			return fallback;
		});

		await expect(new Snowflake().execute.call(executeFns)).rejects.toThrow(queryError.message);
		expect(mockDestroy).toHaveBeenCalled();
	});

	it('keeps the rows that were updated and marks only the row that failed', async () => {
		let updateStatements = 0;
		mockExecute.mockImplementation(({ sqlText, complete }) => {
			if (sqlText.startsWith('ALTER SESSION')) return complete(null, undefined, []);
			updateStatements += 1;
			return updateStatements === 1
				? complete(null, undefined, [])
				: complete(queryError, undefined, undefined);
		});

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

	it('stops after a failed update when the node must stop', async () => {
		mockExecute.mockImplementation(({ sqlText, complete }) =>
			sqlText.startsWith('ALTER SESSION')
				? complete(null, undefined, [])
				: complete(queryError, undefined, undefined),
		);

		const executeFns = mockExecuteFunctions([{ json: { id: 1, name: 'first' } }]);
		executeFns.continueOnFail.mockReturnValue(false);
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return 'credentials';
			if (name === 'operation') return 'update';
			if (name === 'table') return 'users';
			if (name === 'updateKey') return 'id';
			if (name === 'columns') return 'name';
			return fallback;
		});

		await expect(new Snowflake().execute.call(executeFns)).rejects.toThrow(queryError.message);
		expect(mockDestroy).toHaveBeenCalled();
	});
});

describe('Snowflake, on error "Continue" before any statement runs', () => {
	const setupError = new Error('Incorrect username or password was specified.');
	const twoItems = () => [{ json: { id: 1 } }, { json: { id: 2 } }];
	const errorItems = (message: string) => [
		{ json: { error: message }, pairedItem: { item: 0 } },
		{ json: { error: message }, pairedItem: { item: 1 } },
	];

	function queryParameters(
		executeFns: ReturnType<typeof mockExecuteFunctions>,
		auth = 'credentials',
	) {
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return auth;
			if (name === 'operation') return 'executeQuery';
			if (name === 'query') return 'SELECT 1';
			return fallback;
		});
	}

	it('returns an error item for each input item when the connection fails', async () => {
		mockConnect.mockImplementation((callback) => callback(setupError));

		const executeFns = mockExecuteFunctions(twoItems());
		executeFns.continueOnFail.mockReturnValue(true);
		queryParameters(executeFns);

		const result = await new Snowflake().execute.call(executeFns);

		expect(result).toEqual([errorItems(setupError.message)]);
		expect(mockExecute).not.toHaveBeenCalled();
		expect(mockDestroy).not.toHaveBeenCalled();
	});

	it('throws when the connection fails and the node must stop', async () => {
		mockConnect.mockImplementation((callback) => callback(setupError));

		const executeFns = mockExecuteFunctions(twoItems());
		executeFns.continueOnFail.mockReturnValue(false);
		queryParameters(executeFns);

		await expect(new Snowflake().execute.call(executeFns)).rejects.toThrow(setupError.message);
	});

	it('returns an error item for each input item when the OAuth2 token is missing', async () => {
		const executeFns = mockExecuteFunctions(twoItems());
		executeFns.continueOnFail.mockReturnValue(true);
		executeFns.getCredentials.mockResolvedValue({ account: 'test-account', oauthTokenData: {} });
		queryParameters(executeFns, 'oAuth2');

		const result = await new Snowflake().execute.call(executeFns);

		expect(result).toEqual([
			errorItems(
				'OAuth2 access token is missing. Please reconnect your Snowflake OAuth2 credential.',
			),
		]);
		expect(mockConnect).not.toHaveBeenCalled();
	});

	it('returns an error item for each input item when the session setup fails', async () => {
		mockExecute.mockImplementation(({ sqlText, complete }) =>
			sqlText.startsWith('ALTER SESSION')
				? complete(setupError, undefined, undefined)
				: complete(null, undefined, []),
		);

		const executeFns = mockExecuteFunctions(twoItems());
		executeFns.continueOnFail.mockReturnValue(true);
		queryParameters(executeFns);

		const result = await new Snowflake().execute.call(executeFns);

		expect(result).toEqual([errorItems(setupError.message)]);
		expect(mockExecute).toHaveBeenCalledTimes(1);
		expect(mockDestroy).toHaveBeenCalled();
	});

	it('throws and closes the connection when the session setup fails and the node must stop', async () => {
		mockExecute.mockImplementation(({ complete }) => complete(setupError, undefined, undefined));

		const executeFns = mockExecuteFunctions(twoItems());
		executeFns.continueOnFail.mockReturnValue(false);
		queryParameters(executeFns);

		await expect(new Snowflake().execute.call(executeFns)).rejects.toThrow(setupError.message);
		expect(mockDestroy).toHaveBeenCalled();
	});

	it('returns an error item for each input item when an insert parameter fails', async () => {
		const executeFns = mockExecuteFunctions(twoItems());
		executeFns.continueOnFail.mockReturnValue(true);
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return 'credentials';
			if (name === 'operation') return 'insert';
			if (name === 'table') throw setupError;
			return fallback;
		});

		const result = await new Snowflake().execute.call(executeFns);

		expect(result).toEqual([errorItems(setupError.message)]);
	});

	it('returns an error item for each input item when an update parameter fails', async () => {
		const executeFns = mockExecuteFunctions(twoItems());
		executeFns.continueOnFail.mockReturnValue(true);
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return 'credentials';
			if (name === 'operation') return 'update';
			if (name === 'updateKey') throw setupError;
			return fallback;
		});

		const result = await new Snowflake().execute.call(executeFns);

		expect(result).toEqual([errorItems(setupError.message)]);
		// Only the ALTER SESSION statement runs.
		expect(mockExecute).toHaveBeenCalledTimes(1);
	});
});

describe('Snowflake, closing the connection fails', () => {
	const closeError = new Error('Connection already terminated.');

	function setup(continueOnFail: boolean) {
		mockDestroy.mockImplementation((callback) => callback(closeError));
		mockExecute.mockImplementation(({ complete }) => complete(null, undefined, [{ ID: 1 }]));

		const executeFns = mockExecuteFunctions([{ json: {} }]);
		executeFns.continueOnFail.mockReturnValue(continueOnFail);
		executeFns.getNodeParameter.mockImplementation((name, _itemIndex, fallback) => {
			if (name === 'authentication') return 'credentials';
			if (name === 'operation') return 'executeQuery';
			if (name === 'query') return 'SELECT 1';
			return fallback;
		});
		return executeFns;
	}

	it('keeps the output when the node continues on fail', async () => {
		const result = await new Snowflake().execute.call(setup(true));

		expect(result).toEqual([[{ json: { ID: 1 }, pairedItem: { item: 0 } }]]);
	});

	it('throws when the node must stop', async () => {
		await expect(new Snowflake().execute.call(setup(false))).rejects.toThrow(closeError.message);
	});
});

describe('Snowflake workflow error outputs', () => {
	beforeEach(() => {
		mockExecute.mockImplementation(({ sqlText, complete }) =>
			sqlText.startsWith('ALTER SESSION')
				? complete(null, undefined, [])
				: complete(queryError, undefined, undefined),
		);
	});

	function workflowData(
		onError: 'continueErrorOutput' | 'continueRegularOutput',
	): WorkflowTestData['input']['workflowData'] {
		const resultConnection = { node: 'Result', type: NodeConnectionTypes.Main, index: 0 };

		return {
			nodes: [
				{
					parameters: {},
					id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
					name: 'When clicking "Execute Workflow"',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [460, 460],
				},
				{
					parameters: { operation: 'executeQuery', query: 'SELECT * FROM THIS WILL ERROR' },
					id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
					name: 'Snowflake',
					type: 'n8n-nodes-base.snowflake',
					typeVersion: 1,
					position: [680, 460],
					onError,
					credentials: { snowflake: { id: '1', name: 'Snowflake account' } },
				},
				{
					parameters: {},
					id: 'e5f6a7b8-c9d0-1234-efab-567890123456',
					name: 'Result',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [900, 460],
				},
			],
			connections: {
				'When clicking "Execute Workflow"': {
					main: [[{ node: 'Snowflake', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				Snowflake: {
					main: onError === 'continueErrorOutput' ? [[], [resultConnection]] : [[resultConnection]],
				},
			},
		};
	}

	const harness = new NodeTestHarness();
	for (const onError of ['continueErrorOutput', 'continueRegularOutput'] as const) {
		harness.setupTest(
			{
				description: `routes the failed query with ${onError}`,
				input: { workflowData: workflowData(onError) },
				output: { nodeData: { Result: [[{ json: { error: queryError.message } }]] } },
			},
			{
				credentials: { snowflake: snowflakeCredentials },
				customAssertions() {
					expect(mockDestroy).toHaveBeenCalled();
				},
			},
		);
	}
});
