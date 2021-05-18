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
	formatBlocks,
	formatTitle,
	getBlockTypes,
	getFormattedChildren,
	mapFilters,
	mapProperties,
	mapSorting,
	notionApiRequest,
	notionApiRequestAllItems,
	simplifyProperties,
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

import {
	blockFields,
	blockOperations,
} from './BlockDescription';

import {
	searchFields,
	searchOperations,
} from './SearchDescription';

export class Notion implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Notion',
		name: 'notion',
		icon: 'file:notion.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Notion API (Beta)',
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
						name: 'Block',
						value: 'block',
					},
					{
						name: 'Database',
						value: 'database',
					},
					{
						name: 'Page',
						value: 'page',
					},
					{
						name: 'Search',
						value: 'search',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'database',
				description: 'Resource to consume.',
			},
			...blockOperations,
			...blockFields,
			...databaseOperations,
			...databaseFields,
			...pageOperations,
			...pageFields,
			...searchOperations,
			...searchFields,
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
					//remove parameters that cannot be set from the API.
					if (!['created_time', 'last_edited_time', 'created_by', 'last_edited_by', 'formula', 'files'].includes(properties[key].type)) {
						returnData.push({
							name: `${key} - (${properties[key].type})`,
							value: `${key}|${properties[key].type}`,
						});
					}
				}
				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
				return returnData;
			},
			async getFilterProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const databaseId = this.getCurrentNodeParameter('databaseId') as string;
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
				for (const key of Object.keys(properties)) {
					returnData.push({
						name: `${key} - (${properties[key].type})`,
						value: `${key}|${properties[key].type}`,
					});
				}
				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
				return returnData;
			},
			async getBlockTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getBlockTypes();
			},
			async getPropertySelectValues(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const [name, type] = (this.getCurrentNodeParameter('&key') as string).split('|');
				const databaseId = this.getCurrentNodeParameter('databaseId') as string;
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
				return (properties[name][type].options).map((option: IDataObject) => ({ name: option.name, value: (['multi_select', 'select'].includes(type)) ? option.name : option.id }));
			},
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await notionApiRequestAllItems.call(this, 'results', 'GET', '/users');
				for (const user of users) {
					returnData.push({
						name: user.name,
						value: user.id,
					});
				}
				return returnData;
			},
			async getDatbaseIdFromPage(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const pageId = this.getCurrentNodeParameter('pageId') as string;
				const { parent: { database_id: databaseId }  } = await notionApiRequest.call(this, 'GET', `/pages/${pageId}`);
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
				for (const key of Object.keys(properties)) {
					//remove parameters that cannot be set from the API.
					if (!['created_time', 'last_edited_time', 'created_by', 'last_edited_by', 'formula', 'files'].includes(properties[key].type)) {
						returnData.push({
							name: `${key} - (${properties[key].type})`,
							value: `${key}|${properties[key].type}`,
						});
					}
				}
				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const timezone = this.getTimezone();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (resource === 'block') {

			if (operation === 'append') {
				for (let i = 0; i < length; i++) {
					const blockId = this.getNodeParameter('blockId', i) as string;
					const body: IDataObject = {
						children: formatBlocks(this.getNodeParameter('blockUi.blockValues', i, []) as IDataObject[]),
					};
					const block = await notionApiRequest.call(this, 'PATCH', `/blocks/${blockId}/children`, body);
					returnData.push(block);
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const blockId = this.getNodeParameter('blockId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(this, 'results', 'GET', `/blocks/${blockId}/children`, {});
					} else {
						qs.page_size = this.getNodeParameter('limit', i) as number;
						responseData = await notionApiRequest.call(this, 'GET', `/blocks/${blockId}/children`, {});
						responseData = responseData.results;
					}
					returnData.push.apply(returnData, responseData);
				}
			}

			if (operation === 'update') {
				for (let i = 0; i < length; i++) {
					const pageId = this.getNodeParameter('pageId', i) as string;
					const simple = this.getNodeParameter('simple', i) as boolean;
					const properties = this.getNodeParameter('propertiesUi.propertyValues', i, []) as IDataObject[];
					// tslint:disable-next-line: no-any
					const body: { [key: string]: any } = {
						properties: {},
					};
					body.properties = mapProperties(properties, timezone) as IDataObject;
					const page = await notionApiRequest.call(this, 'PATCH', `/pages/${pageId}`, body);
					if (simple === true) {
						page.properties = simplifyProperties(page.properties);
					}
					returnData.push(page);
				}
			}
		}

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
					const simple = this.getNodeParameter('simple', 0) as boolean;
					const databaseId = this.getNodeParameter('databaseId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('options.filter', i, {}) as IDataObject;
					const sort = this.getNodeParameter('options.sort.sortValue', i, []) as IDataObject[];
					const body: IDataObject = {
						filter: {},
					};
					if (filters.singleCondition) {
						body['filter'] = mapFilters([filters.singleCondition] as IDataObject[], timezone);
					}
					if (filters.multipleCondition) {
						const { or, and } = (filters.multipleCondition as IDataObject).condition as IDataObject;
						if (Array.isArray(or) && or.length !== 0) {
							Object.assign(body.filter, { or: (or as IDataObject[]).map((data) => mapFilters([data], timezone)) });
						}
						if (Array.isArray(and) && and.length !== 0) {
							Object.assign(body.filter, { and: (and as IDataObject[]).map((data) => mapFilters([data], timezone)) });
						}
					}
					if (!Object.keys(body.filter as IDataObject).length) {
						delete body.filter;
					}
					if (sort) {
						//@ts-expect-error
						body['sort'] = mapSorting(sort);
					}
					console.log(body.sort);
					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(this, 'results', 'POST', `/databases/${databaseId}/query`, body, {});
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await notionApiRequestAllItems.call(this, 'results', 'POST', `/databases/${databaseId}/query`, body, qs);
						responseData = responseData.splice(0, qs.limit);
					}
					if (simple === true) {
						for (let i = 0; i < responseData.length; i++) {
							responseData[i].properties = simplifyProperties(responseData[i].properties);
						}
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
					// tslint:disable-next-line: no-any
					const body: { [key: string]: any } = {
						parent: {},
						properties: {},
					};
					if (parentType === 'database') {
						body.parent['database_id'] = this.getNodeParameter('databaseId', i) as string;
						const properties = this.getNodeParameter('propertiesUi.propertyValues', i, []) as IDataObject[];
						if (properties.length !== 0) {
							body.properties = mapProperties(properties, timezone) as IDataObject;
						}
					} else {
						body.parent['page_id'] = this.getNodeParameter('pageId', i) as string;
						body.properties = formatTitle(this.getNodeParameter('title', i) as string);
					}
					body.children = formatBlocks(this.getNodeParameter('blockUi.blockValues', i, []) as IDataObject[]);
					const page = await notionApiRequest.call(this, 'POST', '/pages', body);
					if (simple === true) {
						page.properties = simplifyProperties(page.properties);
					}
					returnData.push(page);
				}
			}

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const pageId = this.getNodeParameter('pageId', i) as string;
					const page = await notionApiRequest.call(this, 'GET', `/pages/${pageId}`);
					const simple = this.getNodeParameter('simple', i) as boolean;
					if (simple === true) {
						page.properties = simplifyProperties(page.properties);
					}
					returnData.push(page);
				}
			}

			if (operation === 'updateProperties') {
				for (let i = 0; i < length; i++) {
					const pageId = this.getNodeParameter('pageId', i) as string;
					const simple = this.getNodeParameter('simple', i) as boolean;
					const properties = this.getNodeParameter('propertiesUi.propertyValues', i, []) as IDataObject[];
					// tslint:disable-next-line: no-any
					const body: { [key: string]: any } = {
						properties: {},
					};
					if (properties.length !== 0) {
						body.properties = mapProperties(properties, timezone) as IDataObject;
					}
					const page = await notionApiRequest.call(this, 'PATCH', `/pages/${pageId}`, body);
					if (simple === true) {
						page.properties = simplifyProperties(page.properties);
					}
					returnData.push(page);
				}
			}
		}

		if (resource === 'search') {

			if (operation === 'query') {
				for (let i = 0; i < length; i++) {
					const query = this.getNodeParameter('query', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const body: IDataObject = {
						query,
					};

					if (options.filter) {
						const filter = (options.filter as IDataObject || {}).filters as IDataObject[] || [];
						body['filter'] = filter;
					}

					if (options.sort) {
						const sort = (options.sort as IDataObject || {}).sortValue as IDataObject || {};
						body['sort'] = sort;
					}

					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(this, 'results', 'POST', '/search', body);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await notionApiRequestAllItems.call(this, 'results', 'POST', '/search', body);
						responseData = responseData.splice(0, qs.limit);
					}
					returnData.push.apply(returnData, responseData);
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
