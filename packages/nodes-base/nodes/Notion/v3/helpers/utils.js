import { jsonParse, NodeOperationError } from 'n8n-workflow';
import { blockUrlExtractionRegexp, databasePageUrlExtractionRegexp } from '../../shared/constants';
import { extractDatabaseMentionRLC, extractPageId, formatText, formatTitle, mapProperties, mapSorting, prepareNotionError, simplifyBlocksOutput, simplifyObjects, validateJSON, } from '../../shared/GenericFunctions';
import { isDataObject } from '../transport';
export { extractDatabaseMentionRLC, formatTitle, mapProperties, mapSorting, prepareNotionError, simplifyBlocksOutput, simplifyObjects, validateJSON, jsonParse, };
export function splitPropertyKey(key) {
    const delimiterIndex = key.lastIndexOf('|');
    if (delimiterIndex === -1)
        return { name: key, type: '' };
    return {
        name: key.slice(0, delimiterIndex),
        type: key.slice(delimiterIndex + 1),
    };
}
function normalizePropertyValue(value) {
    const normalizedValue = { ...value };
    if (typeof normalizedValue.textContent === 'string') {
        normalizedValue.richText = false;
    }
    const isDateProperty = normalizedValue.type === 'date' ||
        (typeof normalizedValue.key === 'string' && normalizedValue.key.endsWith('|date'));
    if (isDateProperty) {
        normalizedValue.range = normalizedValue.range ?? false;
        normalizedValue.includeTime = normalizedValue.includeTime ?? true;
        normalizedValue.timezone = normalizedValue.timezone ?? 'default';
        if (!normalizedValue.range) {
            delete normalizedValue.dateStart;
            delete normalizedValue.dateEnd;
        }
        else {
            delete normalizedValue.date;
        }
    }
    return normalizedValue;
}
export function normalizePropertyValues(values) {
    return values.map(normalizePropertyValue);
}
export function normalizeBlockValues(values) {
    return values.map((value) => {
        if (typeof value.textContent !== 'string')
            return value;
        return {
            ...value,
            richText: false,
        };
    });
}
function getRichTextAnnotations(entry) {
    return isDataObject(entry.annotationUi) ? { annotations: entry.annotationUi } : {};
}
function getTextLink(entry) {
    if (entry.isLink === true && typeof entry.textLink === 'string' && entry.textLink !== '') {
        return { link: { url: entry.textLink } };
    }
    return {};
}
function getMentionId(value) {
    if (typeof value === 'string')
        return value;
    if (isDataObject(value) && typeof value.value === 'string')
        return value.value;
    return undefined;
}
function formatMention(entry) {
    const mentionType = entry.mentionType;
    if (typeof mentionType !== 'string')
        return undefined;
    if (mentionType === 'date') {
        return {
            type: 'mention',
            mention: {
                type: 'date',
                date: entry.range === true
                    ? { start: entry.dateStart, end: entry.dateEnd }
                    : { start: entry.date, end: null },
            },
            ...getRichTextAnnotations(entry),
        };
    }
    const mentionId = getMentionId(entry[mentionType]);
    if (!mentionId)
        return undefined;
    return {
        type: 'mention',
        mention: {
            type: mentionType,
            [mentionType]: { id: mentionId },
        },
        ...getRichTextAnnotations(entry),
    };
}
const parseText = (value) => {
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    throw new Error(`Text value must be a string, number, or boolean. Received: ${typeof value}`);
};
function formatRichText(values) {
    if (!Array.isArray(values))
        return [];
    const results = [];
    for (const value of values) {
        if (!isDataObject(value))
            continue;
        const entry = value;
        if (entry.textType === 'text') {
            results.push({
                type: 'text',
                text: {
                    content: parseText(entry.text),
                    ...getTextLink(entry),
                },
                ...getRichTextAnnotations(entry),
            });
        }
        else if (entry.textType === 'mention') {
            const mention = formatMention(entry);
            if (mention)
                results.push(mention);
        }
        else if (entry.textType === 'equation') {
            results.push({
                type: 'equation',
                equation: {
                    expression: parseText(entry.expression),
                },
                ...getRichTextAnnotations(entry),
            });
        }
    }
    return results;
}
export function formatBlocks(blockValues) {
    const results = [];
    for (const block of blockValues) {
        const blockType = block.type;
        if (typeof blockType !== 'string')
            continue;
        const blockBody = {};
        const prepareText = () => {
            // rich text uses `text` parameter
            if (block.richText === true && isDataObject(block.text)) {
                blockBody.rich_text = formatRichText(block.text.text);
            }
            else {
                // regular text uses `textContent`
                const textContent = parseText(block.textContent);
                blockBody.rich_text = formatText(textContent).text;
            }
        };
        switch (blockType) {
            case 'to_do':
                blockBody.checked = block.checked;
                prepareText();
                break;
            case 'child_page':
                blockBody.title = block.title;
                break;
            case 'image':
                blockBody.type = 'external';
                blockBody.external = { url: block.url };
                break;
            // other block types such as paragraph, heading, etc. don't need special handling
            default:
                prepareText();
                break;
        }
        results.push({
            object: 'block',
            type: blockType,
            [blockType]: blockBody,
        });
    }
    return results;
}
export function parseJsonParameter(value, itemIndex) {
    try {
        return JSON.parse(value);
    }
    catch {
        throw new NodeOperationError(this.getNode(), 'JSON value must be valid JSON', { itemIndex });
    }
}
function getUrlSearchParam(value, parameterName) {
    try {
        return new URL(value).searchParams.get(parameterName) ?? '';
    }
    catch {
        return '';
    }
}
function getUrlHash(value) {
    try {
        return new URL(value).hash.slice(1);
    }
    catch {
        return '';
    }
}
export function getPageId(itemIndex) {
    const page = this.getNodeParameter('pageId', itemIndex, {});
    let pageId = '';
    if (page.value && typeof page.value === 'string') {
        if (page.mode === 'id') {
            pageId = page.value;
        }
        else if (page.value.includes('p=')) {
            pageId = getUrlSearchParam(page.value, 'p');
        }
        else {
            pageId = page.value.match(databasePageUrlExtractionRegexp)?.[1] ?? '';
        }
    }
    if (!pageId) {
        throw new NodeOperationError(this.getNode(), `Could not extract page ID from URL: ${page.value}`);
    }
    return pageId;
}
export function extractBlockId(itemIndex) {
    const blockIdRLCData = this.getNodeParameter('blockId', itemIndex, {});
    if (blockIdRLCData.mode === 'id') {
        return blockIdRLCData.value;
    }
    const blockUrl = blockIdRLCData.value;
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
export function getJsonBlocks(itemIndex) {
    const blocksJson = this.getNodeParameter('blocksJson', itemIndex, '');
    if (!blocksJson)
        return [];
    const parsed = parseJsonParameter.call(this, blocksJson, itemIndex);
    if (!Array.isArray(parsed)) {
        throw new NodeOperationError(this.getNode(), 'Blocks (JSON) must be an array of Notion block objects', { itemIndex });
    }
    return parsed.filter(isDataObject);
}
export function getPageCreateContent(itemIndex) {
    const contentType = this.getNodeParameter('contentType', itemIndex, 'blockUi');
    if (contentType === 'json') {
        return { children: getJsonBlocks.call(this, itemIndex) };
    }
    if (contentType === 'markdown') {
        return { markdown: this.getNodeParameter('markdown', itemIndex, '') };
    }
    const blockValues = normalizeBlockValues(this.getNodeParameter('blockUi.blockValues', itemIndex, []));
    extractDatabaseMentionRLC(blockValues);
    return { children: formatBlocks(blockValues) };
}
export function getIconFromOptions(itemIndex) {
    const options = this.getNodeParameter('options', itemIndex, {});
    const icon = options.icon;
    if (typeof icon !== 'string' || icon === '')
        return undefined;
    let isUrl = false;
    try {
        const url = new URL(icon);
        isUrl = url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch {
        isUrl = false;
    }
    if (isUrl) {
        return { type: 'external', external: { url: icon } };
    }
    return { type: 'emoji', emoji: icon };
}
export function getSearchSort(itemIndex) {
    const sort = this.getNodeParameter('options.sort.sortValue', itemIndex, {});
    const sortValue = Array.isArray(sort) ? sort[0] : sort;
    if (!isDataObject(sortValue))
        return undefined;
    const { direction, timestamp } = sortValue;
    if (typeof direction !== 'string' || typeof timestamp !== 'string')
        return undefined;
    return { direction, timestamp };
}
export function getMarkdownUpdateBody(itemIndex) {
    const type = this.getNodeParameter('markdownUpdateType', itemIndex);
    if (type === 'replace_content') {
        return {
            type,
            replace_content: {
                new_str: this.getNodeParameter('markdown', itemIndex),
            },
        };
    }
    const updates = (this.getNodeParameter('contentUpdates.updates', itemIndex, []) ??
        []).filter(isDataObject);
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
export function flattenDataSources(searchResults) {
    const dataSources = [];
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
export function handleOperationError(returnData, error, itemIndex) {
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
//# sourceMappingURL=utils.js.map