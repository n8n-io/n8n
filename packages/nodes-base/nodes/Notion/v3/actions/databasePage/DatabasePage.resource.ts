import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError, setSafeObjectProperty } from 'n8n-workflow';

import { dataSourceSearchFilterDescriptions, mapDataSourceFilters } from './DataSourceFilters';
import { downloadFiles, type FileRecord } from '../../../shared/GenericFunctions';
import {
	getIconFromOptions,
	getPageCreateContent,
	getPageId,
	handleOperationError,
	jsonParse,
	mapProperties,
	mapSorting,
	normalizePropertyValues,
	simplifyObjects,
	type SortData,
	validateJSON,
} from '../../helpers/utils';
import {
	getDataSourceProperties,
	notionApiRequestAllItemsV3,
	notionApiRequestV3,
} from '../../transport';
import {
	blockBuilder,
	dataSourceLocator,
	iconOptions,
	pageLocator,
	returnAllOrLimit,
} from '../common.descriptions';

const PROPERTY_KEY_DESCRIPTION =
	'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Use the format <code>Property Name|property_type</code>, for example <code>Due Date|date</code>.';

function getQueryOptions(): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['databasePage'], operation: ['get', 'getAll'] } },
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				placeholder: 'Add Sort',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				displayOptions: { show: { '/operation': ['getAll'] } },
				options: [
					{
						displayName: 'Sort',
						name: 'sortValue',
						values: [
							{
								displayName: 'Timestamp',
								name: 'timestamp',
								type: 'boolean',
								default: false,
								description: "Whether or not to use the record's timestamp to sort the response",
							},
							{
								displayName: 'Property Name or ID',
								name: 'key',
								type: 'options',
								displayOptions: { show: { timestamp: [false] } },
								typeOptions: {
									loadOptionsMethod: 'getFilterProperties',
									loadOptionsDependsOn: ['dataSourceId'],
								},
								default: '',
								description:
									'The name of the property to filter by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Property Name',
								name: 'key',
								type: 'options',
								options: [
									{ name: 'Created Time', value: 'created_time' },
									{ name: 'Last Edited Time', value: 'last_edited_time' },
								],
								displayOptions: { show: { timestamp: [true] } },
								default: '',
								description: 'The name of the property to filter by',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'hidden',
								displayOptions: { show: { timestamp: [true] } },
								default: '={{$parameter["&key"].split("|").pop()}}',
							},
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{ name: 'Ascending', value: 'ascending' },
									{ name: 'Descending', value: 'descending' },
								],
								default: '',
								description: 'The direction to sort',
							},
						],
					},
				],
			},
			{
				displayName: 'Download Files',
				name: 'downloadFiles',
				type: 'boolean',
				default: false,
				description: "Whether to download a file if a page's property contains it",
			},
		],
	};
}

