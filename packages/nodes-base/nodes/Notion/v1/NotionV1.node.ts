import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	extractDatabaseId,
	extractDatabaseMentionRLC,
	extractPageId,
	formatBlocks,
	formatTitle,
	getBlockTypes,
	mapFilters,
	mapProperties,
	mapSorting,
	notionApiRequest,
	notionApiRequestAllItems,
	simplifyObjects,
} from '../GenericFunctions';

import moment from 'moment-timezone';

import { versionDescription } from './VersionDescription';
import { getDatabases } from '../SearchFunctions';

export class NotionV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		listSearch: {
			getDatabases,
		},
		loadOptions: {
			async getDatabaseProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const databaseId = this.getCurrentNodeParameter('databaseId', {
					extractValue: true,
				}) as string;
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
				for (const key of Object.keys(properties)) {
					//remove parameters that cannot be set from the API.
					if (
						![
							'created_time',
							'last_edited_time',
							'created_by',
							'last_edited_by',
							'formula',
							'files',
							'rollup',
						].includes(properties[key].type)
					) {
						returnData.push({
							name: `${key} - (${properties[key].type})`,
							value: `${key}|${properties[key].type}`,
						});
					}
				}
				returnData.sort((a, b) => {
					if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
						return -1;
					}
					if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
						return 1;
					}
					return 0;
				});
				return returnData;
			},
			async getFilterProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const databaseId = this.getCurrentNodeParameter('databaseId', {
					extractValue: true,
				}) as string;
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
				for (const key of Object.keys(properties)) {
					returnData.push({
						name: `${key} - (${properties[key].type})`,
						value: `${key}|${properties[key].type}`,
					});
				}
				returnData.sort((a, b) => {
					if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
						return -1;
					}
					if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
						return 1;
					}
					return 0;
				});
				return returnData;
			},
			async getBlockTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getBlockTypes();
			},
			async getPropertySelectValues(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const [name, type] = (this.getCurrentNodeParameter('&key') as string).split('|');
				const databaseId = this.getCurrentNodeParameter('databaseId', {
					extractValue: true,
				}) as string;
				const resource = this.getCurrentNodeParameter('resource') as string;
				const operation = this.getCurrentNodeParameter('operation') as string;
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
				if (resource === 'databasePage') {
					if (['multi_select', 'select'].includes(type) && operation === 'getAll') {
						return properties[name][type].options.map((option: IDataObject) => ({
							name: option.name,
							value: option.name,
						}));
					} else if (['multi_select'].includes(type) && ['create', 'update'].includes(operation)) {
						return properties[name][type].options.map((option: IDataObject) => ({
							name: option.name,
							value: option.name,
						}));
					}
				}
				return properties[name][type].options.map((option: IDataObject) => ({
					name: option.name,
					value: option.id,
				}));
			},
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await notionApiRequestAllItems.call(this, 'results', 'GET', '/users');
				for (const user of users) {
					if (user.type === 'person') {
						returnData.push({
							name: user.name,
							value: user.id,
						});
					}
				}
				return returnData;
			},
			async getDatabaseIdFromPage(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const pageId = extractPageId(
					this.getCurrentNodeParameter('pageId', { extractValue: true }) as string,
				);
				const {
					parent: { database_id: databaseId },
				} = await notionApiRequest.call(this, 'GET', `/pages/${pageId}`);
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
				for (const key of Object.keys(properties)) {
					//remove parameters that cannot be set from the API.
					if (
						![
							'created_time',
							'last_edited_time',
							'created_by',
							'last_edited_by',
							'formula',
							'files',
						].includes(properties[key].type)
					) {
						returnData.push({
							name: `${key} - (${properties[key].type})`,
							value: `${key}|${properties[key].type}`,
						});
					}
				}
				returnData.sort((a, b) => {
					if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
						return -1;
					}
					if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
						return 1;
					}
					return 0;
				});
				return returnData;
			},

			async getDatabaseOptionsFromPage(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const pageId = extractPageId(
					this.getCurrentNodeParameter('pageId', { extractValue: true }) as string,
				);
				const [name, type] = (this.getCurrentNodeParameter('&key') as string).split('|');
				const {
					parent: { database_id: databaseId },
				} = await notionApiRequest.call(this, 'GET', `/pages/${pageId}`);
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
				return properties[name][type].options.map((option: IDataObject) => ({
					name: option.name,
					value: option.id,
				}));
			},

			// Get all the timezones to display them to user so that he can
			// select them easily
			async getTimezones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (const timezone of moment.tz.names()) {
					const timezoneName = timezone;
					const timezoneId = timezone;
					returnData.push({
						name: timezoneName,
						value: timezoneId,
					});
				}
				returnData.unshift({
					name: 'Default',
					value: 'default',
					description: 'Timezone set in n8n',
				});
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const qs: IDataObject = {};
		const timezone = this.getTimezone();

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		if (resource === 'block') {
			if (operation === 'append') {
				for (let i = 0; i < length; i++) {
					const blockId = extractPageId(
						this.getNodeParameter('blockId', i, '', { extractValue: true }) as string,
					);
					const blockValues = this.getNodeParameter('blockUi.blockValues', i, []) as IDataObject[];
					extractDatabaseMentionRLC(blockValues);
					const body: IDataObject = {
						children: formatBlocks(blockValues),
					};
					const block = await notionApiRequest.call(
						this,
						'PATCH',
						`/blocks/${blockId}/children`,
						body,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(block),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const blockId = extractPageId(
						this.getNodeParameter('blockId', i, '', { extractValue: true }) as string,
					);
					const returnAll = this.getNodeParameter('returnAll', i);
					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(
							this,
							'results',
							'GET',
							`/blocks/${blockId}/children`,
							{},
						);
					} else {
						qs.page_size = this.getNodeParameter('limit', i);
						responseData = await notionApiRequest.call(
							this,
							'GET',
							`/blocks/${blockId}/children`,
							{},
							qs,
						);
						responseData = responseData.results;
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}
		}

		if (resource === 'database') {
			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const databaseId = extractDatabaseId(
						this.getNodeParameter('databaseId', i, '', { extractValue: true }) as string,
					);
					responseData = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const body: IDataObject = {
						filter: { property: 'object', value: 'database' },
					};
					const returnAll = this.getNodeParameter('returnAll', i);
					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(
							this,
							'results',
							'POST',
							'/search',
							body,
						);
					} else {
						body.page_size = this.getNodeParameter('limit', i);
						responseData = await notionApiRequest.call(this, 'POST', '/search', body);
						responseData = responseData.results;
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}
		}

		if (resource === 'databasePage') {
			if (operation === 'create') {
				for (let i = 0; i < length; i++) {
					const simple = this.getNodeParameter('simple', i) as boolean;

					const body: { [key: string]: any } = {
						parent: {},
						properties: {},
					};
					body.parent.database_id = this.getNodeParameter('databaseId', i, '', {
						extractValue: true,
					}) as string;
					const properties = this.getNodeParameter(
						'propertiesUi.propertyValues',
						i,
						[],
					) as IDataObject[];
					if (properties.length !== 0) {
						body.properties = mapProperties.call(this, properties, timezone) as IDataObject;
					}
					const blockValues = this.getNodeParameter('blockUi.blockValues', i, []) as IDataObject[];
					extractDatabaseMentionRLC(blockValues);
					body.children = formatBlocks(blockValues);
					responseData = await notionApiRequest.call(this, 'POST', '/pages', body);
					if (simple) {
						responseData = simplifyObjects(responseData, false, 1);
					}

					const options = this.getNodeParameter('options', i);
					if (options.icon) {
						if (options.iconType && options.iconType === 'file') {
							body.icon = { external: { url: options.icon } };
						} else {
							body.icon = { emoji: options.icon };
						}
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const simple = this.getNodeParameter('simple', 0) as boolean;
					const databaseId = this.getNodeParameter('databaseId', i, '', {
						extractValue: true,
					}) as string;
					const returnAll = this.getNodeParameter('returnAll', i);
					const filters = this.getNodeParameter('options.filter', i, {}) as IDataObject;
					const sort = this.getNodeParameter('options.sort.sortValue', i, []) as IDataObject[];
					const body: IDataObject = {
						filter: {},
					};
					if (filters.singleCondition) {
						body.filter = mapFilters([filters.singleCondition] as IDataObject[], timezone);
					}
					if (filters.multipleCondition) {
						const { or, and } = (filters.multipleCondition as IDataObject).condition as IDataObject;
						if (Array.isArray(or) && or.length !== 0) {
							Object.assign(body.filter!, {
								or: (or as IDataObject[]).map((data) => mapFilters([data], timezone)),
							});
						}
						if (Array.isArray(and) && and.length !== 0) {
							Object.assign(body.filter!, {
								and: (and as IDataObject[]).map((data) => mapFilters([data], timezone)),
							});
						}
					}
					if (!Object.keys(body.filter as IDataObject).length) {
						delete body.filter;
					}
					if (sort) {
						//@ts-expect-error
						body.sorts = mapSorting(sort);
					}
					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(
							this,
							'results',
							'POST',
							`/databases/${databaseId}/query`,
							body,
							{},
						);
					} else {
						body.page_size = this.getNodeParameter('limit', i);
						responseData = await notionApiRequest.call(
							this,
							'POST',
							`/databases/${databaseId}/query`,
							body,
							qs,
						);
						responseData = responseData.results;
					}
					if (simple) {
						responseData = simplifyObjects(responseData, false, 1);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}

			if (operation === 'update') {
				for (let i = 0; i < length; i++) {
					const pageId = extractPageId(
						this.getNodeParameter('pageId', i, '', { extractValue: true }) as string,
					);
					const simple = this.getNodeParameter('simple', i) as boolean;
					const properties = this.getNodeParameter(
						'propertiesUi.propertyValues',
						i,
						[],
					) as IDataObject[];

					const body: { [key: string]: any } = {
						properties: {},
					};
					if (properties.length !== 0) {
						body.properties = mapProperties.call(this, properties, timezone) as IDataObject;
					}
					responseData = await notionApiRequest.call(this, 'PATCH', `/pages/${pageId}`, body);
					if (simple) {
						responseData = simplifyObjects(responseData, false, 1);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}
		}

		if (resource === 'user') {
			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const userId = this.getNodeParameter('userId', i) as string;
					responseData = await notionApiRequest.call(this, 'GET', `/users/${userId}`);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}
			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const returnAll = this.getNodeParameter('returnAll', i);
					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(this, 'results', 'GET', '/users');
					} else {
						qs.limit = this.getNodeParameter('limit', i);
						responseData = await notionApiRequestAllItems.call(this, 'results', 'GET', '/users');
						responseData = responseData.splice(0, qs.limit);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}
		}

		if (resource === 'page') {
			if (operation === 'create') {
				for (let i = 0; i < length; i++) {
					const simple = this.getNodeParameter('simple', i) as boolean;

					const body: { [key: string]: any } = {
						parent: {},
						properties: {},
					};
					body.parent.page_id = extractPageId(
						this.getNodeParameter('pageId', i, '', { extractValue: true }) as string,
					);
					body.properties = formatTitle(this.getNodeParameter('title', i) as string);
					const blockValues = this.getNodeParameter('blockUi.blockValues', i, []) as IDataObject[];
					extractDatabaseMentionRLC(blockValues);
					body.children = formatBlocks(blockValues);
					responseData = await notionApiRequest.call(this, 'POST', '/pages', body);
					if (simple) {
						responseData = simplifyObjects(responseData, false, 1);
					}

					const options = this.getNodeParameter('options', i);
					if (options.icon) {
						if (options.iconType && options.iconType === 'file') {
							body.icon = { external: { url: options.icon } };
						} else {
							body.icon = { emoji: options.icon };
						}
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const pageId = extractPageId(this.getNodeParameter('pageId', i) as string);
					const simple = this.getNodeParameter('simple', i) as boolean;
					responseData = await notionApiRequest.call(this, 'GET', `/pages/${pageId}`);
					if (simple) {
						responseData = simplifyObjects(responseData, false, 1);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}

			if (operation === 'search') {
				for (let i = 0; i < length; i++) {
					const text = this.getNodeParameter('text', i) as string;
					const options = this.getNodeParameter('options', i);
					const returnAll = this.getNodeParameter('returnAll', i);
					const simple = this.getNodeParameter('simple', i) as boolean;
					const body: IDataObject = {};

					if (text) {
						body.query = text;
					}

					if (options.filter) {
						const filter = ((options.filter as IDataObject)?.filters as IDataObject[]) || [];
						body.filter = filter;
					}

					if (options.sort) {
						const sort = ((options.sort as IDataObject)?.sortValue as IDataObject) || {};
						body.sort = sort;
					}
					if (returnAll) {
						responseData = await notionApiRequestAllItems.call(
							this,
							'results',
							'POST',
							'/search',
							body,
						);
					} else {
						qs.limit = this.getNodeParameter('limit', i);
						responseData = await notionApiRequestAllItems.call(
							this,
							'results',
							'POST',
							'/search',
							body,
						);
						responseData = responseData.splice(0, qs.limit);
					}

					if (simple) {
						responseData = simplifyObjects(responseData, false, 1);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}
		}
		return this.prepareOutputData(returnData);
	}
}
