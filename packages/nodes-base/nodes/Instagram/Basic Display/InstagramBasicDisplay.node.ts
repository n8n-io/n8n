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
	userFields,
	userOperations,
} from './UserDescription';

import {
	mediaFields,
	mediaOperations,
} from './MediaDescription';

export class InstagramBasicDisplay implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Instagram Basic Display',
		name: 'instagramBasicDisplay',
		icon: 'file:instagram.svg',
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
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Media',
						value: 'media',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'user',
				description: 'Resource to consume',
			},
			 ...userOperations,
			 ...userFields,
			 ...mediaOperations,
			 ...mediaFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {

			let responseData;

			if (resource === 'user') {

			// *********************************************************************
			//                               user
			// *********************************************************************

				if (operation === 'get') {

					// ----------------------------------
					//           user: get
					// ----------------------------------

					const fields = this.getNodeParameter('fields', i) as string[];
					const qs: IDataObject = {};

					if (fields) {
						qs.fields = fields.join(',');
					}

					const endpoint = this.getNodeParameter('returnSelf', i)
						? '/me'
						: `/${this.getNodeParameter('userId', i)}`;

					responseData = await instagramBasicDisplayApiRequest.call(this, 'GET', endpoint, qs);

				}

			} else if (resource === 'media') {

			// *********************************************************************
			//                               media
			// *********************************************************************

				if (operation === 'getAll') {

					// ----------------------------------
					//         media: getAll
					// ----------------------------------

					const type = this.getNodeParameter('type', i) as string;

					if (type === 'userMedia') {

						const userId = this.getNodeParameter('userId', i);
						const fields = this.getNodeParameter('fields', i) as string[];
						const qs: IDataObject = {};

						if (fields) {
							qs.fields = fields.join(',');
						}

						responseData = await instagramBasicDisplayApiRequest.call(this, 'GET', `/${userId}/media`, qs);
						responseData = responseData.data;

					} else if (type === 'albumMedia') {

						const mediaId = this.getNodeParameter('mediaId', i);

						responseData = await instagramBasicDisplayApiRequest.call(this, 'GET', `/${mediaId}/children`);
						responseData = responseData.data;

					} else if (type === 'mediaFieldsAndEdges') {

						const mediaId = this.getNodeParameter('mediaId', i);
						const fields = this.getNodeParameter('fields', i) as string[];
						const qs: IDataObject = {};

						if (fields) {
							qs.fields = fields.join(',');
						}

						responseData = await instagramBasicDisplayApiRequest.call(this, 'GET', `/${mediaId}`, qs);
					}
				}
			}

			if (responseData.media && responseData.media.paging) {
				delete responseData.media.paging;
			}

			if (responseData.paging) {
				delete responseData.paging;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
