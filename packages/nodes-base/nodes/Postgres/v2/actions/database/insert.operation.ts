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

import { optionsCollection, outpurSelector, schemaRLC, tableRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	schemaRLC,
	tableRLC,
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Map Each Column Below',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
			{
				name: 'Select Properties From Input',
				value: 'selectProperties',
				description:
					'Select properties from input, properties should match destination column names',
			},
		],
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Properties',
		name: 'inputProperties',
		type: 'string',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
		placeholder: 'id:int,name:text,description',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Comma-separated list of the properties which should used as columns for the new rows. You can use type casting with colons (:) like id:int.',
		displayOptions: {
			show: {
				dataMode: ['selectProperties'],
			},
		},
	},
	...outpurSelector,
	optionsCollection,
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
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];

	const schema = this.getNodeParameter('schema', 0, undefined, {
		extractValue: true,
	}) as string;

	const table = this.getNodeParameter('table', 0, undefined, {
		extractValue: true,
	}) as string;

	const inputProperties = this.getNodeParameter('inputProperties', 0) as string;

	// const dataMode = this.getNodeParameter('dataMode', 0) as string;

	// if (dataMode === 'selectProperties') {
	// 	inputProperties = this.getNodeParameter('inputProperties', 0) as string;
	// }

	//---------------------------------------------------------------------
	const guardedColumns: { [key: string]: string } = {};

	const columns = inputProperties
		.split(',')
		.map((column) => column.trim().split(':'))
		.map(([name, cast], i) => {
			guardedColumns[`column${i}`] = name;
			return { name, cast, prop: `column${i}` };
		});

	const columnNames = columns.map((column) => column.name);

	const cs = new pgp.helpers.ColumnSet(columns, { table: { table, schema } });

	const options = this.getNodeParameter('options', 0);
	const mode = (options.mode as QueryMode) || 'multiple';

	const output = this.getNodeParameter('output', 0) as string;

	let outputColumns = '*';
	if (output === 'columns') {
		outputColumns = (this.getNodeParameter('returnColumns', 0, []) as string[]).join(', ');
	}

	const returning = generateReturning(pgp, outputColumns);

	if (mode === 'multiple') {
		try {
			const query =
				pgp.helpers.insert(getItemsCopy(items, columnNames, guardedColumns), cs) + returning;
			const queryResult = await db.any(query);
			returnData = queryResult
				.map((result, i) => {
					return this.helpers.constructExecutionMetaData(wrapData(result as IDataObject[]), {
						itemData: { item: i },
					});
				})
				.flat();
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
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
				try {
					const insertResult = await t.one(pgp.helpers.insert(itemCopy, cs) + returning);
					result.push(
						...this.helpers.constructExecutionMetaData(wrapData(insertResult as IDataObject[]), {
							itemData: { item: i },
						}),
					);
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
			for (let i = 0; i < items.length; i++) {
				const itemCopy = getItemCopy(items[i], columnNames, guardedColumns);
				try {
					const insertResult = await t.oneOrNone(pgp.helpers.insert(itemCopy, cs) + returning);
					if (insertResult !== null) {
						const executionData = this.helpers.constructExecutionMetaData(
							wrapData(insertResult as IDataObject[]),
							{
								itemData: { item: i },
							},
						);
						result.push(...executionData);
					}
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
