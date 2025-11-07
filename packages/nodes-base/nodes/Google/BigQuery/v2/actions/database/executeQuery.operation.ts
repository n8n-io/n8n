import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { ApplicationError, NodeOperationError, sleep } from 'n8n-workflow';

import { getResolvables, updateDisplayOptions } from '@utils/utilities';

import type { ResponseWithJobReference } from '../../helpers/interfaces';
import { prepareOutput } from '../../helpers/utils';
import { googleBigQueryApiRequestAllItems, googleBigQueryApiRequest } from '../../transport';

interface IQueryParameterOptions {
	namedParameters: Array<{
		name: string;
		value: string;
	}>;
}

const properties: INodeProperties[] = [
	{
		displayName: 'SQL Query',
		name: 'sqlQuery',
		type: 'string',
		noDataExpression: true,
		typeOptions: {
			editor: 'sqlEditor',
		},
		displayOptions: {
			hide: {
				'/options.useLegacySql': [true],
			},
		},
		default: '',
		placeholder: 'SELECT * FROM dataset.table LIMIT 100',
		description:
			'SQL query to execute, you can find more information <a href="https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax" target="_blank">here</a>. Standard SQL syntax used by default, but you can also use Legacy SQL syntax by using optinon \'Use Legacy SQL\'.',
	},
	{
		displayName: 'SQL Query',
		name: 'sqlQuery',
		type: 'string',
		noDataExpression: true,
		typeOptions: {
			editor: 'sqlEditor',
		},
		displayOptions: {
			show: {
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
		placeholder: 'Add option',
		default: {},
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
					'If not set, all table names in the query string must be qualified in the format \'datasetId.tableId\'. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				displayName: 'Include Schema in Output',
				name: 'includeSchema',
				type: 'boolean',
				default: false,
				description:
					"Whether to include the schema in the output. If set to true, the output will contain key '_schema' with the schema of the table.",
				displayOptions: {
					hide: {
						rawOutput: [true],
					},
				},
			},
			{
				displayName: 'Location (Region)',
				name: 'location',
				type: 'string',
				default: '',
				placeholder: 'e.g. europe-west3',
				description:
					'Location or the region where data would be stored and processed. Pricing for storage and analysis is also defined by location of data and reservations, more information <a href="https://cloud.google.com/bigquery/docs/locations" target="_blank">here</a>.',
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
				displayName: 'Max Results Per Page',
				name: 'maxResults',
				type: 'number',
				default: 1000,
				description:
					'Maximum number of results to return per page of results. This is particularly useful when dealing with large datasets. It will not affect the total number of results returned, e.g. rows in a table. You can use LIMIT in your SQL query to limit the number of rows returned.',
			},
			{
				displayName: 'Timeout',
				name: 'timeoutMs',
				type: 'number',
				default: 10000,
				hint: 'How long to wait for the query to complete, in milliseconds',
				description:
					'Specifies the maximum amount of time, in milliseconds, that the client is willing to wait for the query to complete. Be aware that the call is not guaranteed to wait for the specified timeout; it typically returns after around 200 seconds (200,000 milliseconds), even if the query is not complete.',
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
			{
				displayName: 'Return Integers as Numbers',
				name: 'returnAsNumbers',
				type: 'boolean',
				default: false,
				description:
					'Whether all integer values will be returned as numbers. If set to false, all integer values will be returned as strings.',
			},
			{
				displayName: 'Query Parameters (Named)',
				name: 'queryParameters',
				type: 'fixedCollection',
				description:
					'Use <a href="https://cloud.google.com/bigquery/docs/parameterized-queries#using_structs_in_parameterized_queries" target="_blank">parameterized queries</a> to prevent SQL injections. Positional arguments are not supported at the moment. This feature won\'t be available when using legacy SQL.',
				displayOptions: {
					hide: {
						'/options.useLegacySql': [true],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Parameter',
				default: {
					namedParameters: [
						{
							name: '',
							value: '',
						},
					],
				},
				options: [
					{
						name: 'namedParameters',
						displayName: 'Named Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the parameter',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description:
									'The substitute value. It must be a string. Arrays, dates and struct types mentioned in <a href="https://cloud.google.com/bigquery/docs/parameterized-queries#using_structs_in_parameterized_queries" target="_blank">the official documentation</a> are not yet supported.',
							},
						],
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['executeQuery'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const length = items.length;

	const returnData: INodeExecutionData[] = [];

	let jobs = [];
	let maxResults = 1000;
	let timeoutMs = 10000;

	for (let i = 0; i < length; i++) {
		try {
			let sqlQuery = this.getNodeParameter('sqlQuery', i) as string;

			const options = this.getNodeParameter('options', i) as {
				defaultDataset?: string;
				dryRun?: boolean;
				includeSchema?: boolean;
				location?: string;
				maximumBytesBilled?: string;
				maxResults?: number;
				timeoutMs?: number;
				rawOutput?: boolean;
				useLegacySql?: boolean;
				returnAsNumbers?: boolean;
				queryParameters?: IQueryParameterOptions;
			};

			const projectId = this.getNodeParameter('projectId', i, undefined, {
				extractValue: true,
			});

			for (const resolvable of getResolvables(sqlQuery)) {
				sqlQuery = sqlQuery.replace(resolvable, this.evaluateExpression(resolvable, i) as string);
			}

			let rawOutput = false;
			let includeSchema = false;

			if (options.rawOutput !== undefined) {
				rawOutput = options.rawOutput;
				delete options.rawOutput;
			}

			if (options.includeSchema !== undefined) {
				includeSchema = options.includeSchema;
				delete options.includeSchema;
			}

			if (options.maxResults) {
				maxResults = options.maxResults;
				delete options.maxResults;
			}

			if (options.timeoutMs) {
				timeoutMs = options.timeoutMs;
				delete options.timeoutMs;
			}

			const body: IDataObject = { ...options };

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

			if (typeof body.queryParameters === 'object') {
				const { namedParameters } = body.queryParameters as IQueryParameterOptions;

				body.parameterMode = 'NAMED';

				body.queryParameters = namedParameters.map(({ name, value }) => {
					// BigQuery type descriptors are very involved, and it would be hard to support all possible
					// options, that's why the only supported type here is "STRING".
					//
					// If we switch this node to the official JS SDK from Google, we should be able to use `getTypeDescriptorFromValue`
					// at runtime, which would infer BQ type descriptors of any valid JS value automatically:
					//
					// https://github.com/googleapis/nodejs-bigquery/blob/22021957f697ce67491bd50535f6fb43a99feea0/src/bigquery.ts#L1111
					//
					// Another, less user-friendly option, would be to allow users to specify the types manually.
					return { name, parameterType: { type: 'STRING' }, parameterValue: { value } };
				});
			}

			//https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/insert
			const response: ResponseWithJobReference = await googleBigQueryApiRequest.call(
				this,
				'POST',
				`/v2/projects/${projectId}/jobs`,
				{
					configuration: {
						query: body,
					},
				},
			);

			if (!response?.jobReference?.jobId) {
				throw new NodeOperationError(this.getNode(), `No job ID returned, item ${i}`, {
					description: `sql: ${sqlQuery}`,
					itemIndex: i,
				});
			}

			const jobId = response?.jobReference?.jobId;
			const raw = rawOutput || options.dryRun || false;
			const location = options.location || response.jobReference.location;

			if (response.status?.state === 'DONE') {
				const qs = { location, maxResults, timeoutMs };

				//https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/getQueryResults
				const queryResponse: IDataObject = await googleBigQueryApiRequestAllItems.call(
					this,
					'GET',
					`/v2/projects/${projectId}/queries/${jobId}`,
					undefined,
					qs,
				);

				if (body.returnAsNumbers === true) {
					const numericDataTypes = ['INTEGER', 'NUMERIC', 'FLOAT', 'BIGNUMERIC']; // https://cloud.google.com/bigquery/docs/schemas#standard_sql_data_types
					const schema: IDataObject = queryResponse?.schema as IDataObject;
					const schemaFields: IDataObject[] = schema.fields as IDataObject[];
					const schemaDataTypes: string[] = schemaFields?.map(
						(field: IDataObject) => field.type as string,
					);
					const rows: IDataObject[] = queryResponse.rows as IDataObject[];

					for (const row of rows) {
						if (!row?.f || !Array.isArray(row.f)) continue;
						row.f.forEach((entry: IDataObject, index: number) => {
							if (entry && typeof entry === 'object' && 'v' in entry) {
								// Skip this row if it's null or doesn't have 'f' as an array
								const value = entry.v;
								if (numericDataTypes.includes(schemaDataTypes[index])) {
									entry.v = Number(value);
								}
							}
						});
					}
				}

				returnData.push(...prepareOutput.call(this, queryResponse, i, raw, includeSchema));
			} else {
				jobs.push({ jobId, projectId, i, raw, includeSchema, location });
			}
		} catch (error) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			if ((error.message as string).includes('location') || error.httpCode === '404') {
				error.description =
					"Are you sure your table is in that region? You can specify the region using the 'Location' parameter from options.";
			}

			if (error.httpCode === '403' && error.message.includes('Drive')) {
				error.description =
					'If your table(s) pull from a document in Google Drive, make sure that document is shared with your user';
			}

			throw new NodeOperationError(this.getNode(), error as Error, {
				itemIndex: i,
				description: error.description,
			});
		}
	}

	let waitTime = 1000;
	while (jobs.length > 0) {
		const completedJobs: string[] = [];

		for (const job of jobs) {
			try {
				const qs: IDataObject = job.location ? { location: job.location } : {};

				qs.maxResults = maxResults;
				qs.timeoutMs = timeoutMs;

				//https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/getQueryResults
				const response: IDataObject = await googleBigQueryApiRequestAllItems.call(
					this,
					'GET',
					`/v2/projects/${job.projectId}/queries/${job.jobId}`,
					undefined,
					qs,
				);

				if (response.jobComplete) {
					completedJobs.push(job.jobId);

					returnData.push(...prepareOutput.call(this, response, job.i, job.raw, job.includeSchema));
				}
				if ((response?.errors as IDataObject[])?.length) {
					const errorMessages = (response.errors as IDataObject[]).map((error) => error.message);
					throw new ApplicationError(
						`Error(s) ocurring while executing query from item ${job.i.toString()}: ${errorMessages.join(
							', ',
						)}`,
						{ level: 'warning' },
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: job.i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: job.i,
					description: error.description,
				});
			}
		}

		jobs = jobs.filter((job) => !completedJobs.includes(job.jobId));

		if (jobs.length > 0) {
			await sleep(waitTime);
			if (waitTime < 30000) {
				waitTime = waitTime * 2;
			}
		}
	}

	return returnData;
}
