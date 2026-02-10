import { nanoid } from 'nanoid';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export interface AgentResponse {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	avatar: string | null;
	description: string | null;
	agentAccessLevel: 'open' | 'internal' | 'closed' | null;
}

export interface AgentCapabilities {
	agentId: string;
	agentName: string;
	description: string | null;
	agentAccessLevel: 'open' | 'internal' | 'closed' | null;
	projects: Array<{ id: string; name: string }>;
	workflows: Array<{ id: string; name: string; active: boolean }>;
	credentials: Array<{ id: string; name: string; type: string }>;
}

export interface AgentCard {
	id: string;
	name: string;
	provider: { name: string; description: string };
	capabilities: { streaming: boolean; pushNotifications: boolean; multiTurn: boolean };
	skills: unknown[];
	interfaces: Array<{ type: string; url: string }>;
	securitySchemes: Record<string, unknown>;
	security: Array<Record<string, unknown[]>>;
}

export interface AgentTaskResult {
	status: string;
	summary?: string;
	message?: string;
	steps: Array<{ action: string; workflowName?: string; toAgent?: string; result?: string }>;
}

export class AgentApiHelper {
	constructor(private api: ApiHelpers) {}

	async createAgent(options?: {
		firstName?: string;
		description?: string;
		agentAccessLevel?: 'open' | 'internal' | 'closed';
		avatar?: string;
	}): Promise<AgentResponse> {
		const firstName = options?.firstName ?? `Agent-${nanoid(8)}`;

		const response = await this.api.request.post('/rest/agents', {
			data: {
				firstName,
				...(options?.description !== undefined && { description: options.description }),
				...(options?.agentAccessLevel !== undefined && {
					agentAccessLevel: options.agentAccessLevel,
				}),
				...(options?.avatar !== undefined && { avatar: options.avatar }),
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create agent: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async updateAgent(
		agentId: string,
		data: {
			firstName?: string;
			description?: string;
			agentAccessLevel?: 'open' | 'internal' | 'closed';
			avatar?: string;
		},
	): Promise<AgentResponse> {
		const response = await this.api.request.patch(`/rest/agents/${agentId}`, { data });

		if (!response.ok()) {
			throw new TestError(`Failed to update agent: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async updateAgentRaw(agentId: string, data: Record<string, unknown>) {
		return await this.api.request.patch(`/rest/agents/${agentId}`, { data });
	}

	async getCardRaw(agentId: string) {
		return await this.api.request.get(`/rest/agents/${agentId}/card`);
	}

	async getCapabilities(agentId: string): Promise<AgentCapabilities> {
		const response = await this.api.request.get(`/rest/agents/${agentId}/capabilities`);

		if (!response.ok()) {
			throw new TestError(`Failed to get agent capabilities: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async getCard(agentId: string): Promise<AgentCard> {
		const response = await this.api.request.get(`/rest/agents/${agentId}/card`);

		if (!response.ok()) {
			throw new TestError(`Failed to get agent card: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async dispatchTask(agentId: string, prompt: string): Promise<AgentTaskResult> {
		const response = await this.api.request.post(`/rest/agents/${agentId}/task`, {
			data: { prompt },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to dispatch agent task: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}
}
