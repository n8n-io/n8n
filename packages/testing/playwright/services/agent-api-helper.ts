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
	agentAccessLevel: 'external' | 'internal' | 'closed' | null;
}

export interface AgentCapabilities {
	agentId: string;
	agentName: string;
	description: string | null;
	agentAccessLevel: 'external' | 'internal' | 'closed' | null;
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
	requiredCredentials?: Array<{ type: string; description: string }>;
}

export interface ByokCredentials {
	anthropicApiKey?: string;
	workflowCredentials?: Record<string, Record<string, string>>;
}

export interface ExternalAgentConfig {
	name: string;
	description?: string;
	url: string;
	apiKey: string;
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
		agentAccessLevel?: 'external' | 'internal' | 'closed';
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
			agentAccessLevel?: 'external' | 'internal' | 'closed';
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

	async dispatchTaskRaw(agentId: string, prompt: string) {
		return await this.api.request.post(`/rest/agents/${agentId}/task`, {
			data: { prompt },
		});
	}

	async dispatchTaskWithExternalAgents(
		agentId: string,
		prompt: string,
		externalAgents: ExternalAgentConfig[],
	): Promise<AgentTaskResult> {
		const response = await this.api.request.post(`/rest/agents/${agentId}/task`, {
			data: { prompt, externalAgents },
		});

		if (!response.ok()) {
			throw new TestError(
				`Failed to dispatch agent task with external agents: ${await response.text()}`,
			);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	// --- Public API (/api/v1/) helpers ---

	async getCardViaPublicApi(agentId: string, apiKey: string): Promise<AgentCard> {
		const response = await this.api.request.get(`/api/v1/agents/${agentId}/card`, {
			headers: { 'x-n8n-api-key': apiKey },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to get agent card via public API: ${await response.text()}`);
		}

		return (await response.json()) as AgentCard;
	}

	async getCardViaPublicApiRaw(agentId: string, apiKey: string) {
		return await this.api.request.get(`/api/v1/agents/${agentId}/card`, {
			headers: { 'x-n8n-api-key': apiKey },
		});
	}

	async dispatchTaskViaPublicApi(
		agentId: string,
		prompt: string,
		apiKey: string,
	): Promise<AgentTaskResult> {
		const response = await this.api.request.post(`/api/v1/agents/${agentId}/task`, {
			data: { prompt },
			headers: { 'x-n8n-api-key': apiKey },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to dispatch agent task via public API: ${await response.text()}`);
		}

		return (await response.json()) as AgentTaskResult;
	}

	async dispatchTaskViaPublicApiRaw(agentId: string, prompt: string, apiKey: string) {
		return await this.api.request.post(`/api/v1/agents/${agentId}/task`, {
			data: { prompt },
			headers: { 'x-n8n-api-key': apiKey },
		});
	}

	// --- BYOK helpers ---

	async dispatchTaskWithByok(
		agentId: string,
		prompt: string,
		byokCredentials: ByokCredentials,
	): Promise<AgentTaskResult> {
		const response = await this.api.request.post(`/api/v1/agents/${agentId}/task`, {
			data: { prompt, byokCredentials },
			headers: { 'x-n8n-api-key': '' }, // Will be set by caller via externalRequest
		});

		if (!response.ok()) {
			throw new TestError(`Failed to dispatch BYOK task: ${await response.text()}`);
		}

		return (await response.json()) as AgentTaskResult;
	}

	async dispatchTaskWithByokViaPublicApi(
		agentId: string,
		prompt: string,
		byokCredentials: ByokCredentials,
		apiKey: string,
	): Promise<AgentTaskResult> {
		const response = await this.api.request.post(`/api/v1/agents/${agentId}/task`, {
			data: { prompt, byokCredentials },
			headers: { 'x-n8n-api-key': apiKey },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to dispatch BYOK task via public API: ${await response.text()}`);
		}

		return (await response.json()) as AgentTaskResult;
	}
}
