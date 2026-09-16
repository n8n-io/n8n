import type {
	FieldType,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
	IRequestOptions,
	JsonObject,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import {
	isResourceLocatorValue,
	jsonParse,
	NodeApiError,
	NodeOperationError,
	setSafeObjectProperty,
} from 'n8n-workflow';

import type {
	GristColumn,
	GristColumns,
	GristCredentials,
	GristDefinedFields,
	GristFilterProperties,
	GristSortProperties,
	GristTable,
} from './types';

// A trailing slash or a trailing `/api` are both easy to paste in from a browser or the
// API docs. Request paths append `/api` themselves, so the base URL needs neither.
function normalizeBaseUrl(url: string): string {
	return url.replace(/\/$/, '').replace(/\/api$/, '');
}

// Fallback for API-key credentials created before the single `url` field: self-hosted
// instances stored a full URL, teams stored a subdomain. Defaults to the SaaS API host,
// which serves every hosted account.
function gristLegacyBaseUrl(credentials: GristCredentials): string {
	if (credentials.selfHostedUrl) {
		return normalizeBaseUrl(credentials.selfHostedUrl);
	}
	if (credentials.customSubdomain) {
		return `https://${credentials.customSubdomain}.getgrist.com`;
	}
	return 'https://api.getgrist.com';
}

// Resolve the Grist server base URL. Credentials store a single `url`; older ones fall
// back to their legacy fields.
export function gristBaseUrl(credentials: GristCredentials): string {
	if (credentials.url) {
		return normalizeBaseUrl(credentials.url);
	}
	return gristLegacyBaseUrl(credentials);
}

async function gristAuth(this: IExecuteFunctions | ILoadOptionsFunctions) {
	const authentication = this.getNodeParameter('authentication', 0, 'apiKey') as string;
	const isOAuth2 = authentication === 'oAuth2';
	const credentials = await this.getCredentials<GristCredentials>(
		isOAuth2 ? 'gristOAuth2Api' : 'gristApi',
	);
	return { isOAuth2, credentials };
}

export async function gristApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | number[] = {},
	qs: IDataObject = {},
) {
	const { isOAuth2, credentials } = await gristAuth.call(this);

	const options: IRequestOptions = {
		method,
		uri: `${gristBaseUrl(credentials)}/api${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	// The OAuth helper attaches its own Authorization header; the API key path sets one here.
	if (!isOAuth2) {
		options.headers = { Authorization: `Bearer ${credentials.apiKey}` };
	}

	try {
		if (isOAuth2) {
			return await this.helpers.requestOAuth2.call(this, 'gristOAuth2Api', options);
		}
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// As in Grist's `decodeUrl`: the document ID follows a `doc` key, or is a key of 12+ characters
// other than the two reserved pages of that length.
export function parseDocumentUrl(url: string): string | undefined {
	let parts: string[];
	try {
		parts = new URL(url).pathname.split('/').slice(1);
	} catch {
		return undefined;
	}
	for (let i = 0; i < parts.length; i += 2) {
		const key = parts[i];
		if (key === 'doc') return parts[i + 1] || undefined;
		if (key.length >= 12 && key !== 'forgot-password' && key !== 'site-settings') return key;
	}
	return undefined;
}

// Version 1 stores the document ID as a plain string.
export function getDocId(this: IExecuteFunctions | ILoadOptionsFunctions, docId: unknown): string {
	if (!isResourceLocatorValue(docId)) return String(docId ?? '');
	const value = String(docId.value ?? '');
	if (docId.mode !== 'url' || !value) return value;
	const id = parseDocumentUrl(value);
	if (!id) {
		throw new NodeOperationError(this.getNode(), 'The document URL is not valid', {
			description:
				'Use the address of a Grist document, such as https://docs.getgrist.com/utN3ysvktaDR/Sales',
		});
	}
	return id;
}

// In a load-options context, the second argument of `getNodeParameter` is the fallback value.
function getSelectedDocAndTable(this: ILoadOptionsFunctions) {
	return {
		docId: getDocId.call(this, this.getNodeParameter('docId', '')),
		tableId: this.getNodeParameter('tableId', '', { extractValue: true }) as string,
	};
}

export async function searchDocs(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const orgs = (await gristApiRequest.call(this, 'GET', '/orgs')) as
		| Array<{ id: number }>
		| undefined;
	// Keep the orgs that answer, so one unreadable org does not empty the list.
	const workspaces = await Promise.allSettled(
		(orgs ?? []).map(
			async (org) =>
				(await gristApiRequest.call(this, 'GET', `/orgs/${org.id}/workspaces`)) as
					| Array<{ docs?: Array<{ id: string; name?: string }> }>
					| undefined,
		),
	);
	// If no org answers, report the error. An empty list would look like an answer.
	const rejected = workspaces.filter(
		(org): org is PromiseRejectedResult => org.status === 'rejected',
	);
	if (workspaces.length && rejected.length === workspaces.length) {
		throw rejected[0].reason;
	}
	// Grist resolves /doc/<id> to wherever the document lives.
	const { credentials } = await gristAuth.call(this);
	const siteUrl = gristBaseUrl(credentials);
	const search = filter?.toLowerCase() ?? '';
	const results = workspaces
		.flatMap((org) => (org.status === 'fulfilled' ? (org.value ?? []) : []))
		.flatMap((workspace) => workspace?.docs ?? [])
		.map((doc) => ({ name: doc.name || doc.id, value: doc.id, url: `${siteUrl}/doc/${doc.id}` }))
		.filter((doc) => doc.name.toLowerCase().includes(search))
		.sort((a, b) => a.name.localeCompare(b.name));
	return { results };
}

export async function searchTables(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const { docId } = getSelectedDocAndTable.call(this);
	if (!docId) return { results: [] };
	const response = (await gristApiRequest.call(this, 'GET', `/docs/${docId}/tables`)) as
		| { tables?: Array<{ id: string }> }
		| undefined;
	const search = filter?.toLowerCase() ?? '';
	const results = (response?.tables ?? [])
		.filter((table) => table.id.toLowerCase().includes(search))
		.map((table) => ({ name: table.id, value: table.id }));
	return { results };
}

export async function getColumns(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	docId: string,
	tableId: string,
): Promise<GristColumn[]> {
	const endpoint = `/docs/${docId}/tables/${tableId}/columns`;
	const { columns } = (await gristApiRequest.call(this, 'GET', endpoint)) as GristColumns;
	return columns;
}

async function getSelectedTableColumns(this: ILoadOptionsFunctions): Promise<GristColumn[]> {
	const { docId, tableId } = getSelectedDocAndTable.call(this);
	if (!docId || !tableId) return [];
	return await getColumns.call(this, docId, tableId);
}

export async function getTableColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const columns = await getSelectedTableColumns.call(this);
	return columns.map(({ id, fields }) => ({ name: fields.label || id, value: id }));
}

// A new, empty column reports `isFormula` with no formula, and accepts writes.
function isFormulaColumn({ fields }: GristColumn): boolean {
	return fields.isFormula === true && Boolean(fields.formula);
}

// A column type can carry a suffix, as in `Ref:People` or `DateTime:UTC`.
function baseType({ fields }: GristColumn): string {
	return (fields.type ?? '').split(':')[0];
}

// Grist types without an entry here, such as Text, Ref and Any, map to `string`.
const FIELD_TYPES: Record<string, FieldType> = {
	Numeric: 'number',
	Int: 'number',
	Bool: 'boolean',
	Date: 'dateTime',
	DateTime: 'dateTime',
	ChoiceList: 'array',
	RefList: 'array',
	Attachments: 'array',
};

function isListColumn(column: GristColumn): boolean {
	return FIELD_TYPES[baseType(column)] === 'array';
}

// A Choice column keeps its choices in `widgetOptions`, as a JSON string.
function parseChoices(column: GristColumn): INodePropertyOptions[] {
	if (baseType(column) !== 'Choice') return [];
	const choices = jsonParse<{ choices?: unknown } | null>(column.fields.widgetOptions ?? '', {
		fallbackValue: null,
	})?.choices;
	if (!Array.isArray(choices)) return [];
	return choices
		.filter((choice): choice is string => typeof choice === 'string')
		.map((choice) => ({ name: choice, value: choice }));
}

function toMapperField(column: GristColumn): ResourceMapperField {
	const isFormula = isFormulaColumn(column);
	// A dropdown with no choices rejects every value, so such a column stays text.
	const options = parseChoices(column);
	return {
		id: column.id,
		displayName: column.fields.label || column.id,
		type: options.length ? 'options' : (FIELD_TYPES[baseType(column)] ?? 'string'),
		options: options.length ? options : undefined,
		required: false,
		defaultMatch: false,
		display: true,
		canBeUsedToMatch: true,
		readOnly: isFormula,
		removed: isFormula,
	};
}

export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const columns = await getSelectedTableColumns.call(this);
	return { fields: columns.map(toMapperField) };
}

// Update and upsert can match on the row ID.
export async function getMappingColumnsWithRowId(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const { fields } = await getMappingColumns.call(this);
	const rowId: ResourceMapperField = {
		id: 'id',
		displayName: 'Row ID',
		type: 'number',
		required: false,
		defaultMatch: true,
		display: true,
		canBeUsedToMatch: true,
		readOnly: true,
	};
	return { fields: [rowId, ...fields] };
}

export function describeTable(columns: GristColumn[]): GristTable {
	const ids = (predicate: (column: GristColumn) => boolean) =>
		new Set(columns.filter(predicate).map(({ id }) => id));
	return {
		columns: new Set(columns.map(({ id }) => id)),
		listColumns: ids(isListColumn),
		formulaColumns: ids(isFormulaColumn),
	};
}

// Grist rejects a write that sets `id` or a formula column.
export function splitRow(row: IDataObject, table: GristTable, matchingColumns: string[] = []) {
	const require: IDataObject = {};
	const fields: IDataObject = {};
	for (const [key, value] of Object.entries(row)) {
		if (matchingColumns.includes(key)) {
			// Grist matches a row ID only as a number.
			setSafeObjectProperty(require, key, key === 'id' ? Number(value) : value);
		} else if (key !== 'id' && !table.formulaColumns.has(key)) {
			setSafeObjectProperty(fields, key, value);
		}
	}
	return { require, fields };
}

// Grist stores a list as ['L', ...items]. Go by column type, because an item can itself be 'L'.
export function encodeRow(row: IDataObject, table: GristTable): IDataObject {
	const encoded: IDataObject = {};
	for (const [key, value] of Object.entries(row)) {
		const isList = table.listColumns.has(key) && Array.isArray(value);
		setSafeObjectProperty(encoded, key, isList ? ['L', ...value] : value);
	}
	return encoded;
}

export function decodeRow(row: IDataObject, table: GristTable): IDataObject {
	const decoded: IDataObject = {};
	for (const [key, value] of Object.entries(row)) {
		const isList = table.listColumns.has(key) && Array.isArray(value) && value[0] === 'L';
		setSafeObjectProperty(decoded, key, isList ? value.slice(1) : value);
	}
	return decoded;
}

export function parseSortProperties(sortProperties: GristSortProperties) {
	return sortProperties.reduce((acc, cur, curIdx) => {
		if (cur.direction === 'desc') acc += '-';
		acc += cur.field;
		if (curIdx !== sortProperties.length - 1) acc += ',';
		return acc;
	}, '');
}

export function isSafeInteger(val: number) {
	//used MIN_SAFE_INTEGER and MAX_SAFE_INTEGER instead of MIN_VALUE and MAX_VALUE to avoid edge cases
	return !isNaN(val) && val > Number.MIN_SAFE_INTEGER && val < Number.MAX_SAFE_INTEGER;
}

export function parseFilterProperties(filterProperties: GristFilterProperties) {
	return filterProperties.reduce<{ [key: string]: Array<string | number> }>((acc, cur) => {
		acc[cur.field] = acc[cur.field] ?? [];
		const values = isSafeInteger(Number(cur.values)) ? Number(cur.values) : cur.values;
		acc[cur.field].push(values);
		return acc;
	}, {});
}

export function parseDefinedFields(fieldsToSendProperties: GristDefinedFields) {
	return fieldsToSendProperties.reduce<{ [key: string]: string }>((acc, cur) => {
		acc[cur.fieldId] = cur.fieldValue;
		return acc;
	}, {});
}

export function parseAutoMappedInputs(incomingKeys: string[], inputsToIgnore: string[], item: any) {
	return incomingKeys.reduce<{ [key: string]: any }>((acc, curKey) => {
		if (inputsToIgnore.includes(curKey)) return acc;
		acc = { ...acc, [curKey]: item[curKey] };
		return acc;
	}, {});
}

export function throwOnZeroDefinedFields(this: IExecuteFunctions, fields: GristDefinedFields) {
	if (!fields?.length) {
		throw new NodeOperationError(
			this.getNode(),
			"No defined data found. Please specify the data to send in 'Fields to Send'.",
		);
	}
}
