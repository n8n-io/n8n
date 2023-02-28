import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import type {
	PgpClient,
	PgpDatabase,
	QueryMode,
	QueryWithValues,
	WhereClause,
} from '../../helpers/interfaces';
import { parsePostgresError, prepareErrorItem, addWhereClauses } from '../../helpers/utils';
import {
	optionsCollection,
	schemaRLC,
	tableRLC,
	whereFixedCollection,
} from '../common.descriptions';

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
				name: 'Delete',
				value: 'delete',
				description:
					"Delete rows that satisfy the 'Where' clause from the table. If the 'Where' clause is absent, the effect is to delete all rows in the table.",
			},
			{
				name: 'Drop',
				value: 'drop',
				description:
					"Drop command not only deletes the table's data but also deletes the table's structure permanently",
			},
		],
	},
	{
		displayName: 'Restart Sequences',
		name: 'restartSequences',
		type: 'boolean',
		default: false,
		description:
			'Whether to restart sequences owned by columns of the truncated table, default false',
		displayOptions: {
			show: {
				deleteCommand: ['truncate'],
			},
		},
	},
	{
		...whereFixedCollection,
		displayOptions: {
			show: {
				deleteCommand: ['delete'],
			},
		},
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

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const schema = this.getNodeParameter('schema', i, undefined, {
			extractValue: true,
		}) as string;

		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		const deleteCommand = this.getNodeParameter('deleteCommand', i) as string;

		let query = '';
		let values: string[] = [schema, table];

		if (deleteCommand === 'drop') {
			const cascade = options.cascade ? ' CASCADE' : '';
			query = `DROP TABLE IF EXISTS $1:name.$2:name${cascade}`;
		}

		if (deleteCommand === 'truncate') {
			const identity = this.getNodeParameter('restartSequences', i, false)
				? ' RESTART IDENTITY'
				: '';
			const cascade = options.cascade ? ' CASCADE' : '';
			query = `TRUNCATE TABLE $1:name.$2:name${identity}${cascade}`;
		}

		if (deleteCommand === 'delete') {
			const whereClauses =
				((this.getNodeParameter('where', i, []) as IDataObject).values as WhereClause[]) || [];

			[query, values] = addWhereClauses('DELETE FROM $1:name.$2:name', whereClauses, values);
		}

		if (query === '') {
			throw new NodeOperationError(
				this.getNode(),
				'Invalid delete command, only drop, delete and truncate are supported ',
				{ itemIndex: i },
			);
		}

		const queryWithValues = { query, values };

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
