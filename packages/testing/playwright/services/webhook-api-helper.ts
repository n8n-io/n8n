import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

interface TriggerOptions {
	method?: HttpMethod;
	headers?: Record<string, string>;
	data?: unknown;
	/** Max retries for 404 (webhook not yet registered). Default: 3 */
	maxNotFoundRetries?: number;
	/** Delay between 404 retries in ms. Default: 250 */
	notFoundRetryDelayMs?: number;
}

/** Triggers webhooks with retry for 404s (async registration) and connection errors. */
export class WebhookApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	async trigger(path: string, options?: TriggerOptions): Promise<APIResponse> {
		const maxNotFoundRetries = options?.maxNotFoundRetries ?? 3;
		const notFoundRetryDelayMs = options?.notFoundRetryDelayMs ?? 250;

		let lastResponse: APIResponse | undefined;

		for (let attempt = 0; attempt <= maxNotFoundRetries; attempt++) {
			lastResponse = await this.api.request.fetch(path, {
				method: options?.method ?? 'GET',
				headers: options?.headers,
				data: options?.data,
				maxRetries: 3, // Playwright retry for connection errors
			});

			if (lastResponse.status() !== 404 || attempt === maxNotFoundRetries) {
				return lastResponse;
			}

			await new Promise((resolve) => setTimeout(resolve, notFoundRetryDelayMs));
		}

		return lastResponse!;
	}
}
