import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties, NodeOperationError } from 'n8n-workflow';
import { SchemaField, TableSchema } from '../../helpers/BigQuery.types';
import { getSchemaForSelectedFields, selectedFieldsToObject, simplify } from '../../helpers/utils';
import { googleApiRequest, googleApiRequestAllItems } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['record'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['record'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['record'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'selectedFields',
				type: 'string',
				default: '',
				description:
					'Subset of fields to return, supports select into sub fields. Example: <code>selectedFields = "a,e.d.f"</code>',
			},
			{
				displayName: 'Return Table Schema',
				name: 'returnTableSchema',
				type: 'boolean',
				default: false,
				description: 'Whether to return the table schema instead of the data',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	// https://cloud.google.com/bigquery/docs/reference/rest/v2/tables/get
	const items = this.getInputData();
	const length = items.length;

	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < length; i++) {
		try {
			let responseData;
			const returnAll = this.getNodeParameter('returnAll', i);
			const projectId = this.getNodeParameter('projectId', i) as string;
			const datasetId = this.getNodeParameter('datasetId', i) as string;
			const tableId = this.getNodeParameter('tableId', i) as string;
			const simple = this.getNodeParameter('simple', i) as boolean;
			const options = this.getNodeParameter('options', i);

			let fields: SchemaField[] = [];
			const qs: IDataObject = {};

			try {
				const tableSchema = (
					await googleApiRequest.call(
						this,
						'GET',
						`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`,
						{},
					)
				).schema as TableSchema;

				fields = tableSchema.fields;

				if (options.returnTableSchema) {
					return [{ json: tableSchema }];
				}

				if (options.selectedFields) {
					qs.selectedFields = options.selectedFields;
				}

				if (returnAll) {
					responseData = await googleApiRequestAllItems.call(
						this,
						'rows',
						'GET',
						`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/data`,
						{},
						qs,
					);
				} else {
					qs.maxResults = this.getNodeParameter('limit', i);
					responseData = await googleApiRequest.call(
						this,
						'GET',
						`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/data`,
						{},
						qs,
					);
				}
				if (!returnAll) {
					responseData = responseData.rows;
				}

				if (!responseData?.length) {
					return [];
				}
			} catch (error) {
				if (error.message.includes('EXTERNAL')) {
					const limit = this.getNodeParameter('limit', i, 0);

					const query = `SELECT * FROM [${projectId}:${datasetId}.${tableId}]${
						limit ? ' LIMIT ' + limit.toString() : ''
					};`;

					const { schema, rows } = await googleApiRequest.call(
						this,
						'POST',
						`/v2/projects/${projectId}/queries`,
						{ query },
					);

					fields = (schema as TableSchema).fields;
					responseData = rows;
				} else {
					throw error;
				}
			}

			if (qs.selectedFields) {
				const selected = selectedFieldsToObject(qs.selectedFields as string);
				fields = getSchemaForSelectedFields(fields, selected);
			}

			responseData = simple ? simplify(responseData, fields) : responseData;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
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

	return returnData;
}
