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
	instagramApiRequest,
	instagramApiRequestAllItems,
} from './GenericFunctions';

import {
	userFields,
	userOperations,
} from './UserDescription';

import {
	mediaFields,
	mediaOperations,
} from './MediaDescription';

export class Instagram implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Instagram',
		name: 'instagram',
		icon: 'file:instagram.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Instagram Basic Display API',
		defaults: {
			name: 'Instagram',
			color: '#833ab4',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'instagramOAuth2Api',
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

					const qs: IDataObject = {
						fields: 'account_type,id,media,media_count,username',
					};

					const endpoint = this.getNodeParameter('returnSelf', i)
						? '/me'
						: `/${this.getNodeParameter('userId', i)}`;

					responseData = await instagramApiRequest.call(this, 'GET', endpoint, qs);

				}

			} else if (resource === 'media') {

				// *********************************************************************
				//                               media
				// *********************************************************************

				if (operation === 'get') {

					// ----------------------------------
					//         media: get
					// ----------------------------------

					const mediaId = this.getNodeParameter('mediaId', i);
					const qs: IDataObject = {
						fields: 'caption,id,media_type,media_url,permalink,thumbnail_url,timestamp,username',
					};
					responseData = await instagramApiRequestAllItems.call(this, 'GET', `/${mediaId}`, qs);
				}

				if (operation === 'getAll') {

					// ----------------------------------
					//         media: getAll
					// ----------------------------------

					const type = this.getNodeParameter('type', i) as string;

					if (type === 'userMedia') {

						const userId = this.getNodeParameter('userId', i);
						const qs: IDataObject = {
							fields: 'caption,children,id,media_type,media_url,permalink,thumbnail_url,timestamp,username',
						};
						responseData = await instagramApiRequestAllItems.call(this, 'GET', `/${userId}/media`, qs);

					} else if (type === 'albumMedia') {

						const mediaId = this.getNodeParameter('mediaId', i);
						responseData = await instagramApiRequestAllItems.call(this, 'GET', `/${mediaId}/children`);

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
