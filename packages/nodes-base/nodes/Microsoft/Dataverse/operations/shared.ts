// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type { IDataObject, IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	dataverseApiRequest,
	dataverseApiRequestAllItems,
	type DataverseHeaders,
	type DataverseQuery,
} from '../GenericFunctions';

/**
 * Names of OData system query options accepted by the Dataverse Web API in the
 * shape this module supports. Mirrors the dv connector (Power Automate) param
 * surface: `$select`, `$filter`, `$orderby`, `$expand`, `$top`, `$skiptoken`.
 */
export type ODataOptionKey = 'select' | 'filter' | 'orderby' | 'expand' | 'top' | 'skiptoken';

const OPTION_TO_QS: Record<ODataOptionKey, string> = {
	select: '$select',
	filter: '$filter',
	orderby: '$orderby',
	expand: '$expand',
	top: '$top',
	skiptoken: '$skiptoken',
};

/**
 * Translate an options bag from the node UI into a Dataverse query string.
 *
 * Empty strings, undefined, and null values are dropped so the URL stays clean
 * and the server doesn't see stray `?$select=` parameters. Numeric values are
 * preserved so `$top` works.
 *
 * ```ts
 * buildODataQs({ select: 'name', filter: 'statecode eq 0' })
 * // → { $select: 'name', $filter: 'statecode eq 0' }
 * ```
 */
export function buildODataQs(options: Partial<Record<ODataOptionKey, unknown>>): DataverseQuery {
	const qs: DataverseQuery = {};
	for (const key of Object.keys(OPTION_TO_QS) as ODataOptionKey[]) {
		const value = options[key];
		if (value === undefined || value === null || value === '') continue;
		if (Array.isArray(value)) {
			if (value.length === 0) continue;
			qs[OPTION_TO_QS[key]] = value.join(',');
			continue;
		}
		qs[OPTION_TO_QS[key]] = value as string | number;
	}
	return qs;
}

/**
 * Two-mode item input — matches the dv connector's "Row Item" dynamic field
 * while staying ergonomic in n8n:
 *
 * - **JSON** (default): the user pastes / templates a record object.
 * - **Fields**: the user adds rows of `{ name, value }` pairs via a
 *   `fixedCollection`.
 *
 * `value` strings are kept as-is so users can template lookup bindings
 * (`accountid@odata.bind`) without us mangling them.
 */
export interface FieldsCollection {
	field?: Array<{ name: string; value: unknown }>;
}

export function parseItemInput(ctx: IExecuteFunctions, itemIndex: number): IDataObject {
	const mode = (ctx.getNodeParameter('inputMode', itemIndex, 'json') as string) ?? 'json';

	if (mode === 'fields') {
		const raw = ctx.getNodeParameter('fieldsCollection', itemIndex, {}) as FieldsCollection;
		const out: IDataObject = {};
		for (const entry of raw.field ?? []) {
			if (!entry || !entry.name) continue;
			out[entry.name] = entry.value as IDataObject[string];
		}
		return out;
	}

	// JSON mode
	const raw = ctx.getNodeParameter('fieldsJson', itemIndex, {}) as string | IDataObject;
	if (raw === undefined || raw === null || raw === '') return {};
	if (typeof raw === 'object') return raw as IDataObject;
	try {
		const parsed = JSON.parse(raw as string);
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Parameter "fieldsJson" must be a JSON object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}`,
				{ itemIndex },
			);
		}
		return parsed as IDataObject;
	} catch (err) {
		// Already a NodeOperationError thrown by the validation above — re-throw as-is so the original itemIndex / message survive.
		if (err instanceof NodeOperationError) throw err;
		throw new NodeOperationError(ctx.getNode(), 'Parameter "fieldsJson" is not valid JSON', {
			itemIndex,
		});
	}
}

/**
 * Compose a `Prefer` header value. The dv connector's "Return Full Metadata"
 * toggle maps to OData annotations; we also let callers ask for the created /
 * updated row to be echoed back via `return=representation`.
 */
export interface PreferOptions {
	returnRepresentation?: boolean;
	includeFullMetadata?: boolean;
	maxPageSize?: number;
	extra?: string[];
}

export function buildPreferHeader(opts: PreferOptions): string | undefined {
	const parts: string[] = [];
	if (opts.returnRepresentation) parts.push('return=representation');
	if (opts.includeFullMetadata) parts.push('odata.include-annotations="*"');
	if (typeof opts.maxPageSize === 'number' && opts.maxPageSize > 0) {
		parts.push(`odata.maxpagesize=${opts.maxPageSize}`);
	}
	if (opts.extra) parts.push(...opts.extra);
	return parts.length ? parts.join(',') : undefined;
}

/**
 * Strip whitespace / trailing slashes from a user-entered entity set name
 * (e.g. someone pasting "accounts/"). Dataverse rejects either of those
 * variants with an unhelpful 404, so we normalize aggressively up-front.
 */
export function normalizeEntitySet(value: unknown): string {
	if (typeof value !== 'string') return '';
	return value.trim().replace(/^\/+|\/+$/g, '');
}

/**
 * Build the OData path segment for addressing a record. Supports two
 * identifier shapes that the dv connector / Dataverse Web API both accept:
 *
 *   - **GUID**:        `/accounts(7c-..-...)`
 *   - **Alternate key**: `/accounts(accountnumber='ACC-001')`
 *
 * `recordId` is forwarded as-is — Dataverse parses both shapes natively, so we
 * don't need to wrap quotes ourselves (callers must supply them when using
 * alt-keys with string values).
 */
export function buildRecordPath(entitySet: string, recordId: string): string {
	const safeSet = normalizeEntitySet(entitySet);
	const id = String(recordId).trim();
	return `/${safeSet}(${id})`;
}

/**
 * Validate a user-entered Row ID up front. n8n's `required: true` flag stops
 * a completely empty field from being submitted, but a string like `"  "` or
 * an expression that resolves to `null`/`undefined` still slips through and
 * produces a confusing `/accounts()` URL.
 *
 * @throws NodeOperationError with a clear, parameter-named message.
 */
export function assertNonEmptyRecordId(
	ctx: IExecuteFunctions,
	itemIndex: number,
	recordId: unknown,
	paramName = 'recordId',
): string {
	const trimmed = typeof recordId === 'string' ? recordId.trim() : '';
	if (!trimmed) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Parameter "${paramName}" is required and must be a non-empty string`,
			{ itemIndex },
		);
	}
	return trimmed;
}

