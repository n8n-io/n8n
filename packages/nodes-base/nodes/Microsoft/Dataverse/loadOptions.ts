import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { DATAVERSE_API_PATH } from './constants';
import {
	dataverseApiRequestRaw,
	type DataverseHeaders,
	type DataverseQuery,
} from './GenericFunctions';

/**
 * `loadOptions` handlers for the Dataverse node. These power the in-editor
 * pickers (tables and columns) so users don't have to memorize entity-set
 * names or column logical names.
 *
 * Each handler makes one or more authenticated GET requests against the Dataverse Web
 * API metadata endpoints and returns the result as `{ name, value }`
 * options. n8n caches the result per parameter, so the request only runs
 * when the user opens the dropdown or when a dependent parameter changes.
 *
 * Failures are re-thrown as `NodeApiError` so the editor surfaces the real
 * HTTP error in the dropdown (auth, scope, environment URL, ...) instead of
 * silently rendering an empty list — which is indistinguishable from a
 * table with no entities.
 */

interface EntityDefinition {
	LogicalName: string;
	EntitySetName: string | null;
	PrimaryIdAttribute?: string;
	PrimaryNameAttribute?: string;
	DisplayName?: {
		UserLocalizedLabel?: { Label?: string };
	};
}

interface AttributeDefinition {
	LogicalName: string;
	AttributeOf?: string | null;
	IsValidForRead?: boolean;
	AttributeType?: string;
	DisplayName?: {
		UserLocalizedLabel?: { Label?: string };
	};
}

interface ODataCollection<T> {
	value: T[];
}

function labelOf(def: { DisplayName?: { UserLocalizedLabel?: { Label?: string } } }):
	| string
	| null {
	// Treat blank / whitespace labels as missing so the caller falls through
	// to the LogicalName rather than rendering an ugly `" (accounts)"`.
	const raw = def.DisplayName?.UserLocalizedLabel?.Label;
	if (typeof raw !== 'string') return null;
	const trimmed = raw.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function parameterValue(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'object' && value !== null && 'value' in value) {
		return typeof value.value === 'string' ? value.value.trim() : '';
	}
	return '';
}

async function dataverseGet<T>(
	ctx: ILoadOptionsFunctions,
	path: string,
	qs: DataverseQuery = {},
	headers: DataverseHeaders = {},
): Promise<T> {
	try {
		// Delegate base-URL resolution, OData headers, User-Agent, and
		// transient-failure retries to the shared request helper. The `Raw` variant
		// skips the extra NodeApiError wrap that `dataverseApiRequest` adds, but
		// `httpRequestWithAuthentication` still pre-wraps the failure in one; we
		// unwrap it below so our extracted message survives.
		return (await dataverseApiRequestRaw(
			ctx,
			'GET',
			path,
			{},
			qs,
			headers,
			'microsoftDataverseOAuth2Api',
		)) as T;
	} catch (error) {
		// `httpRequestWithAuthentication` wraps the upstream HTTP failure in a
		// NodeApiError. The real Dataverse text can live in any of:
		//   - `error.description` — n8n's own NodeApiError text field, which
		//     usually holds the parsed upstream error message.
		//   - `error.cause.response.body` — axios envelope under the wrapper.
		//   - `error.response.body` — older n8n shape.
		// Crucially, n8n sets `error.message = "Bad request - please check your
		// parameters"` for any 4xx, which is useless on its own. And Dataverse
		// metadata endpoints can return the OData v3 `message: { lang, value }`
		// shape, which would render as "[object Object]" if interpolated raw.
		const { status, dvCode, dvMessage } = extractDataverseError(error);
		const prefix = `Failed to load options from Dataverse${status ? ` (HTTP ${status})` : ''}`;
		const codePart = dvCode ? ` [${dvCode}]` : '';
		const message = `${prefix}${codePart}: ${dvMessage}`;
		const description = `GET ${DATAVERSE_API_PATH}${path}`;
		// The failure is already a NodeApiError; its constructor short-circuits when
		// re-wrapped (ignoring message/description), so mutate it in place instead.
		if (error instanceof NodeApiError) {
			error.message = message;
			error.description = description;
			throw error;
		}
		throw new NodeApiError(ctx.getNode(), error as JsonObject, { message, description });
	}
}

/**
 * Drill through n8n's HTTP wrapper, axios's response envelope, and
 * Dataverse's two error-body shapes (v9.x string-message vs legacy
 * v3 object-message) to recover the actual `(httpStatus, errorCode,
 * humanMessage)` triple. Always returns strings — never an object — so
 * the caller can interpolate without producing "[object Object]".
 */
