import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';

/** A binary file attached to an Assistant chat message, as the agents chat endpoint expects it. */
export interface InstanceAiFileAttachmentPayload {
	/** Base64-encoded contents. */
	data: string;
	mimeType: string;
	fileName: string;
}

/** The code-defined n8n Assistant agent. */
const ASSISTANT_AGENT_ID = 'n8n-assistant';

/**
 * Helper for driving Instance AI endpoints directly, bypassing the editor UI.
 */
export class InstanceAiApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	/**
	 * Post a chat message to a thread.
	 *
	 * Returns the raw response rather than throwing on failure: callers use this to
	 * assert that the backend rejects a payload the composer would never send, so a
	 * non-2xx status is the expected outcome rather than an error.
	 */
	async sendMessageResponse(
		projectId: string,
		payload: { message?: string; attachments?: InstanceAiFileAttachmentPayload[] },
	): Promise<APIResponse> {
		return await this.api.request.post(
			`/rest/projects/${projectId}/agents/v2/${ASSISTANT_AGENT_ID}/chat`,
			{ data: payload },
		);
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
