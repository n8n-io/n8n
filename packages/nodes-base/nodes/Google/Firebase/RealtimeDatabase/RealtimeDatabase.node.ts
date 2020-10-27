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
} from './GenericFunctions';

export class RealtimeDatabase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Firebase Realtime Database',
		name: 'googleFirebaseRealtimeDatabase',
		icon: 'file:googleFirebaseRealtimeDatabase.png',
		group: ['input'],
		version: 1,
        subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with Google Firebase - Realtime Database API',
		defaults: {
			name: 'Google Cloud Realtime Database',
			color: '#ffcb2d',
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
				type: 'string',
				default: '',
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
					},
					{
						name: 'Delete',
						value: 'delete',
					},
					{
						name: 'Get',
						value: 'get',
					},
					{
						name: 'Push',
						value: 'push',
					},
					{
						name: 'Update',
						value: 'update',
					},
				],
				default: 'get',
				description: 'The operation to perform.',
				required: true,
			},
			{
				displayName: "Update Key",
				name: "updateKey",
				type: "string",
				default: "",
				placeholder: "/app/users",
				description: "Object path on database. With leading slash. Do not append .json.",
				required: true,
			},
			{
				displayName: 'Attributes / columns',
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		let responseData: INodeExecutionData;

		for (let i = 0; i < length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const projectId = this.getNodeParameter('projectId', i) as string;
			let method = 'GET', attributes = '', document = {} as IDataObject;
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
				this.getNodeParameter('updateKey', i) as string,
				document
			);

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else if (typeof responseData === 'string') {
				returnData.push({[this.getNodeParameter('updateKey', i) as string]: responseData} as IDataObject);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
