import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties, NodeOperationError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { googleApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['create'],
			},
		},
		default: '',
		required: true,
		placeholder: 'id,name,description',
		description: 'Comma-separated list of the item properties to use as columns',
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
	const projectId = this.getNodeParameter('projectId', 0) as string;
	const datasetId = this.getNodeParameter('datasetId', 0) as string;
	const tableId = this.getNodeParameter('tableId', 0) as string;

	const options = this.getNodeParameter('options', 0);
	const items = this.getInputData();
	const length = items.length;

	const returnData: INodeExecutionData[] = [];
	const rows: IDataObject[] = [];
	const body: IDataObject = {};

	for (let i = 0; i < length; i++) {
		try {
			Object.assign(body, options);
			if (body.traceId === undefined) {
				body.traceId = uuid();
			}
			const columns = this.getNodeParameter('columns', i) as string;
			const columnList = columns.split(',').map((column) => column.trim());
			const record: IDataObject = {};

			for (const key of Object.keys(items[i].json)) {
				if (columnList.includes(key)) {
					record[`${key}`] = items[i].json[key];
				}
			}

			rows.push({ json: record });
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
	body.rows = rows;

	const responseData = await googleApiRequest.call(
		this,
		'POST',
		`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`,
		body,
	);

	if (responseData?.insertErrors && !options.skipInvalidRows) {
		const errors: string[] = [];
		const failedRows: number[] = [];

		(responseData.insertErrors as IDataObject[]).forEach((entry) => {
			const invalidRows = (entry.errors as IDataObject[]).filter(
				(error) => error.reason !== 'stopped',
			);
			if (invalidRows.length) {
				errors.push(
					`Row ${entry.index} failed with error: ${invalidRows
						.map((error) => error.message)
						.join(', ')}`,
				);
				failedRows.push(entry.index as number);
			}
		});

		throw new NodeOperationError(
			this.getNode(),
			`Error occured when inserting items [${failedRows.join(', ')}]`,
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

	return returnData;
}
