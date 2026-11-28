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
		await this.createArtifactThread({
			threadId: target.threadId,
			projectId: target.projectId,
			metadata: { instanceAiAgentBuilderTarget: target },
			tab: { type: 'agent', id: target.agentId, projectId: target.projectId, name: target.name },
		});
	}

	async createAppArtifactThread(target: {
		threadId: string;
		projectId: string;
		appId: string;
		name: string;
	}): Promise<void> {
		await this.createArtifactThread({
			threadId: target.threadId,
			projectId: target.projectId,
			metadata: {
				instanceAiAppTargets: [
					{ appId: target.appId, projectId: target.projectId, name: target.name },
				],
			},
			tab: { type: 'app', id: target.appId, projectId: target.projectId, name: target.name },
		});
	}

	private async createArtifactThread(options: {
		threadId: string;
		projectId: string;
		metadata: Record<string, unknown>;
		tab: { type: 'agent' | 'app'; id: string; projectId: string; name: string };
	}): Promise<void> {
		const path = `/rest/instance-ai/threads/${options.threadId}`;
		const created = await this.api.request.post('/rest/instance-ai/threads', {
			data: { threadId: options.threadId, projectId: options.projectId, source: 'playwright' },
		});
		if (!created.ok())
			throw new TestError(`Failed to create Assistant thread: ${created.status()}`);
		const updated = await this.api.request.patch(path, {
			data: { metadata: options.metadata },
		});
		if (!updated.ok())
			throw new TestError(`Failed to bind ${options.tab.type} artifact: ${updated.status()}`);
		const tabs = await this.api.request.put(`${path}/tabs`, {
			data: {
				tabs: [options.tab],
				closedTabs: [],
				activeTab: { type: options.tab.type, id: options.tab.id },
				previewOpen: true,
			},
		});
		if (!tabs.ok())
			throw new TestError(`Failed to open ${options.tab.type} artifact: ${tabs.status()}`);
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
