import type {
	CreatePromotionEnvironmentDto,
	CreatePromotionProviderDto,
	PromotionCheckoutPublicDto,
	PromotionEnvironmentPublicDto,
	PromotionProviderCreatedPublicDto,
	UpdatePromotionEnvironmentDto,
} from '@n8n/api-types';
import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

const BASE_PATH = '/api/v1/promotions';

/**
 * Helper for the promotions public API (`/api/v1/promotions`). Promotion has no
 * REST routes for these operations, so every call needs an API key with the
 * `promotions:*` scopes. Get a keyed helper with `viaPublicApi`.
 */
export class PromotionsApiHelper {
	constructor(
		private readonly api: ApiHelpers,
		private readonly publicApiKey?: string,
	) {}

	viaPublicApi(apiKey: string): PromotionsApiHelper {
		return new PromotionsApiHelper(this.api, apiKey);
	}

	async createProvider(
		input: CreatePromotionProviderDto,
	): Promise<PromotionProviderCreatedPublicDto> {
		return await this.send('POST', '/providers', input);
	}

	async createEnvironment(
		input: CreatePromotionEnvironmentDto,
	): Promise<PromotionEnvironmentPublicDto> {
		return await this.send('POST', '/environments', input);
	}

	/** The checkout state in the response is the state on the main that answers. */
	async getEnvironment(environmentId: string): Promise<PromotionEnvironmentPublicDto> {
		return await this.send('GET', `/environments/${environmentId}`);
	}

	async updateEnvironment(
		environmentId: string,
		input: UpdatePromotionEnvironmentDto,
	): Promise<PromotionEnvironmentPublicDto> {
		return await this.send('PUT', `/environments/${environmentId}`, input);
	}

	async deleteEnvironment(environmentId: string): Promise<void> {
		await this.send('DELETE', `/environments/${environmentId}`);
	}

	async connect(environmentId: string): Promise<PromotionCheckoutPublicDto> {
		return await this.send('POST', `/environments/${environmentId}/connect`);
	}

	async disconnect(environmentId: string): Promise<PromotionCheckoutPublicDto> {
		return await this.send('POST', `/environments/${environmentId}/disconnect`);
	}

	private async send<T>(
		method: 'GET' | 'POST' | 'PUT' | 'DELETE',
		path: string,
		data?: object,
	): Promise<T> {
		if (!this.publicApiKey) {
			throw new TestError('PromotionsApiHelper needs an API key. Call viaPublicApi(apiKey) first.');
		}
		const response: APIResponse = await this.api.request.fetch(`${BASE_PATH}${path}`, {
			method,
			headers: { 'X-N8N-API-KEY': this.publicApiKey },
			data,
		});
		if (!response.ok()) {
			throw new TestError(
				`${method} ${BASE_PATH}${path} failed (${response.status()}): ${await response.text()}`,
			);
		}
		// DELETE returns 204 without a body.
		return response.status() === 204 ? (undefined as T) : ((await response.json()) as T);
	}
}
