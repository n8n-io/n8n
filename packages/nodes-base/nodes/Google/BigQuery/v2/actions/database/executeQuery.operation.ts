import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../../utils/utilities';
import type { JobInsertResponse } from '../../helpers/BigQuery.types';

import { prepareOutput } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'SQL Query',
		name: 'sqlQuery',
		type: 'string',
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
		placeholder: 'Add Options',
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
				displayName: 'Include Schema in Output',
				name: 'includeSchema',
				type: 'boolean',
				default: false,
				description:
					"Whether to include the schema in the output. If set to true, the output will contain key '_schema' with the schema of the table.",
			},
			{
				displayName: 'Location',
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

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['executeQuery'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	// https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query

	const items = this.getInputData();
	const length = items.length;

	const returnData: INodeExecutionData[] = [];

	let jobs = [];

	for (let i = 0; i < length; i++) {
		try {
			const sqlQuery = this.getNodeParameter('sqlQuery', i) as string;
			const options = this.getNodeParameter('options', i);
			const projectId = this.getNodeParameter('projectId', i, undefined, {
				extractValue: true,
			});

			let rawOutput = false;
			let includeSchema = false;

			if (options.rawOutput !== undefined) {
				rawOutput = options.rawOutput as boolean;
				delete options.rawOutput;
			}

			if (options.includeSchema !== undefined) {
				includeSchema = options.includeSchema as boolean;
				delete options.includeSchema;
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

			const response: JobInsertResponse = await googleApiRequest.call(
				this,
				'POST',
				`/v2/projects/${projectId}/jobs`,
				{
					configuration: {
						query: body,
					},
				},
			);

			const jobId = response?.jobReference?.jobId;
			const raw = rawOutput || (options.dryRun as boolean) || false;

			jobs.push({ jobId, projectId, i, raw, includeSchema });
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

	let attempts = 0;
	while (jobs.length > 0 && attempts < 5) {
		const completedJobs: string[] = [];

		for (const job of jobs) {
			try {
				const response: IDataObject = await googleApiRequest.call(
					this,
					'GET',
					`/v2/projects/${job.projectId}/queries/${job.jobId}`,
				);

				if (response.jobComplete) {
					completedJobs.push(job.jobId);

					returnData.push(...prepareOutput(response, job.i, job.raw, job.includeSchema));
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
				throw new NodeOperationError(this.getNode(), error.message as string, {
					itemIndex: job.i,
					description: error?.description,
				});
			}
		}

		jobs = jobs.filter((job) => !completedJobs.includes(job.jobId));

		if (jobs.length > 0) {
			await new Promise((resolve) => setTimeout(resolve, 5000));
			attempts++;
		}
	}

	if (jobs.length > 0) {
		throw new NodeOperationError(
			this.getNode(),
			`The following queries did not complete within the timeout from items: ${jobs
				.map((job) => job.i)
				.join(', ')}`,
		);
	}

	return returnData;
}
