import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import type {
	PgpDatabase,
	PostgresNodeOptions,
	QueriesRunner,
	QueryValues,
	QueryWithValues,
} from '../../helpers/interfaces';
import {
	addReturning,
	checkItemAgainstSchema,
	getTableSchema,
	prepareItem,
	replaceEmptyStringsByNulls,
	configureTableSchemaUpdater,
	convertArraysToPostgresFormat,
} from '../../helpers/utils';
import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties names exactly match the table column names',
			},
			{
				name: 'Map Each Column Manually',
				value: 'defineBelow',
				description: 'Set the value for each destination column manually',
			},
		],
		default: 'autoMapInputData',
		description:
			'Whether to map node input properties and the table data automatically or manually',
		displayOptions: {
			show: {
				'@version': [2, 2.1],
			},
		},
	},
	{
		displayName: `
		In this mode, make sure incoming data fields are named the same as the columns in your table. If needed, use an 'Edit Fields' node before this node to change the field names.
		`,
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				dataMode: ['autoMapInputData'],
				'@version': [2, 2.1],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Unique Column',
		name: 'columnToMatchOn',
		type: 'options',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'The column to compare when finding the rows to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/" target="_blank">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: ['schema.value', 'table.value'],
		},
		default: '',
		hint: "Used to find the correct row(s) to update. Doesn't get changed. Has to be unique.",
		displayOptions: {
			show: {
				'@version': [2, 2.1],
			},
		},
	},
	{
		displayName: 'Value of Unique Column',
		name: 'valueToMatchOn',
		type: 'string',
		default: '',
		description:
			'Rows with a value in the specified "Column to Match On" that corresponds to the value in this field will be updated. New rows will be created for non-matching items.',
		displayOptions: {
			show: {
				dataMode: ['defineBelow'],
				'@version': [2, 2.1],
			},
		},
	},
	{
		displayName: 'Values to Send',
		name: 'valuesToSend',
		placeholder: 'Add Value',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Value',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				dataMode: ['defineBelow'],
				'@version': [2, 2.1],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Column',
						name: 'column',
						type: 'options',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/" target="_blank">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getColumnsWithoutColumnToMatchOn',
							loadOptionsDependsOn: ['schema.value', 'table.value'],
						},
						default: [],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'resourceMapper',
		noDataExpression: true,
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['table.value', 'operation'],
			resourceMapper: {
				resourceMapperMethod: 'getMappingColumns',
				mode: 'upsert',
				fieldWords: {
					singular: 'column',
					plural: 'columns',
				},
				addAllFields: true,
				multiKeyMatch: true,
			},
		},
		displayOptions: {
			show: {
				'@version': [{ _cnd: { gte: 2.2 } }],
			},
		},
	},
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['upsert'],
	},
	hide: {
		table: [''],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: PostgresNodeOptions,
	db: PgpDatabase,
): Promise<INodeExecutionData[]> {
	items = replaceEmptyStringsByNulls(items, nodeOptions.replaceEmptyStrings as boolean);
	const nodeVersion = nodeOptions.nodeVersion as number;

	let schema = this.getNodeParameter('schema', 0, undefined, {
		extractValue: true,
	}) as string;

	let table = this.getNodeParameter('table', 0, undefined, {
		extractValue: true,
	}) as string;

	const updateTableSchema = configureTableSchemaUpdater(schema, table);

	let tableSchema = await getTableSchema(db, schema, table);

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		schema = this.getNodeParameter('schema', i, undefined, {
			extractValue: true,
		}) as string;

		table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		const columnsToMatchOn: string[] =
			nodeVersion < 2.2
				? [this.getNodeParameter('columnToMatchOn', i) as string]
				: (this.getNodeParameter('columns.matchingColumns', i) as string[]);

		const dataMode =
			nodeVersion < 2.2
				? (this.getNodeParameter('dataMode', i) as string)
				: (this.getNodeParameter('columns.mappingMode', i) as string);

		let item: IDataObject = {};

		if (dataMode === 'autoMapInputData') {
			item = items[i].json;
		}

		if (dataMode === 'defineBelow') {
			const valuesToSend =
				nodeVersion < 2.2
					? ((this.getNodeParameter('valuesToSend', i, []) as IDataObject).values as IDataObject[])
					: ((this.getNodeParameter('columns.values', i, []) as IDataObject)
							.values as IDataObject[]);

			if (nodeVersion < 2.2) {
				item = prepareItem(valuesToSend);
				item[columnsToMatchOn[0]] = this.getNodeParameter('valueToMatchOn', i) as string;
			} else {
				item = this.getNodeParameter('columns.value', i) as IDataObject;
			}
		}

		if (!item[columnsToMatchOn[0]]) {
			throw new NodeOperationError(
				this.getNode(),
				"Column to match on not found in input item. Add a column to match on or set the 'Data Mode' to 'Define Below' to define the value to match on.",
			);
		}

		if (item[columnsToMatchOn[0]] && Object.keys(item).length === 1) {
			throw new NodeOperationError(
				this.getNode(),
				"Add values to update or insert to the input item or set the 'Data Mode' to 'Define Below' to define the values to insert or update.",
			);
		}

		tableSchema = await updateTableSchema(db, tableSchema, schema, table);

		if (nodeVersion >= 2.4) {
			convertArraysToPostgresFormat(item, tableSchema, this.getNode(), i);
		}

		item = checkItemAgainstSchema(this.getNode(), item, tableSchema, i);

		let values: QueryValues = [schema, table];

		let valuesLength = values.length + 1;
		const conflictColumns: string[] = [];
		columnsToMatchOn.forEach((column) => {
			conflictColumns.push(`$${valuesLength}:name`);
			valuesLength = valuesLength + 1;
			values.push(column);
		});
		const onConflict = ` ON CONFLICT (${conflictColumns.join(',')})`;

		const insertQuery = `INSERT INTO $1:name.$2:name($${valuesLength}:name) VALUES($${valuesLength}:csv)${onConflict}`;
		valuesLength = valuesLength + 1;
		values.push(item);

		const updateColumns = Object.keys(item).filter((column) => !columnsToMatchOn.includes(column));
		const updates: string[] = [];

		for (const column of updateColumns) {
			updates.push(`$${valuesLength}:name = $${valuesLength + 1}`);
			valuesLength = valuesLength + 2;
			values.push(column, item[column] as string);
		}

		const updateQuery =
			updates?.length > 0 ? ` DO UPDATE  SET ${updates.join(', ')}` : ' DO NOTHING ';
		let query = `${insertQuery}${updateQuery}`;

		const outputColumns = this.getNodeParameter('options.outputColumns', i, ['*']) as string[];

		[query, values] = addReturning(query, outputColumns, values);

		queries.push({ query, values });
	}

	return await runQueries(queries, items, nodeOptions);
}
