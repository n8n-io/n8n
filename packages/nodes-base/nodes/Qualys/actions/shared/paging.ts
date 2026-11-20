/**
 * The paging contract every Qualys plane implements.
 *
 * Each plane advertises "there is more" differently, so paging is a tiny state
 * machine rather than a shared loop. The implementations live in `../planes`;
 * only the shape lives here, so a plane can depend on it without depending on
 * the dispatcher that selects between them.
 */
import type { IDataObject } from 'n8n-workflow';

import type { qualysApiRequest } from '../../transport';

export type PagedRequest = Parameters<typeof qualysApiRequest>[0];

/**
 * Each plane advertises "there is more" differently, so paging is expressed as a
 * tiny state machine rather than a shared loop: `next` builds the request for
 * the page we are on, `advance` reads the response and decides whether another
 * one exists.
 */
export type Pager = {
	next: () => PagedRequest | undefined;
	advance: (body: IDataObject, pageRecordCount: number) => void;
	/** Optional hook for pagers that need the response headers. */
	observe?: (body: IDataObject, headers: IDataObject) => void;
};
