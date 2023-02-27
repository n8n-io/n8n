import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import type { PgpClient, PgpDatabase, QueryMode } from '../../helpers/interfaces';

import {
	generateReturning,
	getItemCopy,
	getItemsCopy,
	parsePostgresError,
	prepareErrorItem,
	wrapData,
} from '../../helpers/utils';

import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Schema',
		name: 'schema',
		type: 'string',
		default: 'public',
		description: 'Name of the schema the table belongs to',
	},
	{
		displayName: 'Table',
		name: 'table',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the table in which to update data in',
	},
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		default: 'id',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Comma-separated list of the properties which decides which rows in the database should be updated. Normally that would be "id".',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		default: '',
		placeholder: 'name:text,description',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Comma-separated list of the properties which should used as columns for rows to update. You can use type casting with colons (:) like id:int.',
	},
	{
		displayName: 'Return Fields',
		name: 'returnFields',
		type: 'string',
		requiresDataPath: 'multiple',
		default: '*',
		description: 'Comma-separated list of the fields that the operation will return',
	},
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	pgp: PgpClient,
	db: PgpDatabase,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const table = this.getNodeParameter('table', 0) as string;
	const schema = this.getNodeParameter('schema', 0) as string;
	const updateKey = this.getNodeParameter('updateKey', 0) as string;
	const columnString = this.getNodeParameter('columns', 0) as string;
	const guardedColumns: { [key: string]: string } = {};

	const columns: Array<{ name: string; cast: string; prop: string }> = columnString
		.split(',')
		.map((column) => column.trim().split(':'))
		.map(([name, cast], i) => {
			guardedColumns[`column${i}`] = name;
			return { name, cast, prop: `column${i}` };
		});

	const updateKeys = updateKey.split(',').map((key, i) => {
		const [name, cast] = key.trim().split(':');
		const targetCol = columns.find((column) => column.name === name);
		const updateColumn = { name, cast, prop: targetCol ? targetCol.prop : `updateColumn${i}` };
		if (!targetCol) {
			guardedColumns[updateColumn.prop] = name;
			columns.unshift(updateColumn);
		} else if (!targetCol.cast) {
			targetCol.cast = updateColumn.cast || targetCol.cast;
		}
		return updateColumn;
	});

	const options = this.getNodeParameter('options', 0);
	const mode = (options.mode as QueryMode) || 'multiple';

	const cs = new pgp.helpers.ColumnSet(columns, { table: { table, schema } });

	// Prepare the data to update and copy it to be returned
	const columnNames = columns.map((column) => column.name);
	const updateItems = getItemsCopy(items, columnNames, guardedColumns);

	const returning = generateReturning(pgp, this.getNodeParameter('returnFields', 0) as string);

	let returnData: IDataObject[] = [];
	if (mode === 'multiple') {
		try {
			const query =
				(pgp.helpers.update(updateItems, cs) as string) +
				' WHERE ' +
				updateKeys
					.map((entry) => {
						const key = pgp.as.name(entry.name);
						return 'v.' + key + ' = t.' + key;
					})
					.join(' AND ') +
				returning;
			const updateResult = await db.any(query);
			returnData = updateResult;
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

	const where =
		' WHERE ' +
		// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
		updateKeys.map((entry) => pgp.as.name(entry.name) + ' = ${' + entry.prop + '}').join(' AND ');

	if (mode === 'transaction') {
		returnData = await db.tx(async (t) => {
			const result: IDataObject[] = [];
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
				try {
					const transactionResult = await t.any(
						(pgp.helpers.update(itemCopy, cs) as string) +
							pgp.as.format(where, itemCopy) +
							returning,
					);
					const executionData = this.helpers.constructExecutionMetaData(
						wrapData(transactionResult),
						{ itemData: { item: i } },
					);
					result.push(...executionData);
				} catch (err) {
					const error = parsePostgresError.call(this, err);
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
			const result: IDataObject[] = [];
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
				try {
					const independentResult = await t.any(
						(pgp.helpers.update(itemCopy, cs) as string) +
							pgp.as.format(where, itemCopy) +
							returning,
					);
					const executionData = this.helpers.constructExecutionMetaData(
						wrapData(independentResult),
						{ itemData: { item: i } },
					);
					result.push(...executionData);
				} catch (err) {
					const error = parsePostgresError.call(this, err);
					if (!this.continueOnFail()) throw error;
					result.push(prepareErrorItem(items, error, i));
				}
			}
			return result;
		});
	}

	return wrapData(returnData);
}
