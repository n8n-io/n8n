import type {
	FieldType,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodePropertyOptions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
	ResourceMapperFields,
} from 'n8n-workflow';
import {
	isSafeObjectProperty,
	NodeApiError,
	NodeOperationError,
	setSafeObjectProperty,
} from 'n8n-workflow';

import type {
	GristColumnSchema,
	GristCredentials,
	GristDefinedFields,
	GristFilterProperties,
	GristSortProperties,
} from './types';

export type GristRequestContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions;

// Fallback for API-key credentials created before the single `url` field: self-hosted
// instances stored a full URL, teams stored a subdomain. Defaults to the SaaS API host,
// which serves every hosted account.
function gristLegacyBaseUrl(credentials: GristCredentials): string {
	if (credentials.selfHostedUrl) {
		return credentials.selfHostedUrl.replace(/\/$/, '');
	}
	if (credentials.customSubdomain) {
		return `https://${credentials.customSubdomain}.getgrist.com`;
	}
	return 'https://api.getgrist.com';
}

// Resolve the Grist server base URL for either credential type. Credentials store a
// single `url`; older ones fall back to their legacy fields.
export function gristBaseUrl(credentials: GristCredentials): string {
	if (credentials.url) {
		return credentials.url.replace(/\/$/, '');
	}
	return gristLegacyBaseUrl(credentials);
}

export async function gristApiRequest(
	this: GristRequestContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | number[] = {},
	qs: IDataObject = {},
) {
	const authentication = this.getNodeParameter('authentication', 0) as string;
	const credentialsType = authentication === 'oAuth2' ? 'gristOAuth2Api' : 'gristApi';
	const credentials = await this.getCredentials<GristCredentials>(credentialsType);

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

	try {
		if (authentication === 'oAuth2') {
			return await this.helpers.requestOAuth2.call(this, 'gristOAuth2Api', options);
		}
		options.headers = { Authorization: `Bearer ${credentials.apiKey}` };
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// docId/tableId are resource locators; reading them with `extractValue` returns the underlying ID
// for both the locator object and any legacy plain-string value stored by older workflows.
//
// Two helpers, because `getNodeParameter`'s signature differs by context: call the one matching the
// caller's context, or `extractValue` lands in the wrong arg slot and is silently dropped (leaking
// the raw locator object instead of the ID).

// Load-options / list-search / hook context: no item index.
export function getResourceId(
	this: ILoadOptionsFunctions | IHookFunctions,
	name: 'docId' | 'tableId',
): string {
	return this.getNodeParameter(name, undefined, { extractValue: true }) as string;
}

// Execute context: takes an item index.
export function getExecResourceId(
	this: IExecuteFunctions,
	name: 'docId' | 'tableId',
	itemIndex: number,
): string {
	return this.getNodeParameter(name, itemIndex, undefined, { extractValue: true }) as string;
}

// List the user's documents for the Document resource-locator, walking orgs → workspaces → docs.
export async function searchDocs(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const orgs = (await gristApiRequest.call(this, 'GET', '/orgs')) as Array<{ id: number }>;
	// One request per org returns that org's workspaces with their docs inlined; the orgs are
	// independent, so fetch them concurrently (no per-workspace requests).
	const workspacesPerOrg = await Promise.all(
		orgs.map(
			async (org) =>
				(await gristApiRequest.call(this, 'GET', `/orgs/${org.id}/workspaces`)) as Array<{
					docs?: Array<{ id: string; name: string }>;
				}>,
		),
	);
	const results: INodeListSearchItems[] = [];
	for (const workspaces of workspacesPerOrg) {
		for (const workspace of workspaces) {
			for (const doc of workspace.docs ?? []) {
				results.push({ name: doc.name, value: doc.id });
			}
		}
	}
	const filtered = filter
		? results.filter((r) => r.name.toLowerCase().includes(filter.toLowerCase()))
		: results;
	filtered.sort((a, b) => a.name.localeCompare(b.name));
	return { results: filtered };
}

// List the tables in the selected document for the Table resource-locator.
export async function searchTables(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const docId = getResourceId.call(this, 'docId');
	if (!docId) return { results: [] };
	const { tables } = (await gristApiRequest.call(this, 'GET', `/docs/${docId}/tables`)) as {
		tables: Array<{ id: string }>;
	};
	// A table's display title (which defaults to its ID) lives on its raw view section and isn't
	// returned by the /tables endpoint, so we show the stable table ID as both label and value.
	const results: INodeListSearchItems[] = tables
		.filter((t) => !filter || t.id.toLowerCase().includes(filter.toLowerCase()))
		.map((t) => ({ name: t.id, value: t.id }));
	return { results };
}

// Fetch the column schema (id + label/type/formula) for the configured doc/table, or [] until both
// are chosen. Shared by the column option-list methods below.
async function fetchColumnSchema(
	this: ILoadOptionsFunctions,
): Promise<GristColumnSchema['columns']> {
	const docId = getResourceId.call(this, 'docId');
	const tableId = getResourceId.call(this, 'tableId');
	// Nothing to load (and nothing to error about) until both are chosen.
	if (!docId || !tableId) return [];
	const { columns } = (await gristApiRequest.call(
		this,
		'GET',
		`/docs/${docId}/tables/${tableId}/columns`,
	)) as GristColumnSchema;
	return columns;
}

// All columns, labelled by their display name (falling back to the id, which stays the value).
export async function getTableColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const columns = await fetchColumnSchema.call(this);
	return columns.map(({ id, fields }) => ({ name: fields.label ?? id, value: id }));
}

// Candidate "ready" columns for the trigger: only Bool/Any can act as a readiness toggle.
export async function getReadyColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const columns = await fetchColumnSchema.call(this);
	return columns
		.filter(
			({ id, fields }) => !isHiddenColumn(id) && (fields.type === 'Bool' || fields.type === 'Any'),
		)
		.map(({ id, fields }) => ({ name: fields.label ?? id, value: id }));
}

