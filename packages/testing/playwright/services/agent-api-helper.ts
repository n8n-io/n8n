import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export class AgentApiHelper {
	constructor(private api: ApiHelpers) {}

	/**
	 * Create an empty agent in the given project and return its id.
	 */
	async create(projectId: string, name: string): Promise<{ id: string }> {
		const response = await this.api.request.post(`/rest/projects/${projectId}/agents/v2`, {
			data: { name },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create agent: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Fetch the current write lock for an agent. Returns null when no
	 * lock is held.
	 */
	async getWriteLock(
		projectId: string,
		agentId: string,
	): Promise<{ userId: string; clientId: string } | null> {
		const response = await this.api.request.get(
			`/rest/projects/${projectId}/agents/v2/${agentId}/collaboration/write-lock`,
		);

		if (!response.ok()) {
			throw new TestError(`Failed to fetch agent write lock: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}
}