function propertiesUi(
	operation: string,
	keyLoadOptionsMethod: string,
	keyLoadOptionsDependsOn: string[],
	selectLoadOptionsMethod: string,
	selectLoadOptionsDependsOn: string[],
): INodeProperties {
	return {
		displayName: 'Properties',
		name: 'propertiesUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Property',
		displayOptions: { show: { resource: ['databasePage'], operation: [operation] } },
		options: [
			{
				name: 'propertyValues',
				displayName: 'Property',
				values: [
					{
						displayName: 'Key Name or ID',
						name: 'key',
						type: 'options',
						description: PROPERTY_KEY_DESCRIPTION,
						typeOptions: {
							loadOptionsMethod: keyLoadOptionsMethod,
							loadOptionsDependsOn: keyLoadOptionsDependsOn,
						},
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'hidden',
						default: '={{$parameter["&key"].split("|").pop()}}',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						displayOptions: { show: { type: ['title'] } },
					},
					{
						displayName: 'Text',
						name: 'textContent',
						type: 'string',
						default: '',
						displayOptions: { show: { type: ['rich_text'] } },
					},
					{
						displayName: 'Number',
						name: 'numberValue',
						type: 'number',
						default: 0,
						displayOptions: { show: { type: ['number'] } },
					},
					{
						displayName: 'Checkbox',
						name: 'checkboxValue',
						type: 'boolean',
						default: false,
						displayOptions: { show: { type: ['checkbox'] } },
					},
					{
						displayName: 'Select Name or ID',
						name: 'selectValue',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: selectLoadOptionsMethod,
							loadOptionsDependsOn: selectLoadOptionsDependsOn,
						},
						default: '',
						displayOptions: { show: { type: ['select'] } },
					},
					{
						displayName: 'Status Name or ID',
						name: 'statusValue',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: selectLoadOptionsMethod,
							loadOptionsDependsOn: selectLoadOptionsDependsOn,
						},
						default: '',
						displayOptions: { show: { type: ['status'] } },
					},
					{
						displayName: 'Multi Select',
						name: 'multiSelectValue',
						type: 'string',
						default: '',
						displayOptions: { show: { type: ['multi_select'] } },
					},
					{
						displayName: 'URL',
						name: 'urlValue',
						type: 'string',
						default: '',
						displayOptions: { show: { type: ['url'] } },
					},
					{
						displayName: 'Ignore If Empty',
						name: 'ignoreIfEmpty',
						type: 'boolean',
						default: false,
						displayOptions: { show: { type: ['url'] } },
					},
					{
						displayName: 'Email',
						name: 'emailValue',
						type: 'string',
						default: '',
						displayOptions: { show: { type: ['email'] } },
					},
					{
						displayName: 'Phone',
						name: 'phoneValue',
						type: 'string',
						default: '',
						displayOptions: { show: { type: ['phone_number'] } },
					},
					{
						displayName: 'User Names or IDs',
						name: 'peopleValue',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getUsers',
						},
						default: [],
						displayOptions: { show: { type: ['people'] } },
						description:
							'List of users. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Relation IDs',
						name: 'relationValue',
						type: 'string',
						typeOptions: {
							multipleValues: true,
						},
						default: [],
						displayOptions: { show: { type: ['relation'] } },
						description: 'List of related page IDs',
					},
					{
						displayName: 'Range',
						name: 'range',
						type: 'boolean',
						default: false,
						displayOptions: { show: { type: ['date'] } },
						description: 'Whether to define a date range',
					},
					{
						displayName: 'Include Time',
						name: 'includeTime',
						type: 'boolean',
						default: true,
						displayOptions: { show: { type: ['date'] } },
						description: 'Whether to include the time in the date',
					},
					{
						displayName: 'Date',
						name: 'date',
						type: 'dateTime',
						default: '',
						displayOptions: { show: { type: ['date'], range: [false] } },
						description: 'An ISO 8601 format date, with optional time',
					},
					{
						displayName: 'Date Start',
						name: 'dateStart',
						type: 'dateTime',
						default: '',
						displayOptions: { show: { type: ['date'], range: [true] } },
						description: 'An ISO 8601 format date, with optional time',
					},
					{
						displayName: 'Date End',
						name: 'dateEnd',
						type: 'dateTime',
						default: '',
						displayOptions: { show: { type: ['date'], range: [true] } },
						description:
							'An ISO 8601 formatted date, with optional time. Represents the end of a date range.',
					},
					{
						displayName: 'Timezone Name or ID',
						name: 'timezone',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getTimezones',
						},
						default: 'default',
						displayOptions: { show: { type: ['date'] } },
						description:
							'Time zone to use. By default n8n timezone is used. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'File URLs',
						name: 'fileUrls',
						placeholder: 'Add File',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						displayOptions: { show: { type: ['files'] } },
						options: [
							{
								name: 'fileUrl',
								displayName: 'File',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'File URL',
										name: 'url',
										type: 'string',
										default: '',
										description: 'Link to externally hosted file',
									},
								],
							},
						],
					},
				],
			},
		],
	};
}

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['databasePage'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a page in a data source',
				action: 'Create a database page',
			},
			{ name: 'Get', value: 'get', description: 'Get a page', action: 'Get a database page' },
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many pages',
				action: 'Get many database pages',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a page',
				action: 'Update a database page',
			},
		],
		default: 'create',
	},
	{
		...dataSourceLocator,
		displayOptions: { show: { resource: ['databasePage'], operation: ['create', 'getAll'] } },
	},
	{
		...pageLocator,
		displayName: 'Page',
		displayOptions: { show: { resource: ['databasePage'], operation: ['get', 'update'] } },
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['databasePage'], operation: ['create'] } },
		description: 'Page title',
	},
	propertiesUi(
		'create',
		'getDataSourcePropertiesOptions',
		['dataSourceId'],
		'getPropertySelectValues',
		['dataSourceId', '&key'],
	),
	propertiesUi(
		'update',
		'getDataSourcePropertiesFromPage',
		['pageId'],
		'getDataSourceOptionsFromPage',
		['pageId', '&key'],
	),
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'options',
		options: [
			{ name: 'Block Builder', value: 'blockUi' },
			{ name: 'JSON Blocks', value: 'json' },
			{ name: 'Markdown', value: 'markdown' },
		],
		default: 'blockUi',
		displayOptions: { show: { resource: ['databasePage'], operation: ['create'] } },
	},
	{
		displayName: 'Blocks (JSON)',
		name: 'blocksJson',
		type: 'string',
		typeOptions: { rows: 8 },
		default: '',
		displayOptions: {
			show: { resource: ['databasePage'], operation: ['create'], contentType: ['json'] },
		},
	},
	blockBuilder('databasePage', 'create', { contentType: ['blockUi'] }),
	{
		displayName: 'Markdown',
		name: 'markdown',
		type: 'string',
		typeOptions: { rows: 8 },
		default: '',
		displayOptions: {
			show: { resource: ['databasePage'], operation: ['create'], contentType: ['markdown'] },
		},
	},
	iconOptions('databasePage', ['create', 'update']),
	...returnAllOrLimit('databasePage', 'getAll'),
	...dataSourceSearchFilterDescriptions(),
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: { resource: ['databasePage'], operation: ['create', 'get', 'getAll', 'update'] },
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	getQueryOptions(),
];

