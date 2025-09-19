import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { generatePairedItemData, updateDisplayOptions } from '@utils/utilities';

import type { TableSchema } from '../../helpers/interfaces';
import { checkSchema, wrapData } from '../../helpers/utils';
import { googleBigQueryApiRequest } from '../../transport';

const properties: INodeProperties[] = [
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
		],
		default: 'autoMap',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName:
			"In this mode, make sure the incoming data fields are named the same as the columns in BigQuery. (Use an 'Edit Fields' node before this node to change them if required.)",
		name: 'info',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				dataMode: ['autoMap'],
			},
		},
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
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['projectId.value', 'datasetId.value', 'tableId.value'],
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
				dataMode: ['define'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
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

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['insert'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	// https://cloud.google.com/bigquery/docs/reference/rest/v2/tabledata/insertAll
	const projectId = this.getNodeParameter('projectId', 0, undefined, {
		extractValue: true,
	});
	const datasetId = this.getNodeParameter('datasetId', 0, undefined, {
		extractValue: true,
	});
	const tableId = this.getNodeParameter('tableId', 0, undefined, {
		extractValue: true,
	});

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
		await googleBigQueryApiRequest.call(
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
			throw new NodeOperationError(this.getNode(), error.message as string, {
				itemIndex: i,
				description: error?.description,
			});
		}
	}

	const itemData = generatePairedItemData(items.length);
	for (let i = 0; i < rows.length; i += batchSize) {
		const batch = rows.slice(i, i + batchSize);
		body.rows = batch;

		const responseData = await googleBigQueryApiRequest.call(
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

			const failedMessage = `Problem inserting item(s) [${failedRows.join(', ')}]`;
			const stoppedMessage = stopedRows.length
				? `, nothing was inserted item(s) [${stopedRows.join(', ')}]`
				: '';
			throw new NodeOperationError(this.getNode(), `${failedMessage}${stoppedMessage}`, {
				description: errors.join('\n, '),
				itemIndex: i,
			});
		}

		const executionData = this.helpers.constructExecutionMetaData(
			wrapData(responseData as IDataObject[]),
			{ itemData },
		);

		returnData.push(...executionData);
	}

	return returnData;
}
