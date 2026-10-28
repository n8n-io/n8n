import type { InstanceAiEnsureThreadResponse } from '@n8n/api-types';
import { randomUUID } from 'crypto';
import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';

/** A binary file attached to a chat message, as the chat endpoint expects it. */
export interface InstanceAiFileAttachmentPayload {
	type: 'file';
	/** Base64-encoded contents. */
	data: string;
	mimeType: string;
	fileName: string;
}

/**
 * Helper for driving Instance AI endpoints directly, bypassing the editor UI.
 */
export class InstanceAiApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	async createAgentThread(projectId: string, agentId: string, name: string): Promise<string> {
		const threadId = randomUUID();
		const response = await this.api.request.post('/rest/instance-ai/threads', {
			data: { threadId, projectId, source: 'assistant_page' },
		});
		if (!response.ok()) throw new Error(`Failed to create thread: ${await response.text()}`);
		const body: { data: InstanceAiEnsureThreadResponse } = await response.json();
		const metadataResponse = await this.api.request.patch(`/rest/instance-ai/threads/${threadId}`, {
			data: { metadata: { instanceAiAgentBuilderTarget: { projectId, agentId, name } } },
		});
		if (!metadataResponse.ok())
			throw new Error(`Failed to set agent target: ${await metadataResponse.text()}`);
		const tabsResponse = await this.api.request.put(`/rest/instance-ai/threads/${threadId}/tabs`, {
			data: {
				tabs: [{ type: 'agent', id: agentId, projectId, name }],
				closedTabs: [],
				activeTab: { type: 'agent', id: agentId },
				previewOpen: true,
			},
		});
		if (!tabsResponse.ok())
			throw new Error(`Failed to open agent tab: ${await tabsResponse.text()}`);
		return body.data.thread.id;
	}

	/**
	 * Post a chat message to a thread.
	 *
	 * Returns the raw response rather than throwing on failure: callers use this to
	 * assert that the backend rejects a payload the composer would never send, so a
	 * non-2xx status is the expected outcome rather than an error.
	 */
	async sendMessageResponse(
		threadId: string,
		payload: { message?: string; attachments?: InstanceAiFileAttachmentPayload[] },
	): Promise<APIResponse> {
		return await this.api.request.post(`/rest/instance-ai/chat/${threadId}`, { data: payload });
	}

	/**
	 * Raw persisted messages for a thread, as stored rather than as rendered — the
	 * `raw=true` projection the thread inspector uses. Useful for asserting on what a
	 * turn actually left behind, such as whether an attachment survived a failure.
	 */
	async getRawThreadMessagesResponse(threadId: string): Promise<APIResponse> {
		return await this.api.request.get(`/rest/instance-ai/threads/${threadId}/messages?raw=true`);
	}
}
