import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties, JsonObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import type { PgpClient, PgpDatabase } from '../../helpers/utils';
import { generateReturning, getItemCopy, getItemsCopy, wrapData } from '../../helpers/utils';

import { additionalFieldsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Schema',
		name: 'schema',
		type: 'string',
		default: 'public',
		required: true,
		description: 'Name of the schema the table belongs to',
	},
	{
		displayName: 'Table',
		name: 'table',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the table in which to insert data to',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
		placeholder: 'id:int,name:text,description',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Comma-separated list of the properties which should used as columns for the new rows. You can use type casting with colons (:) like id:int.',
	},
	{
		displayName: 'Return Fields',
		name: 'returnFields',
		type: 'string',
		requiresDataPath: 'multiple',
		default: '*',
		description: 'Comma-separated list of the fields that the operation will return',
	},
	additionalFieldsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['insert'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	pgp: PgpClient,
	db: PgpDatabase,
	items: INodeExecutionData[],
	overrideMode?: string,
): Promise<INodeExecutionData[]> {
	const table = this.getNodeParameter('table', 0) as string;
	const schema = this.getNodeParameter('schema', 0) as string;
	const columnString = this.getNodeParameter('columns', 0) as string;
	const guardedColumns: { [key: string]: string } = {};

	const columns = columnString
		.split(',')
		.map((column) => column.trim().split(':'))
		.map(([name, cast], i) => {
			guardedColumns[`column${i}`] = name;
			return { name, cast, prop: `column${i}` };
		});

	const columnNames = columns.map((column) => column.name);

	const cs = new pgp.helpers.ColumnSet(columns, { table: { table, schema } });

	const additionalFields = this.getNodeParameter('additionalFields', 0);
	const mode = overrideMode ? overrideMode : ((additionalFields.mode ?? 'multiple') as string);

	const returning = generateReturning(pgp, this.getNodeParameter('returnFields', 0) as string);
	if (mode === 'multiple') {
		const query =
			pgp.helpers.insert(getItemsCopy(items, columnNames, guardedColumns), cs) + returning;
		const queryResult = await db.any(query);
		return queryResult
			.map((result, i) => {
				return this.helpers.constructExecutionMetaData(wrapData(result), {
					itemData: { item: i },
				});
			})
			.flat();
	} else if (mode === 'transaction') {
		return db.tx(async (t) => {
			const result: INodeExecutionData[] = [];
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
				try {
					const insertResult = await t.one(pgp.helpers.insert(itemCopy, cs) + returning);
					result.push(
						...this.helpers.constructExecutionMetaData(wrapData(insertResult), {
							itemData: { item: i },
						}),
					);
				} catch (err) {
					if (!this.continueOnFail()) throw err;
					result.push({
						json: { ...itemCopy },
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
						pairedItem: { item: i },
					} as INodeExecutionData);
					return result;
				}
			}
			return result;
		});
	} else if (mode === 'independently') {
		return db.task(async (t) => {
			const result: INodeExecutionData[] = [];
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
				try {
					const insertResult = await t.oneOrNone(pgp.helpers.insert(itemCopy, cs) + returning);
					if (insertResult !== null) {
						const executionData = this.helpers.constructExecutionMetaData(wrapData(insertResult), {
							itemData: { item: i },
						});
						result.push(...executionData);
					}
				} catch (err) {
					if (!this.continueOnFail()) {
						throw err;
					}
					result.push({
						json: { ...itemCopy },
						code: (err as JsonObject).code,
						message: (err as JsonObject).message,
						pairedItem: { item: i },
					} as INodeExecutionData);
				}
			}
			return result;
		});
	}

	throw new Error('multiple, independently or transaction are valid options');
}
