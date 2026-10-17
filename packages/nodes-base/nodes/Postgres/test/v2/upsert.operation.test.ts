import get from 'lodash/get';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { execute } from '../../v2/actions/database/upsert.operation';
import type {
	ColumnInfo,
	PgpDatabase,
	PostgresNodeOptions,
	QueriesRunner,
} from '../../v2/helpers/interfaces';

describe('Postgres upsert match-column values', () => {
	const node = mock<INode>({
		id: 'postgres',
		name: 'Postgres',
		type: 'n8n-nodes-base.postgres',
		typeVersion: 2.6,
		parameters: {},
	});
	const nodeParameters: IDataObject = {
		schema: { value: 'public' },
		table: { value: 'records' },
		columns: {
			mappingMode: 'autoMapInputData',
			matchingColumns: ['external_id'],
		},
	};
	let context: ReturnType<typeof mock<IExecuteFunctions>>;
	let db: ReturnType<typeof mock<PgpDatabase>>;
	let runQueries: ReturnType<typeof vi.fn<QueriesRunner>>;

	beforeEach(() => {
		context = mock<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.continueOnFail.mockReturnValue(false);
		context.getNodeParameter.mockImplementation((name, _index, fallbackValue, options) => {
			const parameter = options?.extractValue ? `${name}.value` : name;
			return get(nodeParameters, parameter, fallbackValue);
		});
		db = mock<PgpDatabase>();
		runQueries = vi.fn<QueriesRunner>().mockResolvedValue([]);
	});

	// NODE-5497: A present match column must reach the query runner even when its value is falsy.
	it.each([
		{ label: 'null', value: null, dataType: 'text', replaceEmptyStrings: false, expected: null },
		{ label: 'zero', value: 0, dataType: 'integer', replaceEmptyStrings: false, expected: 0 },
		{
			label: 'false',
			value: false,
			dataType: 'boolean',
			replaceEmptyStrings: false,
			expected: false,
		},
		{
			label: 'empty string',
			value: '',
			dataType: 'text',
			replaceEmptyStrings: false,
			expected: '',
		},
		{
			label: 'empty string converted to null',
			value: '',
			dataType: 'text',
			replaceEmptyStrings: true,
			expected: null,
		},
		{
			label: 'non-zero number',
			value: 1,
			dataType: 'integer',
			replaceEmptyStrings: false,
			expected: 1,
		},
	])(
		'should pass $label to the query runner',
		async ({ value, dataType, replaceEmptyStrings, expected }) => {
			const tableSchema: ColumnInfo[] = [
				{ column_name: 'external_id', data_type: dataType, is_nullable: 'YES' },
				{ column_name: 'name', data_type: 'text', is_nullable: 'NO' },
			];
			db.any.mockResolvedValue(tableSchema);
			const nodeOptions: PostgresNodeOptions = { nodeVersion: 2.6, replaceEmptyStrings };
			const items = [{ json: { external_id: value, name: 'record' } }];

			await expect(execute.call(context, runQueries, items, nodeOptions, db)).resolves.toEqual([]);

			expect(runQueries).toHaveBeenCalledExactlyOnceWith(
				[
					{
						query:
							'INSERT INTO $1:name.$2:name($4:name) VALUES($4:csv) ON CONFLICT ($3:name) DO UPDATE  SET $5:name = $6 RETURNING *',
						values: [
							'public',
							'records',
							'external_id',
							{ external_id: expected, name: 'record' },
							'name',
							'record',
						],
					},
				],
				nodeOptions,
			);
		},
	);

	it('should reject an absent match column before running queries', async () => {
		db.any.mockResolvedValue([
			{ column_name: 'external_id', data_type: 'text', is_nullable: 'YES' },
			{ column_name: 'name', data_type: 'text', is_nullable: 'NO' },
		]);

		await expect(
			execute.call(context, runQueries, [{ json: { name: 'record' } }], { nodeVersion: 2.6 }, db),
		).rejects.toThrow('Column to match on not found in input item');
		expect(runQueries).not.toHaveBeenCalled();
	});
});
