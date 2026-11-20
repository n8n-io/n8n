import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';

import type { QualysItemGranularity, QualysOperationKind, QualysOutputMode } from './types';
import { buildCsamBody, clampCsamPageSize, createPager, type PagedRequest } from './planes';
import {
	buildMetadata,
	extractRecords,
	flattenDetections,
	normalizeRecord,
	resolveRecordLimit,
	takeRecordsFromPage,
	type ItemMetadata,
	type ResponseMetadata,
} from './shared/records';
import { OPERATIONS, type Operation } from './resources';
import { asNodeError, qualysApiRequest } from '../transport';

// Re-exported so the filters, the pagers and the record shaping present one
// surface. Anything only used inside this directory is imported, not re-exported.
export {
	buildComponentFilter,
	buildCsamFilter,
	buildFilterExpression,
	buildFoParameters,
	buildSortExpression,
	validateFoParameters,
} from './planes';
export {
	buildCsamQuery,
	buildOtQuery,
	clampCsamPageSize,
	formatCsamDate,
} from './planes';
export {
	extractRecords,
	flattenDetections,
	resolveRecordLimit,
	takeRecordsFromPage,
} from './shared/records';

/**
 * Backstop against a pager that never terminates. The subscription rate limit
 * (300 calls an hour by default) bites long before a real query gets here, and
 * this fails loudly rather than silently truncating.
 */
const MAX_PAGES = 2_000;

function requestFingerprint(request: PagedRequest): string {
	return [
		request.endpoint,
		JSON.stringify(request.qs ?? {}),
		JSON.stringify(request.body ?? null),
	].join('|');
}

/**
 * What the router does with each kind of operation. A table rather than a
 * switch, so there is no unreachable default branch to explain.
 */
const EXECUTORS: Record<
	QualysOperationKind,
	(
		this: IExecuteFunctions,
		definition: Operation,
		itemIndex: number,
	) => Promise<INodeExecutionData[]>
> = {
	list: executeList,
	count: executeCount,
	get: executeGet,
};

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];
	// The operation carries everything needed to service the request; the resource
	// only groups the menu. Operation values are unique across resources.
	const operation = this.getNodeParameter('operation', 0) as string;
	const definition = OPERATIONS[operation];

	if (!definition) {
		throw new NodeOperationError(this.getNode(), `Unsupported operation: ${String(operation)}`, {
			itemIndex: 0,
			description:
				'Reselect the resource and operation. A workflow saved against an older version of this node can still hold a retired operation name.',
		});
	}

	for (const itemIndex of resolveItemIndices.call(this)) {
		try {
			// Sequential by design: a pager cannot build its next request until the
			// current response comes back, and Qualys throttles hard on concurrency.
			returnData.push(...(await EXECUTORS[definition.kind].call(this, definition, itemIndex)));
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as Error).message },
					pairedItem: { item: itemIndex },
				});
				continue;
			}

			// Already a NodeApiError or NodeOperationError from the layer below, with
			// its diagnostics attached, so this passes it through rather than
			// re-wrapping and burying them.
			throw asNodeError(this.getNode(), error);
		}
	}

	return [returnData];
}

/**
 * Which input items to run against: every one, so parameters resolve against
 * each upstream item. A list or count that should run a single query however
 * many items arrive uses n8n's own Execute Once node setting, which hands the
 * node just the first item. With no input at all the node still runs once.
 */
export function resolveItemIndices(this: IExecuteFunctions): number[] {
	const itemCount = Math.max(1, this.getInputData().length);
	return Array.from({ length: itemCount }, (_, index) => index);
}

// ------------------------------------------------------------------- list

