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
} from '../shared/GenericFunctions';
import { listSearch } from '../shared/methods';

export class NotionV2 implements INodeType {
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

						if (nodeVersion > 2) {
							const simplifyOutput = this.getNodeParameter('simplifyOutput', i) as boolean;

							if (simplifyOutput) {
								responseData = simplifyBlocksOutput(responseData, blockId);
							}
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
				const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
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
							body.properties = mapProperties.call(this, properties, timezone, 2) as IDataObject;
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
