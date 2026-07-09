import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import {
	extractBlockId,
	formatBlocks,
	handleOperationError,
	normalizeBlockValues,
	simplifyBlocksOutput,
} from '../../helpers/utils';
import { isDataObject, notionApiRequestAllItemsV3, notionApiRequestV3 } from '../../transport';
import { blockBuilder, blockId, returnAllOrLimit } from '../common.descriptions';

async function fetchNestedBlocks(
	this: IExecuteFunctions,
	blocks: IDataObject[],
	responseData: IDataObject[] = [],
	limit?: number,
) {
	for (const block of blocks) {
		responseData.push(block);
		const blockId = block.id;

		if (limit && responseData.length >= limit) {
			return responseData.slice(0, limit);
		}

		if (
			typeof blockId !== 'string' ||
			block.type === 'child_page' ||
			block.type === 'unsupported' ||
			!block.has_children
		) {
			continue;
		}

		const children = await notionApiRequestAllItemsV3.call(
			this,
			'results',
			'GET',
			`/blocks/${blockId}/children`,
		);
		const nestedBlocks = children.map((entry) => ({
			object: entry.object,
			parent_id: blockId,
			...entry,
		}));

		await fetchNestedBlocks.call(this, nestedBlocks, responseData, limit);

		if (limit && responseData.length >= limit) {
			return responseData.slice(0, limit);
		}
	}

	return responseData;
}

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['block'] } },
		options: [
			{
				name: 'Append After',
				value: 'append',
				description: 'Append a block',
				action: 'Append a block',
			},
			{
				name: 'Get Markdown',
				value: 'getMarkdown',
				description: 'Get block markdown',
				action: 'Get block markdown',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many child blocks',
				action: 'Get many child blocks',
			},
		],
		default: 'append',
	},
	{
		...blockId,
		displayName: 'Parent Block',
		displayOptions: { show: { resource: ['block'], operation: ['append'] } },
		description: 'The Notion block to append blocks to',
	},
	{
		displayName: 'Insert After Block',
		name: 'afterBlockId',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['block'], operation: ['append'] } },
		description:
			'ID of the block after which to insert the new blocks. Leave empty to append at the end.',
	},
	blockBuilder('block', 'append'),
	{
		...blockId,
		displayOptions: { show: { resource: ['block'], operation: ['getAll'] } },
		description: 'The Notion block to get children from',
	},
	{
		...blockId,
		displayOptions: { show: { resource: ['block'], operation: ['getMarkdown'] } },
		description: 'The Notion block to get markdown from',
	},
	{
		displayName: 'Include Transcript',
		name: 'includeTranscript',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['block'], operation: ['getMarkdown'] } },
	},
	...returnAllOrLimit('block', 'getAll'),
	{
		displayName: 'Fetch Nested Blocks',
		name: 'fetchNestedBlocks',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['block'], operation: ['getAll'] } },
	},
	{
		displayName: 'Simplify Output',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['block'], operation: ['getAll'] } },
	},
];

export async function append(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const blockIdValue = extractBlockId.call(this, i);
			const rawBlockValues: unknown = this.getNodeParameter('blockUi.blockValues', i, []);
			const blockValues = Array.isArray(rawBlockValues) ? rawBlockValues.filter(isDataObject) : [];
			const blockValuesData = normalizeBlockValues(blockValues);
			const afterBlockId = this.getNodeParameter('afterBlockId', i, '') as string;
			const body: IDataObject = { children: formatBlocks(blockValuesData) };
			if (afterBlockId) {
				body.position = {
					type: 'after_block',
					after_block: { id: afterBlockId },
				};
			}
			const response = await notionApiRequestV3.call(
				this,
				'PATCH',
				`/blocks/${blockIdValue}/children`,
				body,
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

export async function getMarkdown(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const blockIdValue = extractBlockId.call(this, i);
			const includeTranscript = this.getNodeParameter('includeTranscript', i) as boolean;
			// uses page endpoint, but it supports block ids too
			const response = await notionApiRequestV3.call(
				this,
				'GET',
				`/pages/${blockIdValue}/markdown`,
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

export async function getAll(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const blockIdValue = extractBlockId.call(this, i);
			const returnAll = this.getNodeParameter('returnAll', i);
			const limit = returnAll ? undefined : this.getNodeParameter('limit', i);
			let response: IDataObject[] = await notionApiRequestAllItemsV3.call(
				this,
				'results',
				'GET',
				`/blocks/${blockIdValue}/children`,
				{},
				limit ? { page_size: Math.min(limit, 100), limit } : {},
			);
			const fetchNestedBlocksOption = this.getNodeParameter('fetchNestedBlocks', i) as boolean;
			if (fetchNestedBlocksOption) {
				response = await fetchNestedBlocks.call(this, response, [], limit);
			}
			const simplifyOutput = this.getNodeParameter('simplifyOutput', i) as boolean;
			if (simplifyOutput) {
				response = simplifyBlocksOutput(response, blockIdValue);
			}
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
