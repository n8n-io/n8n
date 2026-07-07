import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameterResourceLocator,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';

import { blockUrlExtractionRegexp, databasePageUrlExtractionRegexp } from '../../shared/constants';
import {
	extractDatabaseMentionRLC,
	extractPageId,
	formatText,
	formatTitle,
	mapProperties,
	mapSorting,
	prepareNotionError,
	simplifyBlocksOutput,
	simplifyObjects,
	validateJSON,
	type SortData,
} from '../../shared/GenericFunctions';
import { isDataObject } from '../transport';

export {
	extractDatabaseMentionRLC,
	formatTitle,
	mapProperties,
	mapSorting,
	prepareNotionError,
	simplifyBlocksOutput,
	simplifyObjects,
	validateJSON,
	jsonParse,
};
export type { SortData };

function normalizePropertyValue(value: IDataObject) {
	const normalizedValue: IDataObject = { ...value };

	if (typeof normalizedValue.textContent === 'string') {
		normalizedValue.richText = false;
	}

	const isDateProperty =
		normalizedValue.type === 'date' ||
		(typeof normalizedValue.key === 'string' && normalizedValue.key.endsWith('|date'));
	if (isDateProperty) {
		normalizedValue.range = normalizedValue.range ?? false;
		normalizedValue.includeTime = normalizedValue.includeTime ?? true;
		normalizedValue.timezone = normalizedValue.timezone ?? 'default';

		if (!normalizedValue.range) {
			delete normalizedValue.dateStart;
			delete normalizedValue.dateEnd;
		} else {
			delete normalizedValue.date;
		}
	}

	return normalizedValue;
}

export function normalizePropertyValues(values: IDataObject[]) {
	return values.map(normalizePropertyValue);
}

export function normalizeBlockValues(values: IDataObject[]) {
	return values.map((value) => {
		if (typeof value.textContent !== 'string') return value;
		return {
			...value,
			richText: false,
		};
	});
}

type RichTextEntry = IDataObject & {
	annotationUi?: IDataObject;
	date?: string;
	dateEnd?: string;
	dateStart?: string;
	expression?: string;
	isLink?: boolean;
	mentionType?: string;
	range?: boolean;
	text?: string;
	textLink?: string;
	textType?: string;
};

function getRichTextAnnotations(entry: RichTextEntry) {
	return isDataObject(entry.annotationUi) ? { annotations: entry.annotationUi } : {};
}

function getTextLink(entry: RichTextEntry) {
	if (entry.isLink === true && typeof entry.textLink === 'string' && entry.textLink !== '') {
		return { link: { url: entry.textLink } };
	}
	return {};
}

function getMentionId(value: unknown) {
	if (typeof value === 'string') return value;
	if (isDataObject(value) && typeof value.value === 'string') return value.value;
	return undefined;
}

function formatMention(entry: RichTextEntry) {
	const mentionType = entry.mentionType;
	if (typeof mentionType !== 'string') return undefined;

	if (mentionType === 'date') {
		return {
			type: 'mention',
			mention: {
				type: 'date',
				date:
					entry.range === true
						? { start: entry.dateStart, end: entry.dateEnd }
						: { start: entry.date, end: null },
			},
			...getRichTextAnnotations(entry),
		};
	}

	const mentionId = getMentionId(entry[mentionType]);
	if (!mentionId) return undefined;

	return {
		type: 'mention',
		mention: {
			type: mentionType,
			[mentionType]: { id: mentionId },
		},
		...getRichTextAnnotations(entry),
	};
}

function formatRichTextV3(values: unknown) {
	if (!Array.isArray(values)) return [];

	const results: IDataObject[] = [];
	for (const value of values) {
		if (!isDataObject(value)) continue;

		const entry = value as RichTextEntry;
		if (entry.textType === 'text') {
			results.push({
				type: 'text',
				text: {
					content: typeof entry.text === 'string' ? entry.text : '',
					...getTextLink(entry),
				},
				...getRichTextAnnotations(entry),
			});
		} else if (entry.textType === 'mention') {
			const mention = formatMention(entry);
			if (mention) results.push(mention);
		} else if (entry.textType === 'equation') {
			results.push({
				type: 'equation',
				equation: {
					expression: typeof entry.expression === 'string' ? entry.expression : '',
				},
				...getRichTextAnnotations(entry),
			});
		}
	}

	return results;
}

export function formatBlocksV3(blockValues: IDataObject[]) {
	const results: IDataObject[] = [];

	for (const block of blockValues) {
		const blockType = block.type;
		if (typeof blockType !== 'string') continue;

		const blockBody: IDataObject = {};
		if (blockType === 'to_do') {
			blockBody.checked = block.checked;
		}
		if (blockType === 'child_page') {
			blockBody.title = block.title;
		} else if (blockType === 'image') {
			blockBody.type = 'external';
			blockBody.external = { url: block.url };
		} else {
			if (block.richText === true && isDataObject(block.text)) {
				blockBody.rich_text = formatRichTextV3(block.text.text);
			} else {
				const textContent = typeof block.textContent === 'string' ? block.textContent : '';
				blockBody.rich_text = formatText(textContent).text;
			}
		}

		results.push({
			object: 'block',
			type: blockType,
			[blockType]: blockBody,
		});
	}

	return results;
}

export function parseJsonParameter(this: IExecuteFunctions, value: string, itemIndex: number) {
	try {
		return JSON.parse(value) as unknown;
	} catch {
		throw new NodeOperationError(this.getNode(), 'JSON value must be valid JSON', { itemIndex });
	}
}

function getUrlSearchParam(value: string, parameterName: string) {
	try {
		return new URL(value).searchParams.get(parameterName) ?? '';
	} catch {
		return '';
	}
}

