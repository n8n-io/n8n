import { setTimeout as wait } from 'node:timers/promises';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export interface TrustedSource {
	id: string;
	name: string;
	issuer: string;
	status: 'unchecked' | 'healthy' | 'error';
	lastError: string | null;
}

export interface TrustedSourceInput {
	name: string;
	issuer: string;
	config: Record<string, unknown>;
}

/** Helper for the trusted sources REST API (`/rest/trusted-sources`). */
export class TrustedSourceApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	async get(id: string): Promise<TrustedSource> {
		const response = await this.api.request.get(`/rest/trusted-sources/${id}`);
		if (!response.ok()) {
			throw new TestError(
				`Failed to get trusted source ${id}: ${response.status()} ${await response.text()}`,
			);
		}
		return ((await response.json()) as { data: TrustedSource }).data;
	}

	async create(input: TrustedSourceInput): Promise<TrustedSource> {
		const response = await this.api.request.post('/rest/trusted-sources', { data: input });
		if (!response.ok()) {
			throw new TestError(
				`Failed to create trusted source "${input.name}": ${response.status()} ${await response.text()}`,
			);
		}
		return ((await response.json()) as { data: TrustedSource }).data;
	}

	/** Runs discovery for the source now and returns the updated source. */
	async check(id: string): Promise<TrustedSource> {
		const response = await this.api.request.post(`/rest/trusted-sources/${id}/check`);
		if (!response.ok()) {
			throw new TestError(
				`Failed to check trusted source ${id}: ${response.status()} ${await response.text()}`,
			);
		}
		return ((await response.json()) as { data: TrustedSource }).data;
	}

	/**
	 * Checks the source until it is healthy. A check during a scheduled discovery
	 * run returns the source unchanged for up to 60 s, so one check is not enough.
	 */
	async waitUntilHealthy(id: string, timeoutMs = 75_000): Promise<TrustedSource> {
		const deadline = Date.now() + timeoutMs;
		let source = await this.check(id);
		while (source.status !== 'healthy') {
			if (Date.now() >= deadline) {
				throw new TestError(
					`Trusted source ${id} is not healthy after ${timeoutMs}ms: ${source.status} ${source.lastError ?? ''}`,
				);
			}
			await wait(2_000);
			source = await this.check(id);
		}
		return source;
	}
}
