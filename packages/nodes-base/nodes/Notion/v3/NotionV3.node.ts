import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, NodeApiError } from 'n8n-workflow';

import { loadOptions } from './methods';
import { versionDescription } from './VersionDescription';
import type { SortData, FileRecord } from '../shared/GenericFunctions';
import {
	downloadFiles,
	extractBlockId,
	extractDatabaseId,
	extractDatabaseMentionRLC,
	getPageId,
	formatBlocks,
	formatTitle,
	mapFilters,
	mapProperties,
	mapSorting,
	notionApiRequest,
	notionApiRequestAllItems,
	notionApiRequestGetBlockChildrens,
	prepareNotionError,
	simplifyBlocksOutput,
	simplifyObjects,
	validateJSON,
	getDataSourceId,
} from '../shared/GenericFunctions';
import { listSearch } from '../shared/methods';

export class NotionV3 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = { listSearch, loadOptions };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const nodeVersion = this.getNode().typeVersion;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		const itemsLength = items.length;
		const timezone = this.getTimezone();
		const qs: IDataObject = {};

		let returnData: INodeExecutionData[] = [];
		let responseData;
		let download = false;

		if (resource === 'block') {
			if (operation === 'append') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const blockId = extractBlockId.call(this, nodeVersion, i);
						const blockValues = this.getNodeParameter(
							'blockUi.blockValues',
							i,
							[],
						) as IDataObject[];
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
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const blockId = extractBlockId.call(this, nodeVersion, i);
						const returnAll = this.getNodeParameter('returnAll', i);
						const fetchNestedBlocks = this.getNodeParameter('fetchNestedBlocks', i) as boolean;

						if (returnAll) {
							responseData = await notionApiRequestAllItems.call(
								this,
								'results',
								'GET',
								`/blocks/${blockId}/children`,
								{},
							);

							if (fetchNestedBlocks) {
								responseData = await notionApiRequestGetBlockChildrens.call(this, responseData);
							}
						} else {
							const limit = this.getNodeParameter('limit', i);
							qs.page_size = limit;
							responseData = await notionApiRequest.call(
								this,
								'GET',
								`/blocks/${blockId}/children`,
								{},
								qs,
							);
							const results = responseData.results;

							if (fetchNestedBlocks) {
								responseData = await notionApiRequestGetBlockChildrens.call(
									this,
									results,
									[],
									limit,
								);
							} else {
								responseData = results;
							}
						}

						responseData = responseData.map((_data: IDataObject) => ({
							object: _data.object,
							parent_id: blockId,
							..._data,
						}));

						const simplifyOutput = this.getNodeParameter('simplifyOutput', i) as boolean;

						if (simplifyOutput) {
							responseData = simplifyBlocksOutput(responseData, blockId);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}
		}

		if (resource === 'database') {
			if (operation === 'get') {
				const simple = this.getNodeParameter('simple', 0) as boolean;
				for (let i = 0; i < itemsLength; i++) {
					try {
						const databaseId = extractDatabaseId(
							this.getNodeParameter('databaseId', i, '', { extractValue: true }) as string,
						);
						// In API version 2025-09-03, GET /databases returns the container with data sources
						responseData = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
						if (simple) {
							responseData = simplifyObjects(responseData, download)[0];
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}

			if (operation === 'getAll') {
				const simple = this.getNodeParameter('simple', 0) as boolean;
				for (let i = 0; i < itemsLength; i++) {
					try {
						const body: IDataObject = {
							// API version 2025-09-03 uses 'data_source' instead of 'database'
							filter: { property: 'object', value: 'data_source' },
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
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}

			if (operation === 'search') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const text = this.getNodeParameter('text', i) as string;
						const options = this.getNodeParameter('options', i);
						const returnAll = this.getNodeParameter('returnAll', i);
						const simple = this.getNodeParameter('simple', i) as boolean;
						const body: IDataObject = {
							filter: {
								property: 'object',
								value: 'data_source',
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
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}
		}

		if (resource === 'databasePage') {
			if (operation === 'create') {
				const databaseId = this.getNodeParameter('databaseId', 0, '', {
					extractValue: true,
				}) as string;

				// Get data source ID from the database
				const dataSourceId = await getDataSourceId.call(this, databaseId, 0);

				// Get properties from the data source (not the database container)
				const { properties } = await notionApiRequest.call(
					this,
					'GET',
					`/data_sources/${dataSourceId}`,
				);
				let titleKey = '';
				for (const key of Object.keys(properties as IDataObject)) {
					if (properties[key].type === 'title') {
						titleKey = key;
					}
				}
				for (let i = 0; i < itemsLength; i++) {
					try {
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
						// Use data_source_id instead of database_id in v3
						body.parent.data_source_id = dataSourceId;

						const propertiesValues = this.getNodeParameter(
							'propertiesUi.propertyValues',
							i,
							[],
						) as IDataObject[];
						if (propertiesValues.length !== 0) {
							body.properties = Object.assign(
								body.properties,
								mapProperties.call(this, propertiesValues, timezone, 3) as IDataObject,
							);
						}
						const blockValues = this.getNodeParameter(
							'blockUi.blockValues',
							i,
							[],
						) as IDataObject[];
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
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}

			if (operation === 'get') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const pageId = getPageId.call(this, i);

						const simple = this.getNodeParameter('simple', i) as boolean;
						responseData = await notionApiRequest.call(this, 'GET', `/pages/${pageId}`);
						if (simple) {
							responseData = simplifyObjects(responseData, download);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						download = this.getNodeParameter('options.downloadFiles', 0, false) as boolean;
						const simple = this.getNodeParameter('simple', 0) as boolean;
						const databaseId = this.getNodeParameter('databaseId', i, '', {
							extractValue: true,
						}) as string;

						// Get data source ID from the database
						const dataSourceId = await getDataSourceId.call(this, databaseId, i);

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
								throw new NodeApiError(
									this.getNode(),
									{
										message: 'Filters (JSON) must be a valid json',
									},
									{ itemIndex: i },
								);
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
								`/data_sources/${dataSourceId}/query`,
								body,
								{},
							);
						} else {
							body.page_size = this.getNodeParameter('limit', i);
							responseData = await notionApiRequest.call(
								this,
								'POST',
								`/data_sources/${dataSourceId}/query`,
								body,
								qs,
							);
							responseData = responseData.results;
						}
						if (download) {
							responseData = await downloadFiles.call(this, responseData as FileRecord[], [
								{ item: i },
							]);
						}
						if (simple) {
							responseData = simplifyObjects(responseData, download);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}

			if (operation === 'update') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const pageId = getPageId.call(this, i);
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
							body.properties = mapProperties.call(this, properties, timezone, 3) as IDataObject;
						}

						const options = this.getNodeParameter('options', i);
						if (options.icon) {
							if (options.iconType && options.iconType === 'file') {
								body.icon = { type: 'external', external: { url: options.icon } };
							} else {
								body.icon = { type: 'emoji', emoji: options.icon };
							}
						}

						responseData = await notionApiRequest.call(this, 'PATCH', `/pages/${pageId}`, body);
						if (simple) {
							responseData = simplifyObjects(responseData, false);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}
		}

		if (resource === 'user') {
			if (operation === 'get') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const userId = this.getNodeParameter('userId', i) as string;
						responseData = await notionApiRequest.call(this, 'GET', `/users/${userId}`);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}
			if (operation === 'getAll') {
				for (let i = 0; i < itemsLength; i++) {
					try {
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
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}
		}

		if (resource === 'page') {
			if (operation === 'archive') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const pageId = getPageId.call(this, i);
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
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}

			if (operation === 'create') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const simple = this.getNodeParameter('simple', i) as boolean;
						const body: { [key: string]: any } = {
							parent: {},
							properties: {},
						};
						body.parent.page_id = getPageId.call(this, i);
						body.properties = formatTitle(this.getNodeParameter('title', i) as string);
						const blockValues = this.getNodeParameter(
							'blockUi.blockValues',
							i,
							[],
						) as IDataObject[];
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
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}

			if (operation === 'search') {
				for (let i = 0; i < itemsLength; i++) {
					try {
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
						returnData = returnData.concat(executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: i },
							});
						} else {
							throw prepareNotionError(this.getNode(), error, i);
						}
					}
				}
			}
		}

		return [returnData];
	}
}
