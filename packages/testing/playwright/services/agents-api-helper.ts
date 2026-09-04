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
	 * Creates an agent with only a name, then explicitly clears its model —
	 * useful for exercising config-validation UI without clicking through the
	 * builder. Creation alone doesn't guarantee an empty model: when the
	 * project already has a usable LLM credential (or the instance is wired to
	 * n8n's managed AI gateway), the backend auto-assigns a default.
	 */
	async createAgent(projectId: string, name: string): Promise<CreatedAgent> {
		const response = await this.api.request.post(`/rest/projects/${projectId}/agents/v2/`, {
			data: { name },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create agent: ${await response.text()}`);
		}

		const result = await response.json();
		const agent: CreatedAgent = result.data ?? result;
		await this.clearModel(projectId, agent.id);
		return agent;
	}

	private async clearModel(projectId: string, agentId: string): Promise<void> {
		const configPath = `/rest/projects/${projectId}/agents/v2/${agentId}/config`;
		const configResponse = await this.api.request.get(configPath);
		if (!configResponse.ok()) {
			throw new TestError(`Failed to fetch agent config: ${await configResponse.text()}`);
		}
		const configResult = await configResponse.json();
		const config = configResult.data ?? configResult;

		const putResponse = await this.api.request.put(configPath, {
			data: { config: { ...config, model: '' } },
		});
		if (!putResponse.ok()) {
			throw new TestError(`Failed to clear agent model: ${await putResponse.text()}`);
		}
	}
}