function getUrlHash(value: string) {
	try {
		return new URL(value).hash.slice(1);
	} catch {
		return '';
	}
}

export function getPageId(this: IExecuteFunctions, itemIndex: number) {
	const page = this.getNodeParameter('pageId', itemIndex, {}) as INodeParameterResourceLocator;
	let pageId = '';

	if (page.value && typeof page.value === 'string') {
		if (page.mode === 'id') {
			pageId = page.value;
		} else if (page.value.includes('p=')) {
			pageId = getUrlSearchParam(page.value, 'p');
		} else {
			pageId = page.value.match(databasePageUrlExtractionRegexp)?.[1] ?? '';
		}
	}

	if (!pageId) {
		throw new NodeOperationError(
			this.getNode(),
			`Could not extract page ID from URL: ${page.value}`,
		);
	}

	return pageId;
}

export function extractBlockId(this: IExecuteFunctions, itemIndex: number) {
	const blockIdRLCData = this.getNodeParameter('blockId', itemIndex, {}) as IDataObject;

	if (blockIdRLCData.mode === 'id') {
		return blockIdRLCData.value as string;
	}

	const blockUrl = blockIdRLCData.value as string;
	const hashId = getUrlHash(blockUrl);
	if (hashId) {
		return extractPageId(hashId);
	}

	const pageRegex = new RegExp(blockUrlExtractionRegexp);
	const pageMatch = blockUrl.match(pageRegex);
	if (pageMatch !== null) {
		return extractPageId(pageMatch[1]);
	}

	throw new NodeOperationError(this.getNode(), 'Invalid URL, could not find block ID or page ID', {
		itemIndex,
	});
}

export function getJsonBlocks(this: IExecuteFunctions, itemIndex: number) {
	const blocksJson = this.getNodeParameter('blocksJson', itemIndex, '') as string;
	if (!blocksJson) return [];

	const parsed = parseJsonParameter.call(this, blocksJson, itemIndex);
	if (!Array.isArray(parsed)) {
		throw new NodeOperationError(
			this.getNode(),
			'Blocks (JSON) must be an array of Notion block objects',
			{ itemIndex },
		);
	}
	return parsed.filter(isDataObject);
}

export function getPageCreateContent(this: IExecuteFunctions, itemIndex: number) {
	const contentType = this.getNodeParameter('contentType', itemIndex, 'blockUi') as string;
	if (contentType === 'json') {
		return { children: getJsonBlocks.call(this, itemIndex) };
	}
	if (contentType === 'markdown') {
		return { markdown: this.getNodeParameter('markdown', itemIndex, '') as string };
	}

	const blockValues = normalizeBlockValues(
		this.getNodeParameter('blockUi.blockValues', itemIndex, []) as IDataObject[],
	);
	extractDatabaseMentionRLC(blockValues);
	return { children: formatBlocksV3(blockValues) };
}

export function getIconFromOptions(this: IExecuteFunctions, itemIndex: number) {
	const options = this.getNodeParameter('options', itemIndex, {});
	const icon = options.icon;
	if (typeof icon !== 'string' || icon === '') return undefined;

	if (options.iconType === 'file') {
		return { type: 'external', external: { url: icon } };
	}

	return { type: 'emoji', emoji: icon };
}

export function getSearchSort(this: IExecuteFunctions, itemIndex: number) {
	const sort: unknown = this.getNodeParameter('options.sort.sortValue', itemIndex, {});
	const sortValue: unknown = Array.isArray(sort) ? (sort as unknown[])[0] : sort;
	if (!isDataObject(sortValue)) return undefined;

	const { direction, timestamp } = sortValue;
	if (typeof direction !== 'string' || typeof timestamp !== 'string') return undefined;

	return { direction, timestamp };
}

export function getMarkdownUpdateBody(this: IExecuteFunctions, itemIndex: number) {
	const type = this.getNodeParameter('markdownUpdateType', itemIndex) as string;
	if (type === 'replace_content') {
		return {
			type,
			replace_content: {
				new_str: this.getNodeParameter('markdown', itemIndex) as string,
			},
		};
	}

	const updates = (
		(this.getNodeParameter('contentUpdates.updates', itemIndex, []) as IDataObject[] | undefined) ??
		[]
	).filter(isDataObject);
	return {
		type,
		update_content: {
			content_updates: updates.map((update) => ({
				old_str: update.oldString,
				new_str: update.newString,
				...(update.replaceAllMatches ? { replace_all_matches: true } : {}),
			})),
		},
	};
}

export function flattenDataSources(searchResults: IDataObject[]) {
	const dataSources: IDataObject[] = [];
	for (const result of searchResults) {
		if (result.object === 'data_source') {
			dataSources.push(result);
			continue;
		}
		if (Array.isArray(result.data_sources)) {
			for (const dataSource of result.data_sources) {
				if (isDataObject(dataSource)) {
					dataSources.push({
						...dataSource,
						database_id: result.id,
						database_url: result.url,
					});
				}
			}
		}
	}
	return dataSources;
}

export const withItemIndex = (node: INode, error: Error, itemIndex: number) =>
	prepareNotionError(node, error, itemIndex);

export function handleOperationError(
	this: IExecuteFunctions,
	returnData: INodeExecutionData[],
	error: unknown,
	itemIndex: number,
) {
	const normalizedError = error instanceof Error ? error : new Error(String(error));
	const preparedError = prepareNotionError(this.getNode(), normalizedError, itemIndex);

	if (this.continueOnFail()) {
		returnData.push({
			json: { error: preparedError.message },
			pairedItem: { item: itemIndex },
		});
		return;
	}

	throw preparedError;
}
