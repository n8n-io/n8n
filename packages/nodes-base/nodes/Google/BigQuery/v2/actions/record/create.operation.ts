import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import type { TableSchema } from '../../helpers/BigQuery.types';
import { checkSchema } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data',
				value: 'autoMap',
				description: 'Use when node input properties match destination field names',
			},
			{
				name: 'Map Each Field Below',
				value: 'define',
				description: 'Set the value for each destination field',
			},
			{
				name: 'Specify as List',
				value: 'list',
				description: 'Set list of the item properties to use as fields',
			},
		],
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['create'],
			},
		},
		default: 'autoMap',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['create'],
				dataMode: ['list'],
			},
		},
		default: '',
		required: true,
		placeholder: 'id,name,description',
		description: 'Comma-separated list of the item properties to use as columns',
	},
	{
		displayName: 'Fields to Send',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Field',
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'values',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['projectId', 'datasetId', 'tableId'],
							loadOptionsMethod: 'getSchema',
						},
						default: '',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['create'],
				dataMode: ['define'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['record'],
			},
		},
		options: [
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				default: 100,
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'Ignore Unknown Values',
				name: 'ignoreUnknownValues',
				type: 'boolean',
				default: false,
				description: 'Whether to gnore row values that do not match the schema',
			},
			{
				displayName: 'Skip Invalid Rows',
				name: 'skipInvalidRows',
				type: 'boolean',
				default: false,
				description: 'Whether to skip rows with values that do not match the schema',
			},
			{
				displayName: 'Template Suffix',
				name: 'templateSuffix',
				type: 'string',
				default: '',
				description:
					'Create a new table based on the destination table and insert rows into the new table. The new table will be named <code>{destinationTable}{templateSuffix}</code>',
			},
			{
				displayName: 'Trace ID',
				name: 'traceId',
				type: 'string',
				default: '',
				description:
					'Unique ID for the request, for debugging only. It is case-sensitive, limited to up to 36 ASCII characters. A UUID is recommended.',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	// https://cloud.google.com/bigquery/docs/reference/rest/v2/tabledata/insertAll
	const projectId = this.getNodeParameter('projectId', 0, undefined, {
		extractValue: true,
	});
	const datasetId = this.getNodeParameter('datasetId', 0) as string;
	const tableId = this.getNodeParameter('tableId', 0) as string;
	const options = this.getNodeParameter('options', 0);
	const dataMode = this.getNodeParameter('dataMode', 0) as string;

	let batchSize = 100;
	if (options.batchSize) {
		batchSize = options.batchSize as number;
		delete options.batchSize;
	}

	const items = this.getInputData();
	const length = items.length;

	const returnData: INodeExecutionData[] = [];
	const rows: IDataObject[] = [];
	const body: IDataObject = {};

	Object.assign(body, options);
	if (body.traceId === undefined) {
		body.traceId = uuid();
	}

	const schema = (
		await googleApiRequest.call(
			this,
			'GET',
			`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`,
			{},
		)
	).schema as TableSchema;

	if (schema === undefined) {
		throw new NodeOperationError(this.getNode(), 'The destination table has no defined schema');
	}

	for (let i = 0; i < length; i++) {
		try {
			const record: IDataObject = {};

			if (dataMode === 'autoMap') {
				schema.fields.forEach(({ name }) => {
					record[name] = items[i].json[name];
				});
			}

			if (dataMode === 'define') {
				const fields = this.getNodeParameter('fieldsUi.values', i, []) as IDataObject[];

				fields.forEach(({ fieldId, fieldValue }) => {
					record[`${fieldId}`] = fieldValue;
				});
			}

			if (dataMode === 'list') {
				const columns = this.getNodeParameter('columns', i) as string;
				const columnList = columns.split(',').map((column) => column.trim());

				for (const key of Object.keys(items[i].json)) {
					if (columnList.includes(key)) {
						record[`${key}`] = items[i].json[key];
					}
				}
			}

			rows.push({ json: checkSchema.call(this, schema, record, i) });
		} catch (error) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			throw new NodeOperationError(this.getNode(), error.message, {
				itemIndex: i,
				description: error?.description,
			});
		}
	}

	for (let i = 0; i < rows.length; i += batchSize) {
		const batch = rows.slice(i, i + batchSize);
		body.rows = batch;

		const responseData = await googleApiRequest.call(
			this,
			'POST',
			`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`,
			body,
		);

		if (responseData?.insertErrors && !options.skipInvalidRows) {
			const errors: string[] = [];
			const failedRows: number[] = [];
			const stopedRows: number[] = [];

			(responseData.insertErrors as IDataObject[]).forEach((entry) => {
				const invalidRows = (entry.errors as IDataObject[]).filter(
					(error) => error.reason !== 'stopped',
				);
				if (invalidRows.length) {
					const entryIndex = (entry.index as number) + i;
					errors.push(
						`Row ${entryIndex} failed with error: ${invalidRows
							.map((error) => error.message)
							.join(', ')}`,
					);
					failedRows.push(entryIndex);
				} else {
					const entryIndex = (entry.index as number) + i;
					stopedRows.push(entryIndex);
				}
			});

			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: errors.join('\n, ') }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}

			throw new NodeOperationError(
				this.getNode(),
				`Error occured when inserting items [${failedRows.join(
					', ',
				)}], stopped items [${stopedRows.join(', ')}]`,
				{
					description: errors.join('\n, '),
				},
			);
		}

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(responseData),
			{ itemData: { item: 0 } },
		);

		returnData.push(...executionData);
	}

	return returnData;
}
