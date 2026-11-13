import { LruCache } from '@n8n/utils/lru-cache';
import type { IDataObject } from 'n8n-workflow';

interface PullRequestCacheEntry {
	etag: string;
	headers: IDataObject;
	body: IDataObject | IDataObject[];
}

// Keep response bodies outside workflow static data to avoid writes from read-only executions.
// Each worker starts with an empty cache and keeps at most 100 responses.
export const pullRequestCache = new LruCache<string, PullRequestCacheEntry | undefined>(100);
