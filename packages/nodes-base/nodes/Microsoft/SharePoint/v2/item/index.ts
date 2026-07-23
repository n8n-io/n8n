import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeProperties,
	ResourceMapperValue,
} from 'n8n-workflow';
import { setSafeObjectProperty } from 'n8n-workflow';

import { type CollectionSearchOptions, searchGraphCollection } from '../helpers/graphSearch';
import { odataFieldEqualsClause } from '../helpers/utils';
import { resolveSiteId } from '../site';
import { microsoftApiRequest } from '../transport';

/** Keeps the item field hidden until a list is chosen. */
export const untilListSelected = { list: [''] };

export const itemRLC: INodeProperties = {
	displayName: 'Item',
	name: 'item',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'The item to operate on',
	typeOptions: {
		loadOptionsDependsOn: ['site.value', 'list.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getItems',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1',
		},
	],
};

// FileLeafRef labels document-library items, where Title is empty.
type ItemEntry = { id?: string; fields?: { Title?: string; FileLeafRef?: string } };

/** Searches a list's items by label, paging through when a filter is typed. */
export async function getItems(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let endpoint = '';
	if (!paginationToken) {
		// In load-options contexts getNodeParameter's 2nd arg is a fallback, not an item index.
		const siteId = await resolveSiteId.call(this, 0);
		const list = String(this.getNodeParameter('list', 0, { extractValue: true }));
		endpoint = `/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(list)}/items`;
	}

	return await searchGraphCollection.call<
		ILoadOptionsFunctions,
		[CollectionSearchOptions<ItemEntry>],
		Promise<INodeListSearchResult>
	>(this, {
		endpoint,
		// Graph requires the nested form: fields($select=...), not select=Title.
		qs: { $expand: 'fields($select=Title,FileLeafRef)', $select: 'id,fields' },
		filter,
		paginationToken,
		toResult: (item) =>
			item.id
				? {
						// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty Title must fall back to FileLeafRef
						name: item.fields?.Title || item.fields?.FileLeafRef || String(item.id),
						value: String(item.id),
					}
				: null,
	});
}

type ItemsLookupReply = { value?: Array<{ id?: string | number }> };

/**
 * Finds the one item whose columns match the given values, or `undefined`
 * when zero or several items match — the caller decides what that means
 * (Update fails, Create or Update falls back to creating; both mirror v1).
 * Values are always compared as quoted strings, exactly like v1's filter.
 */
export async function lookupItemIdByColumns(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	siteId: string,
	listIdOrTitle: string,
	matchingColumns: string[],
	values: ResourceMapperValue['value'],
): Promise<string | undefined> {
	const response = (await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listIdOrTitle)}/items`,
		{},
		{
			$filter: matchingColumns
				.map((column) => odataFieldEqualsClause(column, values?.[column]))
				.join(' and '),
		},
		undefined,
		// SharePoint refuses to filter on non-indexed columns without this opt-in
		{ Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' },
	)) as ItemsLookupReply;

	if (response.value?.length === 1 && response.value[0].id !== undefined) {
		return String(response.value[0].id);
	}
	return undefined;
}

/**
 * Builds the body for a fields write from the resource-mapper value. The `id`
 * entry identifies the item and is never a field; hyperlink columns arrive as
 * two mapper fields (`{name}.Url`/`{name}.Description`, see list/columns.ts)
 * and are folded back into SharePoint's two-part shape.
 */
export function buildItemFieldsPayload(mapperValue: ResourceMapperValue): IDataObject {
	const fields: IDataObject = {};
	for (const [key, value] of Object.entries(mapperValue.value ?? {})) {
		if (key === 'id') {
			continue;
		}

		const dotIndex = key.lastIndexOf('.');
		const base = key.slice(0, dotIndex);
		const part = key.slice(dotIndex + 1);
		// Only a schema-confirmed hyperlink split is folded — a mapper key never
		// contains a dot otherwise (SharePoint encodes dots in internal names).
		if (
			dotIndex > 0 &&
			(part === 'Url' || part === 'Description') &&
			mapperValue.schema?.some((field) => field.id === `${base}.Url` && field.type === 'url')
		) {
			// Own properties only — an inherited read must not be reused as the base.
			const existing = Object.hasOwn(fields, base) ? fields[base] : undefined;
			const folded: IDataObject =
				typeof existing === 'object' && existing !== null && !Array.isArray(existing)
					? (existing as IDataObject)
					: {};
			folded[part] = value;
			// Column names are user-influenced — never use them as raw object keys
			setSafeObjectProperty(fields, base, folded);
			continue;
		}

		setSafeObjectProperty(fields, key, value);
	}
	return fields;
}
