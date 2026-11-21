import type { IDataObject } from 'n8n-workflow';

import type { QualysResource } from '../types';
import { pluck, type QualysApiResponse } from '../../transport';

type RateLimitMetadata = {
	remaining?: number;
	limit?: number;
	windowSec?: number;
	toWaitSec?: number;
	concurrencyLimit?: number;
	concurrencyRunning?: number;
};

export type ResponseMetadata = {
	resource: QualysResource;
	plane: string;
	endpoint: string;
	batch: number;
	statusCode: number;
	count?: number;
	rateLimit: RateLimitMetadata;
};

export type ItemMetadata = ResponseMetadata & { pagesFetched: number };

/** Keys a JSON endpoint may hand a record array back under. */
const RECORD_ARRAY_KEYS = ['data', 'items', 'records', 'results'] as const;

/** An object keyed by identifier, as the QVS endpoint answers, turned into rows. */
function recordsFromKeyedObject(body: object, keyName: string): unknown[] {
	return Object.entries(body as IDataObject)
		.filter(([, value]) => value && typeof value === 'object')
		.map(([key, value]) => ({ [keyName]: key, ...(value as IDataObject) }));
}

/** Follow the declared path, tolerating an endpoint that answers a lone object. */
function recordsAtPath(body: object, recordPath: string): unknown[] | undefined {
	const found = pluck(body, recordPath);

	if (Array.isArray(found)) {
		return found;
	}

	return found && typeof found === 'object' ? [found] : undefined;
}

export function extractRecords(
	body: unknown,
	recordPath?: string,
	keyedRecords?: string,
): unknown[] {
	if (Array.isArray(body)) {
		return body;
	}

	if (!body || typeof body !== 'object') {
		return body === undefined || body === null ? [] : [body];
	}

	if (keyedRecords) {
		return recordsFromKeyedObject(body, keyedRecords);
	}

	if (recordPath) {
		// A declared path that finds nothing means no records, not an unknown shape.
		return recordsAtPath(body, recordPath) ?? findRecordArray(body) ?? [];
	}

	const found = findRecordArray(body);
	if (found) {
		return found;
	}

	// An empty body means no records, not one empty record. Endpoints that answer
	// 404 or 204 when the account holds nothing land here.
	return Object.keys(body as IDataObject).length === 0 ? [] : [body];
}

function findRecordArray(body: object): unknown[] | undefined {
	const data = body as IDataObject;

	for (const key of RECORD_ARRAY_KEYS) {
		if (Array.isArray(data[key])) {
			return data[key] as unknown[];
		}
	}

	return undefined;
}

/**
 * A detection response nests detections under each host. Emitting one item per
 * detection, carrying the host context, is what joins cleanly against the
 * KnowledgeBase and against IT Asset records.
 */
export function flattenDetections(hosts: unknown[]): IDataObject[] {
	const out: IDataObject[] = [];

	for (const host of hosts) {
		if (!host || typeof host !== 'object') {
			continue;
		}

		const { DETECTION_LIST, ...hostFields } = host as IDataObject;
		const detections = (DETECTION_LIST as IDataObject | undefined)?.DETECTION;
		const list = Array.isArray(detections) ? detections : detections ? [detections] : [];

		if (list.length === 0) {
			out.push({ ...hostFields });
			continue;
		}

		for (const detection of list) {
			out.push({
				...hostFields,
				...(detection && typeof detection === 'object'
					? (detection as IDataObject)
					: { DETECTION: detection }),
			});
		}
	}

	return out;
}

export function resolveRecordLimit(limit: number, returnAll: boolean): number | null {
	if (returnAll) {
		return Number.POSITIVE_INFINITY;
	}

	const parsed = Number(limit);
	// A non-numeric Limit must be rejected rather than silently becoming NaN,
	// which would page the entire result set and then emit nothing.
	if (!Number.isFinite(parsed)) {
		return null;
	}

	const normalized = Math.max(0, Math.floor(parsed));
	return normalized === 0 ? null : normalized;
}

/**
 * Take as much of a page as the remaining budget allows, and report what is
 * left. Return All sets the budget to Infinity, which takes every page whole.
 */
export function takeRecordsFromPage(
	pageRecords: unknown[],
	countRemaining: number,
): { records: unknown[]; nextCount: number } {
	if (countRemaining === Number.POSITIVE_INFINITY) {
		return { records: pageRecords, nextCount: Number.POSITIVE_INFINITY };
	}

	const takeCount = Math.min(pageRecords.length, countRemaining);

	return {
		records: pageRecords.slice(0, takeCount),
		nextCount: Math.max(0, countRemaining - takeCount),
	};
}

export function normalizeRecord(
	record: unknown,
	includeMetadata: boolean,
	metadata?: ItemMetadata,
): IDataObject {
	const json: IDataObject =
		record && typeof record === 'object' && !Array.isArray(record)
			? { ...(record as IDataObject) }
			: { value: record as IDataObject['value'] };

	if (includeMetadata && metadata) {
		json._qualys = metadata as unknown as IDataObject;
	}

	return json;
}

// ------------------------------------------------------------------ metadata

export function buildMetadata(
	response: QualysApiResponse,
	resource: QualysResource,
	plane: string,
	endpoint: string,
	batch: number,
): ResponseMetadata {
	const body = response.body as IDataObject | undefined;
	const headerCount = parseOptionalInt(getHeader(response.headers, 'count'));
	const bodyCount =
		body && typeof body === 'object' && typeof body.count === 'number' && body.hasMore === undefined
			? body.count
			: undefined;

	return {
		resource,
		plane,
		endpoint,
		batch,
		statusCode: response.statusCode,
		count: headerCount ?? bodyCount,
		rateLimit: {
			remaining: parseOptionalInt(getHeader(response.headers, 'x-ratelimit-remaining')),
			limit: parseOptionalInt(getHeader(response.headers, 'x-ratelimit-limit')),
			windowSec: parseOptionalInt(getHeader(response.headers, 'x-ratelimit-window-sec')),
			toWaitSec: parseOptionalInt(getHeader(response.headers, 'x-ratelimit-towait-sec')),
			concurrencyLimit: parseOptionalInt(getHeader(response.headers, 'x-concurrency-limit-limit')),
			concurrencyRunning: parseOptionalInt(
				getHeader(response.headers, 'x-concurrency-limit-running'),
			),
		},
	};
}

export function readHeader(headers: IDataObject, name: string): string | undefined {
	return getHeader(headers, name);
}

function getHeader(headers: IDataObject, name: string): string | undefined {
	const target = name.toLowerCase();

	for (const [key, value] of Object.entries(headers ?? {})) {
		if (key.toLowerCase() === target) {
			return Array.isArray(value) ? String(value[0]) : String(value);
		}
	}

	return undefined;
}

function parseOptionalInt(value: string | undefined): number | undefined {
	if (value === undefined || value === '') {
		return undefined;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}
