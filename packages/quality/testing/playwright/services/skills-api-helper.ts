import type { CreateSkillDto, SaveSkillDto, SkillDetail } from '@n8n/api-types';

import { TestError } from '../Types';
import type { ApiHelpers } from './api-helper';

export class SkillsApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	async create(data: CreateSkillDto): Promise<SkillDetail> {
		const response = await this.api.request.post('/rest/skills', { data });
		if (!response.ok()) throw new TestError(`Failed to create skill: ${await response.text()}`);
		return (await response.json()).data;
	}

	async save(skillId: string, data: SaveSkillDto): Promise<void> {
		const response = await this.api.request.patch(`/rest/skills/${skillId}`, { data });
		if (!response.ok()) throw new TestError(`Failed to save skill: ${await response.text()}`);
	}
}
