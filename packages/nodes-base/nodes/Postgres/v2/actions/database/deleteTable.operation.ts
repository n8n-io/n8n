import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import type { PgpClient, PgpDatabase, QueryMode, QueryWithValues } from '../../helpers/interfaces';
import { parsePostgresError, prepareErrorItem } from '../../helpers/utils';
import { optionsCollection, schemaRLC, tableRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	schemaRLC,
	tableRLC,
	{
		displayName: 'Command',
		name: 'deleteCommand',
		type: 'options',
		default: 'truncate',
		options: [
			{
				name: 'Truncate',
				value: 'truncate',
				description:
					"Truncate command only removes the table's data and preserves the table's structure",
			},
			{
				name: 'Drop',
				value: 'drop',
				description:
					"Drop command not only deletes the table's data but also deletes the table's structure permanently",
			},
		],
	},
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['deleteTable'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	pgp: PgpClient,
	db: PgpDatabase,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];
	const options = this.getNodeParameter('options', 0);

	const schema = this.getNodeParameter('schema', 0, undefined, {
		extractValue: true,
	}) as string;

	const table = this.getNodeParameter('table', 0, undefined, {
		extractValue: true,
	}) as string;

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const deleteCommand = this.getNodeParameter('deleteCommand', i) as string;
		const cascade = options.cascade ? ' CASCADE' : '';
		const query =
			deleteCommand === 'truncate'
				? `TRUNCATE TABLE $1:name.$2:name${cascade}`
				: `DROP TABLE IF EXISTS $1:name.$2:name${cascade}`;
		const queryWithValues = {
			query,
			values: [schema, table],
		};
		queries.push(queryWithValues);
	}

	const mode = (options.mode as QueryMode) || 'multiple';

	if (mode === 'multiple') {
		try {
			await db.multi(pgp.helpers.concat(queries));

			returnData = [{ json: { success: true } }];
		} catch (err) {
			const error = parsePostgresError.call(this, err);
			if (!this.continueOnFail()) throw error;

			return [
				{
					json: {
						message: error.message,
						error: { ...error },
					},
				},
			];
		}
	}

	if (mode === 'transaction') {
		returnData = await db.tx(async (t) => {
			const result: INodeExecutionData[] = [];
			for (let i = 0; i < queries.length; i++) {
				try {
					await t.any(queries[i].query, queries[i].values);
					const executionData = this.helpers.constructExecutionMetaData(
						[{ json: { success: true } }],
						{ itemData: { item: i } },
					);
					result.push(...executionData);
				} catch (err) {
					const error = parsePostgresError.call(this, err, i);
					if (!this.continueOnFail()) throw error;
					result.push(prepareErrorItem(items, error, i));
					return result;
				}
			}
			return result;
		});
	}

	if (mode === 'independently') {
		returnData = await db.task(async (t) => {
			const result: INodeExecutionData[] = [];
			for (let i = 0; i < queries.length; i++) {
				try {
					await t.any(queries[i].query, queries[i].values);
					const executionData = this.helpers.constructExecutionMetaData(
						[{ json: { success: true } }],
						{ itemData: { item: i } },
					);
					result.push(...executionData);
				} catch (err) {
					const error = parsePostgresError.call(this, err, i);
					if (!this.continueOnFail()) throw error;
					result.push(prepareErrorItem(items, error, i));
				}
			}
			return result;
		});
	}

	return returnData;
}
