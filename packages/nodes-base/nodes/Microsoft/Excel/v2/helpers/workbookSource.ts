import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { isSafeObjectProperty } from 'n8n-workflow';

import { microsoftApiRequest, microsoftApiRequestAllItems } from '../transport';

export const WORKBOOK_FILE_EXTENSIONS = ['.xlsx', '.xlsm', '.xltx', '.xltm'];
const FILE_TYPE_QUERY = '(filetype:xlsx OR filetype:xlsm OR filetype:xltx OR filetype:xltm)';

/** A workbook found in some drive. `driveId` is empty for the user's own OneDrive. */
export type WorkbookListItem = {
	id: string;
	driveId: string;
	name: string;
	webUrl?: string;
	/** The raw Graph object, returned as-is by the Get Workbooks operation. */
	resource: IDataObject;
};

function isExcelName(name: unknown): name is string {
	return (
		typeof name === 'string' &&
		WORKBOOK_FILE_EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension))
	);
}

export function stripWorkbookExtension(name: string): string {
	for (const extension of WORKBOOK_FILE_EXTENSIONS) {
		if (name.toLowerCase().endsWith(extension)) {
			return name.slice(0, -extension.length);
		}
	}
	return name;
}

/** The node version from which new workbook nodes default to searching everywhere. */
const EVERYTHING_DEFAULT_VERSION = 2.3;

/**
 * Decide which Source to use. The Source lives in the collapsible options, so most
 * nodes leave it unset; the effective default is then chosen by node version.
 * Existing nodes (< 2.3) keep listing the user's own OneDrive, exactly as before,
 * while new nodes default to searching everywhere.
 */
export function resolveWorkbookSource(explicit: unknown, typeVersion: number): string {
	if (typeof explicit === 'string' && explicit !== '') return explicit;
	return typeVersion >= EVERYTHING_DEFAULT_VERSION ? 'all' : 'oneDrive';
}

/**
 * Read the Source the workbook picker should list. It sits inside whichever options
 * collection the current operation has, so check each known collection name.
 */
export function getWorkbookSourceForPicker(ctx: ILoadOptionsFunctions): string {
	for (const collection of ['options', 'filters', 'additionalFields']) {
		let value: IDataObject = {};
		try {
			value = (ctx.getNodeParameter(collection, {}) ?? {}) as IDataObject;
		} catch {
			continue;
		}
		if (typeof value === 'object' && typeof value.workbookSource === 'string') {
			return value.workbookSource;
		}
	}
	return resolveWorkbookSource(undefined, ctx.getNode().typeVersion ?? 0);
}

/**
 * List workbooks for the chosen Source. `oneDrive` reproduces the original
 * personal-OneDrive search (plain item id, resolved to /me/drive downstream); the
 * other sources are found via Microsoft Search and return items keyed by their own
 * drive so the value can carry "{driveId}/{itemId}".
 */
