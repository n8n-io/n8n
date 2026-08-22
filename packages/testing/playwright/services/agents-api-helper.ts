import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export interface CreatedAgent {
	id: string;
	name: string;
}

/** Helper for driving the Agents (v2) REST API directly, bypassing the editor UI. */
export class AgentsApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	/**
	 * Creates an agent with only a name — no model, credential, or instructions.
	 * Useful for exercising config-validation UI without clicking through the builder,
	 * since a bare agent is naturally invalid (missing instructions + missing model).
	 */
	async createAgent(projectId: string, name: string): Promise<CreatedAgent> {
		const response = await this.api.request.post(`/rest/projects/${projectId}/agents/v2/`, {
			data: { name },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create agent: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}
}
