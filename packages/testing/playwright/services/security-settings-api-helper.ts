import type { RedactionFloor } from '@n8n/api-types';
import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

/**
 * Helpers for the instance Security & Policies settings, focused on the
 * redaction-enforcement floor (`off` / `production` / `all`).
 *
 * Endpoints:
 *   - GET  /rest/settings/security
 *   - POST /rest/settings/security
 *
 * Both are gated by the `feat:personalSpacePolicy` license and the
 * `securitySettings:manage` global scope, so enable that license before use.
 */
export class SecuritySettingsApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	async getRedactionFloor(): Promise<RedactionFloor | undefined> {
		const response = await this.api.request.get('/rest/settings/security');
		if (!response.ok()) {
			throw new TestError(
				`GET /rest/settings/security failed (${response.status()}): ${await response.text()}`,
			);
		}
		const result = await response.json();
		const settings = result.data ?? result;
		return settings.redactionEnforcement?.floor;
	}

	async setRedactionFloor(floor: RedactionFloor): Promise<void> {
		const response = await this.setRedactionFloorRaw(floor);

		if (!response.ok()) {
			throw new TestError(
				`POST /rest/settings/security failed (${response.status()}): ${await response.text()}`,
			);
		}
	}

	async setRedactionFloorRaw(floor: RedactionFloor): Promise<APIResponse> {
		return await this.api.request.post('/rest/settings/security', {
			data: { redactionEnforcement: { floor } },
		});
	}
}
