import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

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

	async createAgentArtifactThread(target: {
		threadId: string;
		projectId: string;
		agentId: string;
		name: string;
	}): Promise<void> {
		const path = `/rest/instance-ai/threads/${target.threadId}`;
		const created = await this.api.request.post('/rest/instance-ai/threads', {
			data: { threadId: target.threadId, projectId: target.projectId, source: 'playwright' },
		});
		if (!created.ok())
			throw new TestError(`Failed to create Assistant thread: ${created.status()}`);
		const updated = await this.api.request.patch(path, {
			data: { metadata: { instanceAiAgentBuilderTarget: target } },
		});
		if (!updated.ok()) throw new TestError(`Failed to bind agent artifact: ${updated.status()}`);
		const tab = {
			type: 'agent',
			id: target.agentId,
			projectId: target.projectId,
			name: target.name,
		};
		const tabs = await this.api.request.put(`${path}/tabs`, {
			data: {
				tabs: [tab],
				closedTabs: [],
				activeTab: { type: 'agent', id: target.agentId },
				previewOpen: true,
			},
		});
		if (!tabs.ok()) throw new TestError(`Failed to open agent artifact: ${tabs.status()}`);
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
