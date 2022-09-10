import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { webflowApiRequest, webflowApiRequestAllItems } from './GenericFunctions';

import { itemFields, itemOperations } from './ItemDescription';

export class Webflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webflow',
		name: 'webflow',
		icon: 'file:webflow.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Webflow API',
		defaults: {
			name: 'Webflow',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'webflowApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'webflowOAuth2Api',
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
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Item',
						value: 'item',
					},
				],
				default: 'item',
			},
			...itemOperations,
			...itemFields,
		],
	};

	methods = {
		loadOptions: {
			async getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const sites = await webflowApiRequest.call(this, 'GET', '/sites');
				for (const site of sites) {
					returnData.push({
						name: site.name,
						value: site._id,
					});
				}
				return returnData;
			},
			async getCollections(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const siteId = this.getCurrentNodeParameter('siteId');
				const collections = await webflowApiRequest.call(
					this,
					'GET',
					`/sites/${siteId}/collections`,
				);
				for (const collection of collections) {
					returnData.push({
						name: collection.name,
						value: collection._id,
					});
				}
				return returnData;
			},
			async getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const collectionId = this.getCurrentNodeParameter('collectionId');
				const { fields } = await webflowApiRequest.call(
					this,
					'GET',
					`/collections/${collectionId}`,
				);
				for (const field of fields) {
					returnData.push({
						name: `${field.name} (${field.type}) ${field.required ? ' (required)' : ''}`,
						value: field.slug,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const qs: IDataObject = {};
		let responseData;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'item') {
					// *********************************************************************
					//                             item
					// *********************************************************************

					// https://developers.webflow.com/#item-model

					if (operation === 'create') {
						// ----------------------------------
						//         item: create
						// ----------------------------------

						// https://developers.webflow.com/#create-new-collection-item

						const collectionId = this.getNodeParameter('collectionId', i) as string;

						const properties = this.getNodeParameter(
							'fieldsUi.fieldValues',
							i,
							[],
						) as IDataObject[];

						const live = this.getNodeParameter('live', i) as boolean;

						const fields = {} as IDataObject;

						properties.forEach((data) => (fields[data.fieldId as string] = data.fieldValue));

						const body: IDataObject = {
							fields,
						};

						responseData = await webflowApiRequest.call(
							this,
							'POST',
							`/collections/${collectionId}/items`,
							body,
							{ live },
						);
					} else if (operation === 'delete') {
						// ----------------------------------
						//         item: delete
						// ----------------------------------

						// https://developers.webflow.com/#remove-collection-item

						const collectionId = this.getNodeParameter('collectionId', i) as string;
						const itemId = this.getNodeParameter('itemId', i) as string;
						responseData = await webflowApiRequest.call(
							this,
							'DELETE',
							`/collections/${collectionId}/items/${itemId}`,
						);
					} else if (operation === 'get') {
						// ----------------------------------
						//         item: get
						// ----------------------------------

						// https://developers.webflow.com/#get-single-item

						const collectionId = this.getNodeParameter('collectionId', i) as string;
						const itemId = this.getNodeParameter('itemId', i) as string;
						responseData = await webflowApiRequest.call(
							this,
							'GET',
							`/collections/${collectionId}/items/${itemId}`,
						);
						responseData = responseData.items;
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         item: getAll
						// ----------------------------------

						// https://developers.webflow.com/#get-all-items-for-a-collection

						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const collectionId = this.getNodeParameter('collectionId', i) as string;
						const qs: IDataObject = {};

						if (returnAll === true) {
							responseData = await webflowApiRequestAllItems.call(
								this,
								'GET',
								`/collections/${collectionId}/items`,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0) as number;
							responseData = await webflowApiRequest.call(
								this,
								'GET',
								`/collections/${collectionId}/items`,
								{},
								qs,
							);
							responseData = responseData.items;
						}
					} else if (operation === 'update') {
						// ----------------------------------
						//         item: update
						// ----------------------------------

						// https://developers.webflow.com/#update-collection-item

						const collectionId = this.getNodeParameter('collectionId', i) as string;

						const itemId = this.getNodeParameter('itemId', i) as string;

						const properties = this.getNodeParameter(
							'fieldsUi.fieldValues',
							i,
							[],
						) as IDataObject[];

						const live = this.getNodeParameter('live', i) as boolean;

						const fields = {} as IDataObject;

						properties.forEach((data) => (fields[data.fieldId as string] = data.fieldValue));

						const body: IDataObject = {
							fields,
						};

						responseData = await webflowApiRequest.call(
							this,
							'PUT',
							`/collections/${collectionId}/items/${itemId}`,
							body,
							{ live },
						);
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
