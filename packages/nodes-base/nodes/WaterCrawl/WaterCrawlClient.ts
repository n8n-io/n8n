import e from 'express';
import { BaseAPIClient } from './base';
import type {
	CrawlRequest,
	CrawlResult,
	SpiderOptions,
	PageOptions,
	PluginOptions,
	CrawlEvent,
	CreateCrawlRequest,
	ResultObject,
} from './types';
import axios from 'axios'; // Add axios import

export * from './types';

export class WaterCrawlAPIClient extends BaseAPIClient {
	async getCrawlRequestsList(
		page?: number,
		pageSize?: number,
	): Promise<{ results: CrawlRequest[] }> {
		return this.get('/api/v1/core/crawl-requests/', { page, page_size: pageSize });
	}

	async getCrawlRequest(itemId: string): Promise<CrawlRequest> {
		return this.get(`/api/v1/core/crawl-requests/${itemId}/`);
	}

	async createCrawlRequest(
		url: string,
		spiderOptions: SpiderOptions = {},
		pageOptions: PageOptions = {},
		pluginOptions: PluginOptions = {},
	): Promise<CrawlRequest> {
		const request: CreateCrawlRequest = {
			url,
			options: {
				spider_options: spiderOptions,
				page_options: pageOptions,
				plugin_options: pluginOptions,
			},
		};
		return this.post('/api/v1/core/crawl-requests/', request);
	}

	async stopCrawlRequest(itemId: string): Promise<null> {
		return this.delete(`/api/v1/core/crawl-requests/${itemId}/`);
	}

	async downloadCrawlRequest(itemId: string): Promise<CrawlResult[]> {
		return this.get(`/api/v1/core/crawl-requests/${itemId}/download/`);
	}

	async *monitorCrawlRequest(
		itemId: string,
		download: boolean = true,
	): AsyncGenerator<CrawlEvent, void, unknown> {
		const events: CrawlEvent[] = [];
		let resolveNext: ((value: IteratorResult<CrawlEvent, void>) => void) | null = null;
		let isDone = false;
		let streamError: Error | null = null;

		const processEvent = async (event: CrawlEvent) => {
			if (event.type === 'result' && download) {
				const data = event.data as CrawlResult;
				const result = (await this.downloadResult(data)) as ResultObject;
				data.result = result;
				event.data = data;
			}
			if (resolveNext) {
				resolveNext({ value: event, done: false });
				resolveNext = null;
			} else {
				events.push(event);
			}
		};

		// This tracks if we're currently waiting for an event with a promise
		let isWaiting = false;

		const streamPromise = this.streamEvents(
			`/api/v1/core/crawl-requests/${itemId}/status/`,
			processEvent,
		)
			.catch((error) => {
				console.log('Stream error', error);
				streamError = error;
				isDone = true;
				// Resolve any pending wait if the stream errors out
				if (isWaiting && resolveNext) {
					resolveNext({ value: undefined as any, done: true });
					resolveNext = null;
				}
			})
			.finally(() => {
				isDone = true;
				// Resolve any pending wait when the stream completes
				if (isWaiting && resolveNext) {
					resolveNext({ value: undefined as any, done: true });
					resolveNext = null;
				}
			});

		try {
			// Continue yielding events until the stream is done AND there are no more events in the buffer
			while (true) {
				if (events.length > 0) {
					const event = events.shift()!;
					yield event;
				} else if (!isDone) {
					isWaiting = true;
					try {
						const next = await new Promise<IteratorResult<CrawlEvent, void>>((resolve) => {
							resolveNext = resolve;
							// Set a timeout to check if stream completed while we were waiting
							setTimeout(() => {
								if (isDone && resolveNext === resolve) {
									resolve({ value: undefined as any, done: true });
									resolveNext = null;
								}
							}, 1000);
						});

						isWaiting = false;

						// If done is true, break out of the loop
						if (next.done) {
							break;
						}

						// Otherwise yield the event
						yield next.value as CrawlEvent;
					} catch (error) {
						isWaiting = false;
						console.error('Error while waiting for event:', error);
						break;
					}
				} else {
					// No more events and stream is done
					break;
				}
			}

			// If the stream failed, propagate the error
			if (streamError) {
				throw streamError;
			}
		} finally {
			// Ensure the stream is awaited and cleaned up properly
			await streamPromise;
		}
	}

	async getCrawlRequestResults(
		itemId: string,
		page?: number,
		pageSize?: number,
	): Promise<{ results: CrawlResult[] }> {
		return this.get(`/api/v1/core/crawl-requests/${itemId}/results/`, {
			page,
			page_size: pageSize,
		});
	}

	async downloadResult(resultObject: CrawlResult): Promise<Record<string, any>> {
		const response = await axios.get(resultObject.result as string);
		return response.data;
	}

	async scrapeUrl(
		url: string,
		pageOptions: PageOptions = {},
		pluginOptions: PluginOptions = {},
		sync: boolean = true,
		download: boolean = true,
	): Promise<Record<string, any> | CrawlRequest> {
		const request = await this.createCrawlRequest(url, {}, pageOptions, pluginOptions);

		if (!sync) {
			return request;
		}

		for await (const event of this.monitorCrawlRequest(request.uuid, download)) {
			if (event.type === 'result') {
				return event.data as CrawlResult;
			}
		}

		throw new Error('No result received from crawl');
	}
}