// Grist column types may carry a suffix, e.g. `Ref:Table1` or `DateTime:UTC`,
// so we match on the prefix before the colon.
function mapGristColumnType(gristType?: string): FieldType {
	const baseType = (gristType ?? '').split(':')[0];
	switch (baseType) {
		case 'Numeric':
		case 'Int':
			return 'number';
		case 'Bool':
			return 'boolean';
		case 'Date':
		case 'DateTime':
			return 'dateTime';
		case 'Choice':
			return 'options';
		case 'ChoiceList':
		case 'RefList':
		case 'Attachments':
			return 'array';
		default:
			// Text, Ref, Any and anything unrecognized map to string.
			return 'string';
	}
}

function isHiddenColumn(id: string): boolean {
	return id === 'manualSort' || id.startsWith('gristHelper_');
}

export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	// fetchColumnSchema returns [] until a doc/table is chosen; the field's `hideNoDataError`
	// keeps the UI quiet in that empty state.
	const columns = await fetchColumnSchema.call(this);

	const fields = columns
		.filter(({ id }) => !isHiddenColumn(id))
		.map(({ id, fields: col }) => ({
			id,
			displayName: col.label ?? id,
			type: mapGristColumnType(col.type),
			// Only real formula columns are read-only. An empty column (Grist's "undecided" state)
			// also reports isFormula:true but with an empty formula, and must stay writable — as must
			// trigger formulas (isFormula:false with a formula).
			readOnly: col.isFormula === true && (col.formula ?? '') !== '',
			required: false,
			defaultMatch: false,
			display: true,
			canBeUsedToMatch: true,
		}));

	return { fields };
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
		// `field` is a user-chosen column name; route the dynamic-key write through the safe helpers
		// so a value like `__proto__` can't pollute the prototype chain.
		if (!isSafeObjectProperty(cur.field)) return acc;
		if (acc[cur.field] === undefined) setSafeObjectProperty(acc, cur.field, []);
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