function extractDataverseError(error: unknown): {
	status: string;
	dvCode: string;
	dvMessage: string;
} {
	const err = error as {
		message?: unknown;
		description?: unknown;
		statusCode?: number | string;
		httpCode?: number | string;
		cause?: {
			response?: { body?: unknown; statusCode?: number };
			statusCode?: number;
			body?: unknown;
		};
		response?: { body?: unknown; statusCode?: number };
	};
	const status = String(
		err.httpCode ?? err.statusCode ?? err.cause?.statusCode ?? err.response?.statusCode ?? '',
	);
	// Walk every place a Dataverse JSON body could live.
	const candidates: unknown[] = [
		err.response?.body,
		err.cause?.response?.body,
		err.cause?.body,
		(err as { error?: unknown }).error,
	];
	for (const body of candidates) {
		const parsed = parseDvBody(body);
		if (parsed.message) return { status, dvCode: parsed.code, dvMessage: parsed.message };
	}
	// n8n's NodeApiError populates `.description` with the upstream error text
	// even when the body isn't reachable via response/cause (e.g. it pre-parsed
	// and discarded the body). Treat the wrapper's own message as a last resort.
	if (typeof err.description === 'string' && err.description) {
		return { status, dvCode: '', dvMessage: err.description };
	}
	const fallback = typeof err.message === 'string' ? err.message : safeStringify(err.message);
	return { status, dvCode: '', dvMessage: fallback || 'unknown error' };
}

function parseDvBody(body: unknown): { code: string; message: string } {
	if (!body) return { code: '', message: '' };
	let obj: { error?: { code?: string; message?: unknown }; message?: unknown } | undefined;
	if (typeof body === 'string') {
		// Body might be a raw JSON string n8n didn't parse.
		try {
			obj = JSON.parse(body) as typeof obj;
		} catch {
			return { code: '', message: body };
		}
	} else if (typeof body === 'object') {
		obj = body as typeof obj;
	}
	if (!obj) return { code: '', message: '' };
	const code = obj.error?.code ?? '';
	const rawMessage = obj.error?.message ?? obj.message;
	let message = '';
	if (typeof rawMessage === 'string') {
		message = rawMessage;
	} else if (rawMessage && typeof rawMessage === 'object') {
		// Legacy OData v3 shape: { lang, value }
		const v = (rawMessage as { value?: unknown }).value;
		if (typeof v === 'string') message = v;
		else message = safeStringify(rawMessage);
	}
	return { code: String(code ?? ''), message };
}

function safeStringify(value: unknown): string {
	if (value === undefined || value === null) return '';
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

/**
 * List every Dataverse table the user is likely to want to interact with.
 *
 * We deliberately keep the server-side `$filter` to simple primitive
 * Booleans only (`IsIntersect`, `IsLogicalEntity`, `IsPrivate`) — Dataverse
 * environments differ in whether they accept `$filter` against complex
 * managed-properties such as `IsValidForAdvancedFind/Value` and several
 * environments return 400 Bad Request for that shape. Everything else
 * (entities without an EntitySetName, system audit/sync tables, etc.) is
 * filtered client-side.
 *
 * Note: the Dataverse metadata API (`EntityDefinitions`) does NOT support
 * `$top`, `$skip`, `$count`, `$orderby`, `$search`, or `$apply` — only
 * `$select`, `$filter`, and `$expand`. Asking for `$top=500` returns
 * `400 Bad Request: "The query parameter $top is not supported"`. We
 * therefore fetch the full filtered set and sort it client-side.
 *
 * The dropdown is sorted by display name to match the n8n editor's other
 * table pickers (Airtable, Postgres, etc.). The full filtered set is
 * returned — the `$select` projection keeps each row tiny (3 fields), so
 * even large environments (800+ tables) stay well within a manageable
 * payload.
 */
export async function getEntitySets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = await dataverseGet<ODataCollection<EntityDefinition>>(
		this,
		'/EntityDefinitions',
		{
			// Only project fields we actually consume client-side. The three
			// `Is*` booleans are filtered server-side via `$filter`, so there's
			// no reason to ship them back over the wire.
			$select: 'LogicalName,EntitySetName,DisplayName',
			$filter: 'IsIntersect eq false and IsLogicalEntity eq false and IsPrivate eq false',
		},
	);
	const options: INodePropertyOptions[] = [];
	for (const def of response.value ?? []) {
		if (!def.EntitySetName) continue;
		const label = labelOf(def) ?? def.LogicalName;
		options.push({
			name: `${label} (${def.EntitySetName})`,
			value: def.EntitySetName,
			description: `Logical name: ${def.LogicalName}`,
		});
	}
	options.sort((a, b) => a.name.localeCompare(b.name));
	return options;
}

export async function searchEntitySets(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const filterLower = filter?.trim().toLowerCase();
	const options = await getEntitySets.call(this);
	const results = options
		.filter((option) => !filterLower || option.name.toLowerCase().includes(filterLower))
		.map(({ name, value }) => ({ name, value }));
	return { results };
}

