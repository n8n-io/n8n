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
import { jsonParse, NodeApiError } from 'n8n-workflow';

import type { SortData, FileRecord } from '../GenericFunctions';
import {
	downloadFiles,
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
	validateJSON,
} from '../GenericFunctions';

import moment from 'moment-timezone';

import { versionDescription } from './VersionDescription';
import { getDatabases } from '../SearchFunctions';

export class NotionV2 implements INodeType {
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
				for (const key of Object.keys(properties as IDataObject)) {
					//remove parameters that cannot be set from the API.
					if (
						![
							'created_time',
							'last_edited_time',
							'created_by',
							'last_edited_by',
							'formula',
							'rollup',
						].includes(properties[key].type as string)
					) {
						returnData.push({
							name: `${key}`,
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
				for (const key of Object.keys(properties as IDataObject)) {
					returnData.push({
						name: `${key}`,
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
					if (['multi_select', 'select', 'status'].includes(type) && operation === 'getAll') {
						return properties[name][type].options.map((option: IDataObject) => ({
							name: option.name,
							value: option.name,
						}));
					} else if (
						['multi_select', 'select', 'status'].includes(type) &&
						['create', 'update'].includes(operation)
					) {
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
				for (const key of Object.keys(properties as IDataObject)) {
					//remove parameters that cannot be set from the API.
					if (
						![
							'created_time',
							'last_edited_time',
							'created_by',
							'last_edited_by',
							'formula',
							'rollup',
						].includes(properties[key].type as string)
					) {
						returnData.push({
							name: `${key}`,
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
					value: option.name,
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
		let download = false;

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
						this.helpers.returnJsonArray(block as IDataObject),
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

					responseData = responseData.map((_data: IDataObject) => ({
						object: _data.object,
						parent_id: blockId,
						..._data,
					}));

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}
		}

		if (resource === 'database') {
			if (operation === 'get') {
				const simple = this.getNodeParameter('simple', 0) as boolean;
				for (let i = 0; i < length; i++) {
					const databaseId = extractDatabaseId(
						this.getNodeParameter('databaseId', i, '', { extractValue: true }) as string,
					);
					responseData = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
					if (simple) {
						responseData = simplifyObjects(responseData, download)[0];
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}

			if (operation === 'getAll') {
				const simple = this.getNodeParameter('simple', 0) as boolean;
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
					if (simple) {
						responseData = simplifyObjects(responseData, download);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
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
					const body: IDataObject = {
						filter: {
							property: 'object',
							value: 'database',
						},
					};

					if (text) {
						body.query = text;
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
						responseData = simplifyObjects(responseData, download);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}
		}

		if (resource === 'databasePage') {
			if (operation === 'create') {
				const databaseId = this.getNodeParameter('databaseId', 0, '', {
					extractValue: true,
				}) as string;
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
				let titleKey = '';
				for (const key of Object.keys(properties as IDataObject)) {
					if (properties[key].type === 'title') {
						titleKey = key;
					}
				}
				for (let i = 0; i < length; i++) {
					const title = this.getNodeParameter('title', i) as string;
					const simple = this.getNodeParameter('simple', i) as boolean;

					const body: { [key: string]: any } = {
						parent: {},
						properties: {},
					};
					if (title !== '') {
						body.properties[titleKey] = {
							title: [
								{
									text: {
										content: title,
									},
								},
							],
						};
					}
					body.parent.database_id = this.getNodeParameter('databaseId', i, '', {
						extractValue: true,
					}) as string;
					const propertiesValues = this.getNodeParameter(
						'propertiesUi.propertyValues',
						i,
						[],
					) as IDataObject[];
					if (propertiesValues.length !== 0) {
						body.properties = Object.assign(
							body.properties,
							mapProperties.call(this, propertiesValues, timezone, 2) as IDataObject,
						);
					}
					const blockValues = this.getNodeParameter('blockUi.blockValues', i, []) as IDataObject[];
					extractDatabaseMentionRLC(blockValues);
					body.children = formatBlocks(blockValues);

					const options = this.getNodeParameter('options', i);
					if (options.icon) {
						if (options.iconType && options.iconType === 'file') {
							body.icon = { external: { url: options.icon } };
						} else {
							body.icon = { emoji: options.icon };
						}
					}

					responseData = await notionApiRequest.call(this, 'POST', '/pages', body);
					if (simple) {
						responseData = simplifyObjects(responseData);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const pageId = extractPageId(
						this.getNodeParameter('pageId', i, '', { extractValue: true }) as string,
					);
					const simple = this.getNodeParameter('simple', i) as boolean;
					responseData = await notionApiRequest.call(this, 'GET', `/pages/${pageId}`);
					if (simple) {
						responseData = simplifyObjects(responseData, download);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					download = this.getNodeParameter('options.downloadFiles', 0, false) as boolean;
					const simple = this.getNodeParameter('simple', 0) as boolean;
					const databaseId = this.getNodeParameter('databaseId', i, '', {
						extractValue: true,
					}) as string;
					const returnAll = this.getNodeParameter('returnAll', i);
					const filterType = this.getNodeParameter('filterType', 0) as string;
					const conditions = this.getNodeParameter('filters.conditions', i, []) as IDataObject[];
					const sort = this.getNodeParameter('options.sort.sortValue', i, []) as IDataObject[];
					const body: IDataObject = {
						filter: {},
					};

					if (filterType === 'manual') {
						const matchType = this.getNodeParameter('matchType', 0) as string;
						if (matchType === 'anyFilter') {
							Object.assign(body.filter!, {
								or: conditions.map((data) => mapFilters([data], timezone)),
							});
						} else if (matchType === 'allFilters') {
							Object.assign(body.filter!, {
								and: conditions.map((data) => mapFilters([data], timezone)),
							});
						}
					} else if (filterType === 'json') {
						const filterJson = this.getNodeParameter('filterJson', i) as string;
						if (validateJSON(filterJson) !== undefined) {
							body.filter = jsonParse(filterJson);
						} else {
							throw new NodeApiError(this.getNode(), {
								message: 'Filters (JSON) must be a valid json',
							});
						}
					}

					if (!Object.keys(body.filter as IDataObject).length) {
						delete body.filter;
					}
					if (sort) {
						body.sorts = mapSorting(sort as SortData[]);
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
					if (download) {
						responseData = await downloadFiles.call(this, responseData as FileRecord[]);
					}
					if (simple) {
						responseData = simplifyObjects(responseData, download);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
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
						body.properties = mapProperties.call(this, properties, timezone, 2) as IDataObject;
					}
					responseData = await notionApiRequest.call(this, 'PATCH', `/pages/${pageId}`, body);
					if (simple) {
						responseData = simplifyObjects(responseData, false);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
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
						this.helpers.returnJsonArray(responseData as IDataObject),
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
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}
		}

		if (resource === 'page') {
			if (operation === 'archive') {
				for (let i = 0; i < length; i++) {
					const pageId = extractPageId(
						this.getNodeParameter('pageId', i, '', { extractValue: true }) as string,
					);
					const simple = this.getNodeParameter('simple', i) as boolean;
					responseData = await notionApiRequest.call(this, 'PATCH', `/pages/${pageId}`, {
						archived: true,
					});
					if (simple) {
						responseData = simplifyObjects(responseData, download);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}

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

					const options = this.getNodeParameter('options', i);
					if (options.icon) {
						if (options.iconType && options.iconType === 'file') {
							body.icon = { external: { url: options.icon } };
						} else {
							body.icon = { emoji: options.icon };
						}
					}

					responseData = await notionApiRequest.call(this, 'POST', '/pages', body);
					if (simple) {
						responseData = simplifyObjects(responseData, download);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
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
						responseData = simplifyObjects(responseData, download);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			}
		}

		if (download) {
			const rawData = returnData.map((data) => data.json);
			return this.prepareOutputData(rawData as INodeExecutionData[]);
		}

		return this.prepareOutputData(returnData);
	}
}
