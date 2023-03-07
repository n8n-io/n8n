import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems, simplify } from './GenericFunctions';

import { recordFields, recordOperations } from './RecordDescription';

import { v4 as uuid } from 'uuid';

export class GoogleBigQuery implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google BigQuery',
		name: 'googleBigQuery',
		icon: 'file:googleBigQuery.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google BigQuery API',
		defaults: {
			name: 'Google BigQuery',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
			},
			{
				name: 'googleBigQueryOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'OAuth2 (recommended)',
						value: 'oAuth2',
					},
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
				],
				default: 'oAuth2',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Record',
						value: 'record',
					},
				],
				default: 'record',
			},
			...recordOperations,
			...recordFields,
		],
	};

	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { projects } = await googleApiRequest.call(this, 'GET', '/v2/projects');
				for (const project of projects) {
					returnData.push({
						name: project.friendlyName as string,
						value: project.id,
					});
				}
				return returnData;
			},
			async getDatasets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projectId = this.getCurrentNodeParameter('projectId');
				const returnData: INodePropertyOptions[] = [];
				const { datasets } = await googleApiRequest.call(
					this,
					'GET',
					`/v2/projects/${projectId}/datasets`,
				);
				for (const dataset of datasets) {
					returnData.push({
						name: dataset.datasetReference.datasetId as string,
						value: dataset.datasetReference.datasetId,
					});
				}
				return returnData;
			},
			async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projectId = this.getCurrentNodeParameter('projectId');
				const datasetId = this.getCurrentNodeParameter('datasetId');
				const returnData: INodePropertyOptions[] = [];
				const { tables } = await googleApiRequest.call(
					this,
					'GET',
					`/v2/projects/${projectId}/datasets/${datasetId}/tables`,
				);
				for (const table of tables) {
					returnData.push({
						name: table.tableReference.tableId as string,
						value: table.tableReference.tableId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		if (resource === 'record') {
			// *********************************************************************
			//                               record
			// *********************************************************************

			if (operation === 'create') {
				// ----------------------------------
				//         record: create
				// ----------------------------------

				// https://cloud.google.com/bigquery/docs/reference/rest/v2/tabledata/insertAll

				const projectId = this.getNodeParameter('projectId', 0) as string;
				const datasetId = this.getNodeParameter('datasetId', 0) as string;
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const rows: IDataObject[] = [];
				const body: IDataObject = {};

				for (let i = 0; i < length; i++) {
					const options = this.getNodeParameter('options', i);
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
				}

				body.rows = rows;

				try {
					responseData = await googleApiRequest.call(
						this,
						'POST',
						`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`,
						body,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: 0 } },
					);
					returnData.push(...executionData);
				} catch (error) {
					if (this.continueOnFail()) {
						const executionErrorData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ error: error.message }),
							{ itemData: { item: 0 } },
						);
						returnData.push(...executionErrorData);
					}
					throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: 0 });
				}
			} else if (operation === 'getAll') {
				// ----------------------------------
				//         record: getAll
				// ----------------------------------

				// https://cloud.google.com/bigquery/docs/reference/rest/v2/tables/get

				const returnAll = this.getNodeParameter('returnAll', 0);
				const projectId = this.getNodeParameter('projectId', 0) as string;
				const datasetId = this.getNodeParameter('datasetId', 0) as string;
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const simple = this.getNodeParameter('simple', 0) as boolean;
				let fields;

				if (simple) {
					const { schema } = await googleApiRequest.call(
						this,
						'GET',
						`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`,
						{},
					);
					fields = schema.fields.map((field: IDataObject) => field.name);
				}

				for (let i = 0; i < length; i++) {
					try {
						const options = this.getNodeParameter('options', i);
						Object.assign(qs, options);

						if (qs.selectedFields) {
							fields = (qs.selectedFields as string).split(',');
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
						responseData = simple
							? simplify(responseData as IDataObject[], fields as string[])
							: responseData;

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
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
						throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
					}
				}
			}
		}

		return this.prepareOutputData(returnData);
	}
}
