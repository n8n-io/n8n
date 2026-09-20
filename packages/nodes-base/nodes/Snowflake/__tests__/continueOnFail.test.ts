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

const { mockExecute, mockDestroy } = setupSnowflakeMocks();

const queryError = new Error('SQL compilation error: Object THIS does not exist');

type CompleteCallback = (error: Error | null, stmt: undefined, rows: unknown[] | undefined) => void;

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

	it('marks every input item when one insert statement fails', async () => {
		mockExecute.mockImplementation(
			({ sqlText, complete }: { sqlText: string; complete: CompleteCallback }) =>
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
		mockExecute.mockImplementation(
			({ sqlText, complete }: { sqlText: string; complete: CompleteCallback }) =>
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

	it('stops after a failed update when the node must stop', async () => {
		mockExecute.mockImplementation(
			({ sqlText, complete }: { sqlText: string; complete: CompleteCallback }) =>
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

describe('Snowflake workflow error outputs', () => {
	beforeEach(() => {
		mockExecute.mockImplementation(
			({ sqlText, complete }: { sqlText: string; complete: CompleteCallback }) =>
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
