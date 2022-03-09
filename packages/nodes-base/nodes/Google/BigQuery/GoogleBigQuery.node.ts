import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
	simplify,
} from './GenericFunctions';

import {
	recordFields,
	recordOperations,
} from './RecordDescription';

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
				name: 'googleBigQueryOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Record',
						value: 'record',
					},
				],
				default: 'record',
				description: 'The resource to operate on.',
			},
			...recordOperations,
			...recordFields,
		],
	};

	methods = {
		loadOptions: {
			async getProjects(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { projects } = await googleApiRequest.call(
					this,
					'GET',
					'/v2/projects',
				);
				for (const project of projects) {
					returnData.push({
						name: project.friendlyName as string,
						value: project.id,
					});
				}
				return returnData;
			},
			async getDatasets(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
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
			async getTables(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
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
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

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

					const options = this.getNodeParameter('options', i) as IDataObject;
					Object.assign(body, options);
					if (body.traceId === undefined) {
						body.traceId = uuid();
					}
					const columns = this.getNodeParameter('columns', i) as string;
					const columnList = columns.split(',').map(column => column.trim());
					const record: IDataObject = {};

					for (const key of Object.keys(items[i].json)) {
						if (columnList.includes(key)) {
							record[`${key}`] = items[i].json[key];
						}
					}
					rows.push({ json: record });
				}

				body.rows = rows;
				responseData = await googleApiRequest.call(
					this,
					'POST',
					`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`,
					body,
				);
				returnData.push(responseData);

			} else if (operation === 'getAll') {

				// ----------------------------------
				//         record: getAll
				// ----------------------------------

				// https://cloud.google.com/bigquery/docs/reference/rest/v2/tables/get

				const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
				const projectId = this.getNodeParameter('projectId', 0) as string;
				const datasetId = this.getNodeParameter('datasetId', 0) as string;
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const simple = this.getNodeParameter('simple', 0) as boolean;
				let fields;

				if (simple === true) {
					const { schema } = await googleApiRequest.call(
						this,
						'GET',
						`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`,
						{},
					);
					fields = schema.fields.map((field: IDataObject) => field.name);
				}

				for (let i = 0; i < length; i++) {
					const options = this.getNodeParameter('options', i) as IDataObject;
					Object.assign(qs, options);

					// if (qs.useInt64Timestamp !== undefined) {
					// 	qs.formatOptions = {
					// 		useInt64Timestamp: qs.useInt64Timestamp,
					// 	};
					// 	delete qs.useInt64Timestamp;
					// }

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
						returnData.push.apply(returnData, (simple) ? simplify(responseData, fields) : responseData);
					} else {
						qs.maxResults = this.getNodeParameter('limit', i) as number;
						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/data`,
							{},
							qs,
						);
						returnData.push.apply(returnData, (simple) ? simplify(responseData.rows, fields) : responseData.rows);
					}
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
