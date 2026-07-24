import type { ILoadOptionsFunctions, INodePropertyOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { DATAVERSE_API_PATH } from './constants';
import { dataverseApiRequestRaw, type DataverseQuery } from './GenericFunctions';

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
	DisplayName?: {
		UserLocalizedLabel?: { Label?: string };
	};
}

interface AttributeDefinition {
	LogicalName: string;
	AttributeOf?: string | null;
	IsValidForRead?: boolean;
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

async function dataverseGet<T>(
	ctx: ILoadOptionsFunctions,
	path: string,
	qs: DataverseQuery = {},
): Promise<T> {
	try {
		// Delegate base-URL resolution, OData headers, User-Agent, and
		// transient-failure retries to the shared request helper. We use the
		// `Raw` variant so the original upstream error reaches our own
		// extraction below instead of being pre-wrapped in a NodeApiError.
		return (await dataverseApiRequestRaw(
			ctx,
			'GET',
			path,
			{},
			qs,
			{},
			'microsoftDataverseOAuth2Api',
		)) as T;
	} catch (error) {
		// n8n's `requestWithAuthentication` wraps the upstream HTTP failure in
		// its own envelope. The real Dataverse text can live in any of:
		//   - `error.description` — n8n's own NodeApiError text field, which
		//     usually holds the parsed upstream error message.
		//   - `error.cause.response.body` — axios envelope when the wrapper is
		//     the wrapping NodeApiError thrown by request-helper-functions.
		//   - `error.response.body` — older n8n shape.
		// Crucially, n8n sets `error.message = "Bad request - please check your
		// parameters"` for any 4xx, which is useless on its own. And Dataverse
		// metadata endpoints can return the OData v3 `message: { lang, value }`
		// shape, which would render as "[object Object]" if interpolated raw.
		const { status, dvCode, dvMessage } = extractDataverseError(error);
		const prefix = `Failed to load options from Dataverse${status ? ` (HTTP ${status})` : ''}`;
		const codePart = dvCode ? ` [${dvCode}]` : '';
		throw new NodeApiError(ctx.getNode(), error as JsonObject, {
			message: `${prefix}${codePart}: ${dvMessage}`,
			description: `GET ${DATAVERSE_API_PATH}${path}`,
		});
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
	const entitySet = String(this.getCurrentNodeParameter('entitySet') ?? '').trim();
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
		{ $select: 'LogicalName,DisplayName,AttributeOf,IsValidForRead' },
	);
	const options: INodePropertyOptions[] = [];
	for (const attr of attrs.value ?? []) {
		// Skip virtual sub-attributes (e.g. <lookup>name, <lookup>yominame) —
		// they have an AttributeOf set and aren't queryable in their own right.
		if (attr.AttributeOf) continue;
		if (attr.IsValidForRead === false) continue;
		const label = labelOf(attr) ?? attr.LogicalName;
		options.push({ name: `${label} (${attr.LogicalName})`, value: attr.LogicalName });
	}
	options.sort((a, b) => a.name.localeCompare(b.name));
	return options;
}
