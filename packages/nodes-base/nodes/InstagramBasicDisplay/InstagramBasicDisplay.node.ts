import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	instagramBasicDisplayApiRequest,
} from './GenericFunctions';

import {
	userOperations,
	userFields,
} from './UserDescription';

import {
	mediaOperations,
	mediaFields,
} from './MediaDescription';


export class InstagramBasicDisplay implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Instagram Basic Display',
		name: 'instagramBasicDisplay',
		icon: 'file:instagram.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consumes Instagram Basic Display API',
		defaults: {
			name: 'Instagram Basic Display',
			color: '#833ab4',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'instagramBasicDisplayOAuth2Api',
				required: true,
			},
		],
		properties: [
			// Resources
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Media',
						value: 'media',
					},
				],
				default: 'user',
				description: 'Resource to consume.',
			},
			 ...userOperations,
			 ...userFields,
			 ...mediaOperations,
			 ...mediaFields,
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const requestMethod = 'GET';
		let endpoint = '';
		const body: IDataObject = {};
		const qs: IDataObject = {};

		for (let i = 0; i < items.length; i++) {

			let responseData;

			if (resource === 'user') {

				if (operation === 'get') {

					const returnSelf = this.getNodeParameter('returnSelf', i) as boolean;
					const fields = this.getNodeParameter('fields', i) as string[];

					if (fields) {
						qs.fields = fields.join(',');
					}

					if (returnSelf) {

						endpoint = '/me';
						responseData = await instagramBasicDisplayApiRequest.call(this, requestMethod, endpoint, body, qs);

					} else {

						const userId = this.getNodeParameter('userId', i) as string;
						endpoint = `/${userId}`;
						responseData = await instagramBasicDisplayApiRequest.call(this, requestMethod, endpoint, body, qs);

					}

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else if (resource === 'media') {

				if (operation === 'getAll') {

					const type = this.getNodeParameter('type', i) as string;

					if (type === 'userMedia') {

						const fields = this.getNodeParameter('fields', i) as string[];

						if (fields) {
							qs.fields = fields.join(',');
						}

						const userIdForMedia = this.getNodeParameter('userIdForMedia', i) as string;
						endpoint = `/${userIdForMedia}/media`;
						responseData = await instagramBasicDisplayApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = responseData.data;

					} else if (type === 'albumMedia') {

						const mediaId = this.getNodeParameter('mediaId', i) as string;
						endpoint = `/${mediaId}/children`;
						responseData = await instagramBasicDisplayApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = responseData.data;

					} else if (type === 'mediaFieldsAndEdges') {

						const fields = this.getNodeParameter('fields', i) as string[];

						if (fields) {
							qs.fields = fields.join(',');
						}

						const mediaId = this.getNodeParameter('mediaId', i) as string;
						endpoint = `/${mediaId}`;
						responseData = await instagramBasicDisplayApiRequest.call(this, requestMethod, endpoint, body, qs);

					} else {
						throw new Error(`The type ${type} is unknown!`);
					}

				} else {
					throw new Error(`The operation '${operation}' is unknown!`);
				}

			} else {
				throw new Error(`The resource '${resource}' is unknown!`);
			}

			if (responseData.media && responseData.media.paging) {
				delete responseData.media.paging;
			}

			if (responseData.paging) {
				delete responseData.paging;
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}

		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
