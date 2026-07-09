import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import {
	formatTitle,
	getIconFromOptions,
	getMarkdownUpdateBody,
	getPageCreateContent,
	getPageId,
	getSearchSort,
	handleOperationError,
	simplifyObjects,
} from '../../helpers/utils';
import { notionApiRequestAllItemsV3, notionApiRequestV3 } from '../../transport';
import {
	blockBuilder,
	iconOptions,
	pageLocator,
	returnAllOrLimit,
	searchOptions,
} from '../common.descriptions';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['page'] } },
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive a page',
				action: 'Archive a page',
			},
			{ name: 'Create', value: 'create', description: 'Create a page', action: 'Create a page' },
			{
				name: 'Get Markdown',
				value: 'getMarkdown',
				description: 'Get page markdown',
				action: 'Get page markdown',
			},
			{ name: 'Search', value: 'search', description: 'Search pages', action: 'Search a page' },
			{
				name: 'Update Markdown',
				value: 'updateMarkdown',
				description: 'Update page markdown',
				action: 'Update page markdown',
			},
		],
		default: 'create',
	},
	{
		...pageLocator,
		displayName: 'Parent Page',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		...pageLocator,
		displayOptions: {
			show: { resource: ['page'], operation: ['archive', 'getMarkdown', 'updateMarkdown'] },
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
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
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Blocks (JSON)',
		name: 'blocksJson',
		type: 'string',
		typeOptions: { rows: 8 },
		default: '',
		displayOptions: { show: { resource: ['page'], operation: ['create'], contentType: ['json'] } },
	},
	blockBuilder('page', 'create', { contentType: ['blockUi'] }),
	{
		displayName: 'Markdown',
		name: 'markdown',
		type: 'string',
		typeOptions: { rows: 8 },
		default: '',
		displayOptions: {
			show: { resource: ['page'], operation: ['create'], contentType: ['markdown'] },
		},
	},
	iconOptions('page', ['create']),
	{
		displayName: 'Include Transcript',
		name: 'includeTranscript',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['page'], operation: ['getMarkdown'] } },
	},
	{
		displayName: 'Update Type',
		name: 'markdownUpdateType',
		type: 'options',
		options: [
			{ name: 'Replace Content', value: 'replace_content' },
			{ name: 'Update Content', value: 'update_content' },
		],
		default: 'replace_content',
		displayOptions: { show: { resource: ['page'], operation: ['updateMarkdown'] } },
	},
	{
		displayName: 'Markdown',
		name: 'markdown',
		type: 'string',
		typeOptions: { rows: 8 },
		default: '',
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['updateMarkdown'],
				markdownUpdateType: ['replace_content'],
			},
		},
	},
	{
		displayName: 'Content Updates',
		name: 'contentUpdates',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add Update',
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['updateMarkdown'],
				markdownUpdateType: ['update_content'],
			},
		},
		options: [
			{
				name: 'updates',
				displayName: 'Update',
				values: [
					{
						displayName: 'Old String',
						name: 'oldString',
						type: 'string',
						default: '',
						description: 'Existing markdown content to find',
					},
					{
						displayName: 'New String',
						name: 'newString',
						type: 'string',
						default: '',
						description: 'Replacement markdown content',
					},
					{
						displayName: 'Replace All Matches',
						name: 'replaceAllMatches',
						type: 'boolean',
						default: false,
						description: 'Whether to replace all matches when old string appears multiple times',
					},
				],
			},
		],
	},
	{
		displayName: 'Search Text',
		name: 'text',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['page'], operation: ['search'] } },
	},
	...returnAllOrLimit('page', 'search'),
	searchOptions('page', 'search'),
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['page'], operation: ['archive', 'create', 'search'] } },
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

export async function archive(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			let response: IDataObject | IDataObject[] = await notionApiRequestV3.call(
				this,
				'PATCH',
				`/pages/${getPageId.call(this, i)}`,
				{ in_trash: true },
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

export async function create(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			const body: IDataObject = {
				parent: { page_id: getPageId.call(this, i) },
				properties: formatTitle(this.getNodeParameter('title', i) as string),
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

export async function getMarkdown(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			const includeTranscript = this.getNodeParameter('includeTranscript', i) as boolean;
			const response = await notionApiRequestV3.call(
				this,
				'GET',
				`/pages/${getPageId.call(this, i)}/markdown`,
				{},
				includeTranscript ? { include_transcript: true } : {},
			);
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

export async function search(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			const body: IDataObject = { filter: { property: 'object', value: 'page' } };
			const text = this.getNodeParameter('text', i) as string;
			if (text) body.query = text;
			const sort = getSearchSort.call(this, i);
			if (sort) body.sort = sort;
			const returnAll = this.getNodeParameter('returnAll', i);
			const limit = returnAll ? undefined : this.getNodeParameter('limit', i);
			if (limit) body.page_size = Math.min(limit, 100);
			let response: IDataObject[] = await notionApiRequestAllItemsV3.call(
				this,
				'results',
				'POST',
				'/search',
				body,
				limit ? { limit } : {},
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

export async function updateMarkdown(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			const response = await notionApiRequestV3.call(
				this,
				'PATCH',
				`/pages/${getPageId.call(this, i)}/markdown`,
				getMarkdownUpdateBody.call(this, i),
			);
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