async function executeList(
	this: IExecuteFunctions,
	definition: Operation,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const requested = Math.max(0, Number(this.getNodeParameter('limit', itemIndex, 50)));
	const limit = resolveRecordLimit(requested, returnAll);

	if (limit === null) {
		throw new NodeOperationError(
			this.getNode(),
			'Limit must be greater than 0 unless Return All is enabled.',
			{ itemIndex },
		);
	}

	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const outputMode = (options.outputMode ?? 'items') as QualysOutputMode;
	const includeMetadata = options.includeMetadata === true;

	const records: unknown[] = [];
	const rawPages: Array<{ body: IDataObject; metadata: ResponseMetadata }> = [];
	let pagesFetched = 0;
	let knownTotal: number | undefined;
	let latestMetadata: ResponseMetadata | undefined;
	let remainingCount = limit;

	const pager = createPager.call(this, definition, itemIndex);
	const requestsMade = new Set<string>();

	while (true) {
		const request = pager.next();
		if (!request) {
			break;
		}

		// A cursor that stops advancing - or a next-batch URL Qualys keeps handing
		// back unchanged - would otherwise loop forever.
		const fingerprint = requestFingerprint(request);
		if (requestsMade.has(fingerprint)) {
			break;
		}
		requestsMade.add(fingerprint);

		if (pagesFetched >= MAX_PAGES) {
			throw new NodeOperationError(
				this.getNode(),
				`Stopped after ${MAX_PAGES} requests without exhausting the result set. Narrow the query, or raise Batch Size so each request returns more records.`,
				{ itemIndex },
			);
		}

		// Sequential by design: see the note in `router`.
		const response = await qualysApiRequest.call(this, request);
		pagesFetched += 1;

		const metadata = buildMetadata(
			response,
			definition.resource,
			definition.plane,
			request.endpoint,
			pagesFetched,
		);
		latestMetadata = metadata;
		if (metadata.count !== undefined) {
			knownTotal = metadata.count;
		}

		const body = (response.body ?? {}) as IDataObject;
		pager.observe?.(body, response.headers);
		const pageRecords = extractRecords(body, definition.recordPath, definition.keyedRecords);
		const expanded = expandRecords.call(this, definition, pageRecords, itemIndex);

		const window = takeRecordsFromPage(expanded, remainingCount);
		remainingCount = window.nextCount;

		if (outputMode === 'raw') {
			rawPages.push({ body, metadata });
		} else {
			records.push(...window.records);
		}

		if (remainingCount === 0) {
			break;
		}

		pager.advance(body, pageRecords.length);
	}

	if (outputMode === 'raw') {
		return [
			{
				json: {
					resource: definition.resource,
					operation: definition.operation,
					pagesFetched,
					pages: rawPages,
				} as unknown as IDataObject,
				pairedItem: { item: itemIndex },
			},
		];
	}

	const metadata: ItemMetadata | undefined = latestMetadata && {
		...latestMetadata,
		count: knownTotal ?? latestMetadata.count,
		pagesFetched,
	};

	return records.map((record) => ({
		json: normalizeRecord(record, includeMetadata, metadata),
		pairedItem: { item: itemIndex },
	}));
}

/**
 * A detection response nests detections under each host, and the node offers
 * both shapes. Every other operation emits its records unchanged.
 */
function expandRecords(
	this: IExecuteFunctions,
	definition: Operation,
	records: unknown[],
	itemIndex: number,
): unknown[] {
	if (definition.operation !== 'listDetections') {
		return records;
	}

	const granularity = this.getNodeParameter(
		'itemGranularity',
		itemIndex,
		'detection',
	) as QualysItemGranularity;

	return granularity === 'detection' ? flattenDetections(records) : records;
}

// ----------------------------------------------------------- other operations

async function executeCount(
	this: IExecuteFunctions,
	definition: Operation,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const match = this.getNodeParameter('csamMatch', itemIndex, 'AND') as string;
	const rows = this.getNodeParameter('csamFilters', itemIndex, {}) as IDataObject;

	const response = await qualysApiRequest.call(this, {
		plane: definition.plane,
		endpoint: definition.endpoint,
		method: definition.method,
		body: buildCsamBody(definition, rows, match),
	});

	return [{ json: (response.body ?? {}) as IDataObject, pairedItem: { item: itemIndex } }];
}

/**
 * Query string for a get. Endpoints that take the id in the path are collection
 * reads, so they page instead of naming the record; the others select fields.
 */
function buildGetQuery(definition: Operation, options: IDataObject, assetId: string): IDataObject {
	if (definition.idInPath === true) {
		return {
			pageSize: clampCsamPageSize(
				Number(options.pageSize ?? definition.pageSize?.default ?? 100),
				definition.pageSize?.max,
			),
		};
	}

	const qs: IDataObject = { assetId };

	for (const key of ['includeFields', 'excludeFields'] as const) {
		const value = options[key];
		if (typeof value === 'string' && value.trim()) {
			qs[key] = value.trim();
		}
	}

	return qs;
}

async function executeGet(
	this: IExecuteFunctions,
	definition: Operation,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const assetId = String(this.getNodeParameter('assetId', itemIndex, '')).trim();
	if (!assetId) {
		throw new NodeOperationError(this.getNode(), 'Asset ID is required.', { itemIndex });
	}

	const options = this.getNodeParameter('csamOptions', itemIndex, {}) as IDataObject;
	const inPath = definition.idInPath === true;

	const response = await qualysApiRequest.call(this, {
		plane: definition.plane,
		endpoint: inPath
			? definition.endpoint.replace('{assetId}', encodeURIComponent(assetId))
			: definition.endpoint,
		method: inPath ? definition.method : 'GET',
		qs: buildGetQuery(definition, options, assetId),
	});

	const body = (response.body ?? {}) as IDataObject;
	const records = extractRecords(body, definition.recordPath);

	if (records.length === 0) {
		// An empty body means the record does not exist, or the endpoint answered
		// 204; either way that is no items rather than one empty item. A body with
		// content but an unrecognised shape is still surfaced so nothing is lost.
		return Object.keys(body).length === 0 ? [] : [{ json: body, pairedItem: { item: itemIndex } }];
	}

	return records.map((record) => ({
		json: normalizeRecord(record, false),
		pairedItem: { item: itemIndex },
	}));
}