/**
 * Reject an empty body for write operations (create / update / upsert).
 * Dataverse silently 204s on an empty PATCH and 400s on an empty POST; either
 * way the user wanted to send fields and didn't. Fail fast at the node level
 * with a clearer message.
 */
export function assertNonEmptyBody(
	ctx: IExecuteFunctions,
	itemIndex: number,
	body: IDataObject,
	opName: string,
): IDataObject {
	if (!body || Object.keys(body).length === 0) {
		throw new NodeOperationError(
			ctx.getNode(),
			`${opName} requires at least one field. Provide a non-empty Row Item.`,
			{ itemIndex },
		);
	}
	return body;
}

/**
 * Build a partition-id query-string fragment for NoSQL/elastic tables. The dv
 * connector exposes this as an optional `Partition Id` field; we forward it as
 * the documented `?partitionId=` query parameter.
 */
export function applyPartitionId(qs: IDataObject, partitionId?: unknown): IDataObject {
	if (typeof partitionId === 'string' && partitionId.trim()) {
		qs.partitionId = partitionId.trim();
	}
	return qs;
}

// ---------------------------------------------------------------------------
// Request plan + executor
// ---------------------------------------------------------------------------

/**
 * Declarative spec for a single Dataverse Web API call. Every op module fills
 * one of these out and hands it to {@link executeRequest}; the executor takes
 * care of the cross-cutting concerns that used to be re-implemented inline in
 * each op (partition-id, Prefer header, single vs. paged dispatch).
 *
 * - `body`/`qs`/`extraHeaders` are forwarded verbatim.
 * - `prefer` is converted to a `Prefer` header via {@link buildPreferHeader}
 *   and merged with the caller's `extraHeaders.Prefer` if both are present.
 * - `options.partitionId` is folded into the query string.
 * - `options.returnFullMetadata` is folded into the Prefer header.
 *
 * For `paged: true`, the executor calls {@link dataverseApiRequestAllItems}
 * and returns an array of rows; otherwise it does a single-shot
 * {@link dataverseApiRequest} returning the raw response.
 */
export interface RequestPlan {
	method: IHttpRequestMethods;
	/** Web API path relative to `/api/data/v9.2` (e.g. `/accounts` or `/accounts(<id>)`). */
	path: string;
	body?: IDataObject;
	qs?: DataverseQuery;
	extraHeaders?: DataverseHeaders;
	prefer?: PreferOptions;
	/** Raw options bag from the op's `<op>Options` collection — supplies partitionId, returnFullMetadata. */
	options?: IDataObject;
	/** When true, fetch all pages; when false (default), single request. */
	paged?: boolean;
	/** Only used when `paged: true`. 0 = no limit. */
	limit?: number;
}

/**
 * Execute a {@link RequestPlan}, folding partition-id, Return-Full-Metadata,
 * and `Prefer` header construction into one place. Returns the raw response
 * (single-shot) or the flat list of rows (paged).
 */
export async function executeRequest(
	ctx: IExecuteFunctions,
	credentialType: string,
	plan: RequestPlan,
): Promise<IDataObject | IDataObject[]> {
	const qs: DataverseQuery = { ...(plan.qs ?? {}) };
	const options = plan.options ?? {};
	applyPartitionId(qs as IDataObject, options.partitionId);

	const prefer = buildPreferHeader({
		...(plan.prefer ?? {}),
		includeFullMetadata: plan.prefer?.includeFullMetadata ?? Boolean(options.returnFullMetadata),
	});
	const headers: DataverseHeaders = { ...(plan.extraHeaders ?? {}) };
	if (prefer) headers.Prefer = prefer;

	if (plan.paged) {
		return await dataverseApiRequestAllItems(
			ctx,
			plan.method,
			plan.path,
			qs,
			plan.limit ?? 0,
			credentialType,
			headers,
		);
	}

	return await dataverseApiRequest(
		ctx,
		plan.method,
		plan.path,
		plan.body ?? {},
		qs,
		headers,
		credentialType,
	);
}
