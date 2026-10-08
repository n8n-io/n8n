import type { ApplyPackageDto, PromotionDirection } from '@n8n/api-types';

import type { ApiHelpers } from './api-helper';

/** Promotion operations used by integration journeys. Responses remain available for assertions. */
export class PromotionsApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	async clone(connectionId: string, direction: PromotionDirection) {
		return await this.api.request.post(
			`/api/v1/promotions/connections/${connectionId}/${direction}/clone`,
		);
	}

	async promote(connectionId: string, commitMessage: string) {
		return await this.api.request.post(`/api/v1/promotions/connections/${connectionId}/promote`, {
			data: { commitMessage },
		});
	}

	async apply(connectionId: string, expectedSource: ApplyPackageDto['expectedSource']) {
		return await this.api.request.post(`/api/v1/promotions/connections/${connectionId}/apply`, {
			data: { expectedSource },
		});
	}
}