export async function fetchWorkbookList(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	source: string,
	opts: { filter?: string; paginationToken?: string; size?: number } = {},
): Promise<{ items: WorkbookListItem[]; paginationToken?: string }> {
	const { filter, paginationToken, size = 100 } = opts;

	if (source === 'sharePoint' || source === 'all') {
		const from = paginationToken ? Number(paginationToken) : 0;
		const queryString = filter ? `${filter} ${FILE_TYPE_QUERY}` : FILE_TYPE_QUERY;

		const response: IDataObject = await microsoftApiRequest.call(this, 'POST', '/search/query', {
			requests: [{ entityTypes: ['driveItem'], query: { queryString }, from, size }],
		});

		const hitsContainer = (
			(((response.value as IDataObject[]) ?? [])[0] as IDataObject)?.hitsContainers as IDataObject[]
		)?.[0] as IDataObject | undefined;
		const rawHits = (hitsContainer?.hits as IDataObject[]) ?? [];

		const items = rawHits
			.map((hit) => hit.resource as IDataObject)
			.filter((resource) => isExcelName(resource?.name))
			.filter((resource) => {
				if (source !== 'sharePoint') return true;
				// SharePoint sites only: drop personal-OneDrive hits, whose web URL is
				// served from the "-my.sharepoint.com" host.
				const webUrl = ((resource.webUrl as string) ?? '').toLowerCase();
				return webUrl.includes('.sharepoint.com') && !webUrl.includes('-my.sharepoint.com');
			})
			.map((resource) => ({
				id: resource.id as string,
				driveId: ((resource.parentReference as IDataObject)?.driveId ?? '') as string,
				name: resource.name as string,
				webUrl: resource.webUrl as string | undefined,
				resource,
			}));

		const moreAvailable = hitsContainer?.moreResultsAvailable === true;
		return { items, paginationToken: moreAvailable ? String(from + rawHits.length) : undefined };
	}

	// oneDrive (default): the original personal-OneDrive search.
	const q = filter || WORKBOOK_FILE_EXTENSIONS.join(' OR ');
	const response: IDataObject = paginationToken
		? await microsoftApiRequest.call(this, 'GET', '', undefined, undefined, paginationToken)
		: await microsoftApiRequest.call(this, 'GET', `/drive/root/search(q='${q}')`, undefined, {
				select: 'id,name,webUrl',
				$top: size,
			});

	const items = ((response.value as IDataObject[]) ?? [])
		.filter((resource) => isExcelName(resource.name))
		.map((resource) => ({
			id: resource.id as string,
			driveId: '',
			name: resource.name as string,
			webUrl: resource.webUrl as string | undefined,
			resource,
		}));

	return { items, paginationToken: response['@odata.nextLink'] as string | undefined };
}

// The personal-OneDrive listing keeps the node's original behavior byte for byte
// (`.xlsx` only, $select-based field projection). It deliberately does NOT reuse
// fetchWorkbookList's oneDrive branch above, which searches all workbook extensions
// and projects fields differently, so existing workflows keep seeing the same output.
const PERSONAL_ONEDRIVE_SEARCH = "/drive/root/search(q='.xlsx')";

/** Keep only the requested top-level fields (safe against prototype-polluting keys). */
function projectFields(resource: IDataObject, fields: string[]): IDataObject {
	const projected: IDataObject = {};
	for (const field of fields) {
		if (isSafeObjectProperty(field) && field in resource) {
			projected[field] = resource[field];
		}
	}
	return projected;
}

/** Parse the comma-separated "Fields" filter into a trimmed list (undefined when unset). */
function parseFieldList(fields: unknown): string[] | undefined {
	if (typeof fields !== 'string' || fields === '') return undefined;
	return fields
		.split(',')
		.map((field) => field.trim())
		.filter((field) => field !== '');
}

/**
 * List workbooks from the user's personal OneDrive for the Get Workbooks operation
 * (the node's original behavior).
 */
export async function fetchPersonalOneDriveWorkbooks(
	this: IExecuteFunctions,
	options: { returnAll: boolean; limit: number; fields?: string },
): Promise<IDataObject[]> {
	const qs: IDataObject = {};
	if (options.fields) {
		qs.$select = options.fields;
	}

	if (options.returnAll) {
		return (await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			PERSONAL_ONEDRIVE_SEARCH,
			{},
			qs,
		)) as IDataObject[];
	}

	qs.$top = options.limit;
	const responseData = await microsoftApiRequest.call(
		this,
		'GET',
		PERSONAL_ONEDRIVE_SEARCH,
		{},
		qs,
	);
	return (responseData.value as IDataObject[]) ?? [];
}

/**
 * List workbooks for a wider source (SharePoint / Everything) for the Get Workbooks
 * operation, paging through Microsoft Search until the limit is reached.
 */
export async function collectWorkbooksFromSearch(
	this: IExecuteFunctions,
	source: string,
	options: { limit: number; fields?: string },
): Promise<IDataObject[]> {
	const fields = parseFieldList(options.fields);
	const workbooks: IDataObject[] = [];

	let paginationToken: string | undefined;
	do {
		const { items, paginationToken: next } = await fetchWorkbookList.call(this, source, {
			paginationToken,
			size: 100,
		});
		for (const item of items) {
			workbooks.push(fields ? projectFields(item.resource, fields) : item.resource);
			if (workbooks.length >= options.limit) break;
		}
		paginationToken = next;
	} while (paginationToken && workbooks.length < options.limit);

	return workbooks;
}
