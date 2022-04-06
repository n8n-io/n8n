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
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

export class RealtimeDatabase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Cloud Realtime Database',
		name: 'googleFirebaseRealtimeDatabase',
		icon: 'file:googleFirebaseRealtimeDatabase.png',
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
				displayName: 'Project ID',
				name: 'projectId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				description: 'As displayed in firebase console URL',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Write data to a database',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete data from a database',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a record from a database',
					},
					{
						name: 'Push',
						value: 'push',
						description: 'Append to a list of data',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update item on a database',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
				required: true,
			},
			{
				displayName: 'Object Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: '/app/users',
				description: 'Object path on database. With leading slash. Do not append .json.',
				required: true,
			},
			{
				displayName: 'Columns / Attributes',
				name: 'attributes',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'create',
							'push',
							'update',
						],
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
			async getProjects(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const projects = await googleApiRequestAllItems.call(
					this,
					'projects',
					'GET',
					'results',
					{},
					{},
					{},
					'https://firebase.googleapis.com/v1beta1/projects',
				);
				const returnData = projects.map((o: IDataObject) => ({ name: o.projectId, value: o.projectId })) as INodePropertyOptions[];
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		let responseData;
		const operation = this.getNodeParameter('operation', 0) as string;
		//https://firebase.google.com/docs/reference/rest/database

		if (['push', 'create', 'update'].includes(operation) && items.length === 1 && Object.keys(items[0].json).length === 0) {
			throw new NodeOperationError(this.getNode(), `The ${operation} operation needs input data`);
		}

		for (let i = 0; i < length; i++) {
			try {
				const projectId = this.getNodeParameter('projectId', i) as string;
				let method = 'GET', attributes = '';
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
					const attributeList = attributes.split(',').map(el => el.trim());
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
						throw new NodeApiError(this.getNode(), responseData, { message: `Requested entity was not found.` });
					} else if (method === 'DELETE') {
						responseData = { success: true };
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else if (typeof responseData === 'string' || typeof responseData === 'number') {
				returnData.push({ [this.getNodeParameter('path', i) as string]: responseData } as IDataObject);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
