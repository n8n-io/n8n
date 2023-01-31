import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { TableSchema } from '../../helpers/BigQuery.types';
import { simplify } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'SQL Query',
		name: 'sqlQuery',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['executeQuery'],
				resource: ['query'],
			},
			hide: {
				'/options.useLegacySql': [true],
			},
		},
		default: '',
		placeholder: 'SELECT * FROM dataset.table LIMIT 100',
		hint: 'Standard SQL syntax',
		description:
			'SQL query to execute, you can find more information <a href="https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax" target="_blank">here</a>. Standard SQL syntax used by default, but you can also use Legacy SQL syntax by using optinon \'Use Legacy SQL\'.',
	},
	{
		displayName: 'SQL Query',
		name: 'sqlQuery',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['executeQuery'],
				resource: ['query'],
				'/options.useLegacySql': [true],
			},
		},
		default: '',
		placeholder: 'SELECT * FROM [project:dataset.table] LIMIT 100;',
		hint: 'Legacy SQL syntax',
		description:
			'SQL query to execute, you can find more information about Legacy SQL syntax <a href="https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax" target="_blank">here</a>',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: ['executeQuery'],
				resource: ['query'],
			},
		},
		options: [
			{
				displayName: 'Default Dataset Name or ID',
				name: 'defaultDataset',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDatasets',
					loadOptionsDependsOn: ['projectId.value'],
				},
				default: '',
				description:
					'If not set, all table names in the query string must be qualified in the format \'datasetId.tableId\'. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Dry Run',
				name: 'dryRun',
				type: 'boolean',
				default: false,
				description:
					"Whether set to true BigQuery doesn't run the job. Instead, if the query is valid, BigQuery returns statistics about the job such as how many bytes would be processed. If the query is invalid, an error returns.",
			},
			{
				displayName: 'Maximum Bytes Billed',
				name: 'maximumBytesBilled',
				type: 'string',
				default: '',
				description:
					'Limits the bytes billed for this query. Queries with bytes billed above this limit will fail (without incurring a charge). String in <a href="https://developers.google.com/discovery/v1/type-format?utm_source=cloud.google.com&utm_medium=referral" target="_blank">Int64Value</a> format',
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				default: 1000,
				description: 'The maximum number of rows of data to return',
			},
			{
				displayName: 'Timeout',
				name: 'timeoutMs',
				type: 'number',
				default: 10000,
				description: 'How long to wait for the query to complete, in milliseconds',
			},
			{
				displayName: 'Raw Output',
				name: 'rawOutput',
				type: 'boolean',
				default: false,
				displayOptions: {
					hide: {
						dryRun: [true],
					},
				},
			},
			{
				displayName: 'Use Legacy SQL',
				name: 'useLegacySql',
				type: 'boolean',
				default: false,
				description:
					"Whether to use BigQuery's legacy SQL dialect for this query. If set to false, the query will use BigQuery's standard SQL.",
			},
		],
	},
];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	// https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query

	const items = this.getInputData();
	const length = items.length;

	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < length; i++) {
		try {
			let responseData;

			const projectId = this.getNodeParameter('projectId', i, undefined, {
				extractValue: true,
			});

			const sqlQuery = this.getNodeParameter('sqlQuery', i) as string;

			const options = this.getNodeParameter('options', i);

			let rawOutput = false;

			if (options.rawOutput !== undefined) {
				rawOutput = options.rawOutput as boolean;
				delete options.rawOutput;
			}

			const body: IDataObject = options;
			body.query = sqlQuery;

			if (body.defaultDataset) {
				body.defaultDataset = {
					datasetId: options.defaultDataset,
					projectId,
				};
			}

			if (body.useLegacySql === undefined) {
				body.useLegacySql = false;
			}

			const response = await googleApiRequest.call(
				this,
				'POST',
				`/v2/projects/${projectId}/queries`,
				body,
			);

			if (rawOutput || body.dryRun) {
				responseData = response;
			} else {
				const { rows, schema } = response;

				if (rows !== undefined && schema !== undefined) {
					const fields = (schema as TableSchema).fields;
					responseData = rows;

					responseData = simplify(responseData, fields);
				} else {
					responseData = response;
				}
			}

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
