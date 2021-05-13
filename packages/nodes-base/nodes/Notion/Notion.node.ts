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
	formatTitle,
	getBlockTypes,
	getFormattedChildren,
	mapProperties,
	notionApiRequest,
	notionApiRequestAllItems,
	//simplifyProperties,
} from './GenericFunctions';

import {
	databaseFields,
	databaseOperations,
} from './DatabaseDescription';

import {
	userFields,
	userOperations,
} from './UserDescription';

import {
	pageFields,
	pageOperations,
} from './PageDescription';

export class Notion implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Notion',
		name: 'notion',
		icon: 'file:notion.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Notion API',
		defaults: {
			name: 'Notion',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'notionApi',
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
						name: 'Database',
						value: 'database',
					},
					{
						name: 'Page',
						value: 'page',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'database',
				description: 'Resource to consume.',
			},
			...databaseOperations,
			...databaseFields,
			...pageOperations,
			...pageFields,
			...userOperations,
			...userFields,
		],
	};

	methods = {

		loadOptions: {
			async getDatabases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const databases = await notionApiRequestAllItems.call(this, 'results', 'GET', `/databases`);
				for (const database of databases) {
					returnData.push({
						name: database.title[0].plain_text,
						value: database.id,
					});
				}
				return returnData;
			},
			async getDatabaseProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const databaseId = this.getCurrentNodeParameter('databaseId') as string;
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
				for (const key of Object.keys(properties)) {
					returnData.push({
						name: `${key} - (${properties[key].type})`,
						value: key,
					});
				}
				return returnData;
			},
			async getBlockTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getBlockTypes();
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (resource === 'database') {

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const databaseId = this.getNodeParameter('databaseId', i) as string;
					responseData = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
					returnData.push(responseData);
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(this, 'results', 'GET', `/databases`, {});
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await notionApiRequestAllItems.call(this, 'results', 'GET', `/databases`, {}, qs);
						responseData = responseData.splice(0, qs.limit);
					}
					returnData.push.apply(returnData, responseData);
				}
			}

			if (operation === 'query') {
				for (let i = 0; i < length; i++) {
					const databaseId = this.getNodeParameter('databaseId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					//const options = this.getNodeParameter('options', i) as IDataObject;
					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(this, 'results', 'POST', `/databases/${databaseId}/query`, {});
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await notionApiRequestAllItems.call(this, 'results', 'POST', `/databases/${databaseId}/query`, qs);
						responseData = responseData.splice(0, qs.limit);
					}
					returnData.push.apply(returnData, responseData);
				}
			}

		}

		if (resource === 'user') {

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const userId = this.getNodeParameter('userId', i) as string;
					responseData = await notionApiRequest.call(this, 'GET', `/users/${userId}`);
					returnData.push(responseData);
				}
			}
			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(this, 'results', 'GET', '/users');
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await notionApiRequestAllItems.call(this, 'results', 'GET', '/users');
						responseData = responseData.splice(0, qs.limit);
					}
					returnData.push.apply(returnData, responseData);
				}
			}
		}

		if (resource === 'page') {

			if (operation === 'create') {
				for (let i = 0; i < length; i++) {
					const parentType = this.getNodeParameter('parentType', i) as string;
					const simple = this.getNodeParameter('simple', i) as boolean;
					const body: { [key: string]: any  } = {
						parent: {},
						properties: {},
					};
					if (parentType === 'database') {
						body.parent['database_id'] = this.getNodeParameter('databaseId', i) as string;
						const properties = this.getNodeParameter('propertiesUi.propertyValues', i) as IDataObject[];
						body.properties = mapProperties(properties) as IDataObject;
					} else {
						body.parent['page_id'] = this.getNodeParameter('pageId', i) as string;
						body.properties = formatTitle(this.getNodeParameter('title', i) as string);
					}
					//console.log(body.properties);
					//const children = this.getNodeParameter('childrenUi.childrenValues', i) as IDataObject[];
					const page = await notionApiRequest.call(this, 'POST', '/pages', body);
					// if (simple === true) {
					// 	page.properties = simplifyProperties(page.properties);
					// }
					returnData.push(page);
				}
			}

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const pageId = this.getNodeParameter('pageId', i) as string;
					const page = await notionApiRequest.call(this, 'GET', `/pages/${pageId}`);
					returnData.push(page);
				}
			}

			if (operation === 'update') {
				for (let i = 0; i < length; i++) {
					const pageId = this.getNodeParameter('pageId', i) as string;
					const simple = this.getNodeParameter('simple', i) as boolean;
					const properties = this.getNodeParameter('propertiesUi.propertyValues', i) as IDataObject[];
					const body: { [key: string]: any } = {
						properties: {},
					};
					body.properties = mapProperties(properties) as IDataObject;
					const page = await notionApiRequest.call(this, 'PATCH', `/pages/${pageId}`, body);
					// if (simple === true) {
					// 	page.properties = simplifyProperties(page.properties);
					// }
					returnData.push(page);
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
