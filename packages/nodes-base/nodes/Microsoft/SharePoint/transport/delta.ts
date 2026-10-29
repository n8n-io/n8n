import { retryabilityFromError } from '@n8n/backend-network';
import { errorChain } from '@n8n/utils/errors/error-chain';
import { sleep } from '@n8n/utils/sleep';
import type { IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { microsoftApiRequest, type SharePointContext } from './index';

const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_FALLBACK_DELAY_MS = 1_000;
const RATE_LIMIT_MAX_DELAY_MS = 30_000;

export const DEFAULT_DELTA_MAX_PAGES = 40;

const RESYNC_CODES = ['resyncChangesApplyDifferences', 'resyncChangesUploadDifferences'] as const;

export type DeltaCursor = { kind: 'link'; url: string } | { kind: 'latest' };

export type DeltaTarget =
	| {
			feed: 'driveItem';
			/** Required: `/sites/{siteId}/drive` addresses the default library only. */
			driveId: string;
			excludeParents?: boolean;
			cursor?: DeltaCursor;
	  }
	| { feed: 'listItem'; siteId: string; listId: string; cursor?: DeltaCursor };

export type DeltaRequest = DeltaTarget & {
	select?: string[];
	top?: number;
	deadlineEpochMs?: number;
	maxPages?: number;
};

export type DeltaResync = { code: (typeof RESYNC_CODES)[number] | 'unknown' };

export type DeltaPage = {
	items: IDataObject[];
	deltaLink?: string;
	nextLink?: string;
	drained: boolean;
	resync?: DeltaResync;
};

const asCursor = (value: unknown): string | undefined =>
	typeof value === 'string' && value !== '' ? value : undefined;

const deltaPath = (target: DeltaTarget): string =>
	target.feed === 'driveItem'
		? `/v1.0/drives/${encodeURIComponent(target.driveId)}/root/delta`
		: `/v1.0/sites/${encodeURIComponent(target.siteId)}/lists/${encodeURIComponent(
				target.listId,
			)}/items/delta`;

function statusOf(error: unknown): number | undefined {
	const { status } = retryabilityFromError(error);
	if (status !== undefined) return status;
	const httpCode = error instanceof NodeApiError ? error.httpCode : undefined;
	return httpCode === undefined || httpCode === null ? undefined : Number(httpCode);
}

/** A 404 on a delta feed means the drive, list or site behind it is gone. */
export const isTargetMissing = (error: unknown): boolean => statusOf(error) === 404;

function resyncFromError(error: unknown): DeltaResync | undefined {
	if (statusOf(error) !== 410) return undefined;
	for (const level of errorChain(error)) {
		const code = level.code;
		if (typeof code === 'string' && RESYNC_CODES.some((known) => known === code)) {
			return { code: code as DeltaResync['code'] };
		}
	}
	return { code: 'unknown' };
}

async function requestPage(
	this: SharePointContext,
	endpoint: string,
	uri: string | undefined,
	qs: IDataObject,
	headers: IDataObject,
	deadlineEpochMs?: number,
): Promise<IDataObject> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await microsoftApiRequest.call(this, 'GET', endpoint, {}, qs, uri, headers);
		} catch (error) {
			if (statusOf(error) !== 429 || attempt >= RATE_LIMIT_MAX_RETRIES) throw error;
			const { retryAfterMs } = retryabilityFromError(error);
			const wait = Math.min(retryAfterMs ?? RATE_LIMIT_FALLBACK_DELAY_MS, RATE_LIMIT_MAX_DELAY_MS);
			// Sleeping past the budget would leave the next poll overlapping this
			// one. The cursor has not advanced, so giving up costs a repeated
			// fetch rather than a missed change.
			if (deadlineEpochMs !== undefined && Date.now() + wait >= deadlineEpochMs) throw error;
			await sleep(wait);
		}
	}
}

/**
 * Reads a Graph delta feed, returning the raw items and one cursor to resume
 * from. Tombstones, ancestor folders and repeated ids all reach the caller:
 * neither feed supports a server-side filter, so filtering is the caller's.
 *
 * A 410 is reported as a resync rather than thrown. Its `Location` header
 * restarts a full enumeration, so callers re-arm with `latest` instead.
 */
export async function microsoftApiRequestDelta(
	this: SharePointContext,
	request: DeltaRequest,
): Promise<DeltaPage> {
	const { select, top, deadlineEpochMs, maxPages = DEFAULT_DELTA_MAX_PAGES } = request;
	const endpoint = deltaPath(request);

	const headers: IDataObject =
		request.feed === 'driveItem' && request.excludeParents ? { deltaExcludeParent: 'true' } : {};

	// Graph bakes these into the token it returns, so resending them against a
	// link either does nothing or resets the cursor.
	const firstPageQuery: IDataObject = {};
	if (select?.length) firstPageQuery.$select = select.join(',');
	if (top !== undefined) firstPageQuery.$top = top;
	if (request.cursor?.kind === 'latest') firstPageQuery.token = 'latest';

	const items: IDataObject[] = [];
	let uri = request.cursor?.kind === 'link' ? request.cursor.url : undefined;
	let pages = 0;

	for (;;) {
		let response: IDataObject;
		try {
			response = await requestPage.call(
				this,
				endpoint,
				uri,
				uri ? {} : firstPageQuery,
				headers,
				deadlineEpochMs,
			);
		} catch (error) {
			const resync = resyncFromError(error);
			if (!resync) throw error;
			return { items: [], drained: false, resync };
		}

		pages += 1;
		items.push(...((response.value as IDataObject[] | undefined) ?? []));

		const deltaLink = asCursor(response['@odata.deltaLink']);
		if (deltaLink) return { items, deltaLink, drained: true };

		// An empty page can still carry a next link, so paging follows the link.
		const nextLink = asCursor(response['@odata.nextLink']);
		if (!nextLink) return { items, drained: false };

		if (pages >= maxPages || (deadlineEpochMs !== undefined && Date.now() >= deadlineEpochMs)) {
			return { items, nextLink, drained: false };
		}
		uri = nextLink;
	}
}
