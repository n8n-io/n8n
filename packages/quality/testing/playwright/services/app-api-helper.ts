import type { AppResponse, CreateAppDto } from '@n8n/api-types';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export class AppApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	async create(
		projectId: string,
		payload: Pick<CreateAppDto, 'name' | 'namespace'> & Partial<Pick<CreateAppDto, 'visibility'>>,
	): Promise<AppResponse> {
		const response = await this.api.request.post(`/rest/projects/${projectId}/apps`, {
			data: payload,
		});
		if (!response.ok()) {
			throw new TestError(`Failed to create app: ${await response.text()}`);
		}
		return (await response.json()).data;
	}
}