async function getTitleKey(this: IExecuteFunctions, dataSourceId: string) {
	const properties = await getDataSourceProperties.call(this, dataSourceId);
	for (const key of Object.keys(properties)) {
		const property = properties[key];
		if (
			typeof property === 'object' &&
			property !== null &&
			'type' in property &&
			property.type === 'title'
		) {
			return key;
		}
	}
	return '';
}

export async function create(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			const dataSourceId = this.getNodeParameter('dataSourceId', i, '', {
				extractValue: true,
			}) as string;
			if (!dataSourceId) {
				throw new NodeOperationError(
					this.getNode(),
					'DataSource ID is required to create a database page',
					{
						itemIndex: i,
					},
				);
			}
			const title = this.getNodeParameter('title', i, '') as string;
			if (!title.trim()) {
				throw new NodeOperationError(
					this.getNode(),
					'Title is required to create a database page',
					{
						itemIndex: i,
					},
				);
			}

			const titleKey = await getTitleKey.call(this, dataSourceId);
			const properties: IDataObject = {};
			if (titleKey) {
				setSafeObjectProperty(properties, titleKey, { title: [{ text: { content: title } }] });
			}
			const propertyValues = this.getNodeParameter(
				'propertiesUi.propertyValues',
				i,
				[],
			) as IDataObject[];
			if (propertyValues.length) {
				const mappedProperties = mapProperties.call(
					this,
					normalizePropertyValues(propertyValues),
					this.getTimezone(),
					3,
				);
				for (const [key, value] of Object.entries(mappedProperties)) {
					setSafeObjectProperty(properties, key, value);
				}
			}
			const body: IDataObject = {
				parent: { type: 'data_source_id', data_source_id: dataSourceId },
				properties,
				...getPageCreateContent.call(this, i),
			};
			const icon = getIconFromOptions.call(this, i);
			if (icon) body.icon = icon;
			let response: IDataObject | IDataObject[] = await notionApiRequestV3.call(
				this,
				'POST',
				'/pages',
				body,
			);
			if (this.getNodeParameter('simple', i) as boolean)
				response = simplifyObjects(response, false, 3);
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			handleOperationError.call(this, returnData, error, i);
		}
	}
	return returnData;
}