export async function searchRows(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const entitySet = parameterValue(this.getCurrentNodeParameter('entitySet'));
	if (!entitySet) return { results: [] };

	// Resolve the primary id/name attributes used to map rows. Runs on every
	// invocation, including each pagination page: the nextLink is opaque to us, so
	// we can't thread these through it — one extra metadata GET per page.
	const metadata = await dataverseGet<ODataCollection<EntityDefinition>>(
		this,
		'/EntityDefinitions',
		{
			$select: 'PrimaryIdAttribute,PrimaryNameAttribute',
			$filter: `EntitySetName eq '${entitySet.replace(/'/g, "''")}'`,
		},
	);
	const { PrimaryIdAttribute: idAttribute, PrimaryNameAttribute: nameAttribute } =
		metadata.value?.[0] ?? {};
	if (!idAttribute) return { results: [] };

	// `Prefer: odata.maxpagesize` gives server-driven paging with an
	// `@odata.nextLink`, unlike `$top`, which hard-caps the result set with no
	// continuation and silently hides rows past the cap.
	const pageHeaders: DataverseHeaders = { Prefer: 'odata.maxpagesize=100' };
	type RowPage = ODataCollection<Record<string, unknown>> & { '@odata.nextLink'?: string };
	let response: RowPage;
	if (paginationToken) {
		// The nextLink already encodes `$select`/`$filter` and the page cursor.
		response = await dataverseGet<RowPage>(this, paginationToken, {}, pageHeaders);
	} else {
		const qs: DataverseQuery = {
			$select: nameAttribute ? `${idAttribute},${nameAttribute}` : idAttribute,
		};
		const trimmedFilter = filter?.trim();
		if (trimmedFilter && nameAttribute) {
			qs.$filter = `contains(${nameAttribute},'${trimmedFilter.replace(/'/g, "''")}')`;
		}
		response = await dataverseGet<RowPage>(this, `/${entitySet}`, qs, pageHeaders);
	}

	const results = (response.value ?? []).flatMap((row) => {
		const id = row[idAttribute];
		if (typeof id !== 'string' || !id) return [];
		const name = nameAttribute ? row[nameAttribute] : undefined;
		return [{ name: typeof name === 'string' && name ? `${name} (${id})` : id, value: id }];
	});
	const nextLink = response['@odata.nextLink'];
	return typeof nextLink === 'string' && nextLink
		? { results, paginationToken: nextLink }
		: { results };
}

/**
 * List columns for the currently-selected table. Requires the caller to set
 * `loadOptionsDependsOn: ['entitySet']` so the picker reloads when the user
 * changes tables.
 *
 * The current `entitySet` parameter holds the plural URL name (e.g.
 * `accounts`). The Dataverse metadata API addresses tables by their singular
 * `LogicalName`, so we look up the LogicalName first, then request
 * attributes. Two short metadata calls.
 */
export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const entitySet = parameterValue(this.getCurrentNodeParameter('entitySet'));
	if (!entitySet) return [];
	// `EntitySetName eq '<value>'` — the single quotes are OData literal
	// syntax (not URL syntax), so they go in the value verbatim. The HTTP
	// layer URL-encodes spaces/quotes; do not pre-encode.
	const lookup = await dataverseGet<ODataCollection<{ LogicalName: string }>>(
		this,
		'/EntityDefinitions',
		{
			$select: 'LogicalName',
			$filter: `EntitySetName eq '${entitySet.replace(/'/g, "''")}'`,
		},
	);
	const logicalName = lookup.value?.[0]?.LogicalName;
	if (!logicalName) return [];
	// Logical names are restricted to [a-z0-9_], so no encoding needed for the
	// path segment; the HTTP layer encodes the single quotes around it.
	const attrs = await dataverseGet<ODataCollection<AttributeDefinition>>(
		this,
		`/EntityDefinitions(LogicalName='${logicalName}')/Attributes`,
		{ $select: 'LogicalName,DisplayName,AttributeOf,IsValidForRead,AttributeType' },
	);
	const options: INodePropertyOptions[] = [];
	for (const attr of attrs.value ?? []) {
		// Skip virtual sub-attributes (e.g. <lookup>name, <lookup>yominame) —
		// they have an AttributeOf set and aren't queryable in their own right.
		if (attr.AttributeOf) continue;
		if (attr.IsValidForRead === false) continue;
		const label = labelOf(attr) ?? attr.LogicalName;
		// Lookup columns (incl. Customer/Owner) can't be written by logical name —
		// the node rewrites them to @odata.bind. Flag them so users understand the
		// column behaves differently from a plain value column.
		const isLookup =
			attr.AttributeType === 'Lookup' ||
			attr.AttributeType === 'Customer' ||
			attr.AttributeType === 'Owner';
		const name = isLookup
			? `${label} (${attr.LogicalName}) — lookup`
			: `${label} (${attr.LogicalName})`;
		options.push({ name, value: attr.LogicalName });
	}
	options.sort((a, b) => a.name.localeCompare(b.name));
	return options;
}
