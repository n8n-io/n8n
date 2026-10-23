import type { OptionsRequestDto } from '@n8n/api-types';
import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';

/** The editor's dynamic parameter loading: dropdowns, which decrypt credentials without a run. */
export class NodeParameterApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	/** Returns the raw response, so a spec can assert a refused load. */
	async loadOptionsRaw(payload: OptionsRequestDto): Promise<APIResponse> {
		return await this.api.request.post('/rest/dynamic-node-parameters/options', {
			data: payload,
		});
	}
}