export async function get(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			let response: IDataObject | IDataObject[] = await notionApiRequestV3.call(
				this,
				'GET',
				`/pages/${getPageId.call(this, i)}`,
			);
			const download = this.getNodeParameter('options.downloadFiles', i, false) as boolean;
			const simple = this.getNodeParameter('simple', i) as boolean;
			let executionData: INodeExecutionData[];
			if (download) {
				executionData = await downloadFiles.call(this, [response as FileRecord], [{ item: i }]);
				if (simple) executionData = simplifyObjects(executionData, true, 3) as INodeExecutionData[];
			} else {
				if (simple) response = simplifyObjects(response, false, 3);
				executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response),
					{ itemData: { item: i } },
				);
			}
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			handleOperationError.call(this, returnData, error, i);
		}
	}
	return returnData;
}

export async function getAll(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			const selectedDataSourceId = this.getNodeParameter('dataSourceId', i, '', {
				extractValue: true,
			}) as string;
			const dataSourceId = selectedDataSourceId;
			const returnAll = this.getNodeParameter('returnAll', i);
			const filterType = this.getNodeParameter('filterType', i) as string;
			const body: IDataObject = {};
			if (filterType === 'manual') {
				const matchType = this.getNodeParameter('matchType', i) as string;
				const conditions = this.getNodeParameter('filters.conditions', i, []) as IDataObject[];
				body.filter = mapDataSourceFilters(conditions, matchType, this.getTimezone());
			} else if (filterType === 'json') {
				const filterJson = this.getNodeParameter('filterJson', i) as string;
				if (validateJSON(filterJson) === undefined) {
					throw new NodeOperationError(this.getNode(), 'Filters (JSON) must be valid JSON', {
						itemIndex: i,
					});
				}
				body.filter = jsonParse(filterJson);
			}
			if (!Object.keys((body.filter as IDataObject | undefined) ?? {}).length) {
				delete body.filter;
			}
			const sort = this.getNodeParameter('options.sort.sortValue', i, []) as SortData[];
			if (sort.length) {
				body.sorts = mapSorting(sort);
			}
			const limit = returnAll ? undefined : this.getNodeParameter('limit', i);
			if (limit) body.page_size = Math.min(limit, 100);
			const response: IDataObject[] = await notionApiRequestAllItemsV3.call(
				this,
				'results',
				'POST',
				`/data_sources/${dataSourceId}/query`,
				body,
				limit ? { limit } : {},
			);
			const download = this.getNodeParameter('options.downloadFiles', i, false) as boolean;
			const simple = this.getNodeParameter('simple', i) as boolean;
			let executionData: INodeExecutionData[];
			if (download) {
				executionData = await downloadFiles.call(this, response as FileRecord[], [{ item: i }]);
				if (simple) executionData = simplifyObjects(executionData, true, 3) as INodeExecutionData[];
			} else {
				const output = simple ? simplifyObjects(response, false, 3) : response;
				executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(output),
					{ itemData: { item: i } },
				);
			}
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			handleOperationError.call(this, returnData, error, i);
		}
	}
	return returnData;
}

export async function update(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			const propertyValues = this.getNodeParameter(
				'propertiesUi.propertyValues',
				i,
				[],
			) as IDataObject[];
			const normalizedPropertyValues = normalizePropertyValues(propertyValues);
			const body: IDataObject = {
				properties: normalizedPropertyValues.length
					? mapProperties.call(this, normalizedPropertyValues, this.getTimezone(), 3)
					: {},
			};
			const icon = getIconFromOptions.call(this, i);
			if (icon) body.icon = icon;
			let response: IDataObject | IDataObject[] = await notionApiRequestV3.call(
				this,
				'PATCH',
				`/pages/${getPageId.call(this, i)}`,
				body,
			);
			if (this.getNodeParameter('simple', i) as boolean)
				response = simplifyObjects(response, false, 3);
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			handleOperationError.call(this, returnData, error, i);
		}
	}
	return returnData;
}
