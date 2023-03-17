import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems } from './GenericFunctions';

export class GoogleFirebaseRealtimeDatabase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Cloud Realtime Database',
		name: 'googleFirebaseRealtimeDatabase',
		icon: 'file:googleFirebaseRealtimeDatabase.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with Google Firebase - Realtime Database API',
		defaults: {
			name: 'Google Cloud Realtime Database',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleFirebaseRealtimeDatabaseOAuth2Api',
			},
		],
		properties: [
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				description:
					'As displayed in firebase console URL. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Write data to a database',
						action: 'Write data to a database',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete data from a database',
						action: 'Delete data from a database',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a record from a database',
						action: 'Get a record from a database',
					},
					{
						name: 'Push',
						value: 'push',
						description: 'Append to a list of data',
						action: 'Append to a list of data',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update item on a database',
						action: 'Update item in a database',
					},
				],
				default: 'create',
				required: true,
			},
			{
				displayName: 'Object Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'e.g. /app/users',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-json
				description: 'Object path on database. Do not append .json.',
				required: true,
				displayOptions: {
					hide: {
						operation: ['get'],
					},
				},
			},
			{
				displayName: 'Object Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'e.g. /app/users',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-json
				description: 'Object path on database. Do not append .json.',
				hint: 'Leave blank to get a whole database object',
				displayOptions: {
					show: {
						operation: ['get'],
					},
				},
			},
			{
				displayName: 'Columns / Attributes',
				name: 'attributes',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['create', 'push', 'update'],
					},
				},
				description: 'Attributes to save',
				required: true,
				placeholder: 'age, name, city',
			},
		],
	};

	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projects = await googleApiRequestAllItems.call(
					this,
					'',
					'GET',
					'results',
					{},
					{},
					{},
					'https://firebase.googleapis.com/v1beta1/projects',
				);

				const returnData = projects
					// select only realtime database projects
					.filter(
						(project: IDataObject) => (project.resources as IDataObject).realtimeDatabaseInstance,
					)
					.map((project: IDataObject) => ({
						name: project.projectId,
						value: (project.resources as IDataObject).realtimeDatabaseInstance,
					})) as INodePropertyOptions[];

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const operation = this.getNodeParameter('operation', 0);
		//https://firebase.google.com/docs/reference/rest/database

		if (
			['push', 'create', 'update'].includes(operation) &&
			items.length === 1 &&
			Object.keys(items[0].json).length === 0
		) {
			throw new NodeOperationError(this.getNode(), `The ${operation} operation needs input data`);
		}

		for (let i = 0; i < length; i++) {
			try {
				const projectId = this.getNodeParameter('projectId', i) as string;

				let method = 'GET',
					attributes = '';
				const document: IDataObject = {};
				if (operation === 'create') {
					method = 'PUT';
					attributes = this.getNodeParameter('attributes', i) as string;
				} else if (operation === 'delete') {
					method = 'DELETE';
				} else if (operation === 'get') {
					method = 'GET';
				} else if (operation === 'push') {
					method = 'POST';
					attributes = this.getNodeParameter('attributes', i) as string;
				} else if (operation === 'update') {
					method = 'PATCH';
					attributes = this.getNodeParameter('attributes', i) as string;
				}

				if (attributes) {
					const attributeList = attributes.split(',').map((el) => el.trim());
					attributeList.map((attribute: string) => {
						if (items[i].json.hasOwnProperty(attribute)) {
							document[attribute] = items[i].json[attribute];
						}
					});
				}

				responseData = await googleApiRequest.call(
					this,
					projectId,
					method,
					this.getNodeParameter('path', i) as string,
					document,
				);

				if (responseData === null) {
					if (operation === 'get') {
						throw new NodeApiError(this.getNode(), responseData as JsonObject, {
							message: 'Requested entity was not found.',
						});
					} else if (method === 'DELETE') {
						responseData = { success: true };
					}
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
				throw error;
			}

			if (typeof responseData === 'string' || typeof responseData === 'number') {
				responseData = {
					[this.getNodeParameter('path', i) as string]: responseData,
				};
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
