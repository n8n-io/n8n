import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export interface WorkflowExecutionStatus {
	workflowId: string;
	readyToExecute: boolean;
	credentials?: Array<{
		credentialId: string;
		credentialName: string;
		credentialType: string;
		credentialStatus: 'missing' | 'configured';
		authorizationUrl?: string;
		revokeUrl?: string;
	}>;
}

/**
 * Static endpoint auth token used in e2e tests.
 * Must match N8N_DYNAMIC_CREDENTIALS_ENDPOINT_AUTH_TOKEN in the 'dynamic-credentials' capability.
 */
export const DYNAMIC_CRED_ENDPOINT_TOKEN = 'e2e-test-endpoint-token';

export interface CredentialResolver {
	id: string;
	name: string;
	type: string;
	config: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateResolverOptions {
	name: string;
	type: string;
	config: Record<string, unknown>;
}

export interface ExecutionStatusOptions {
	/** Bearer token for credential context (identifies the external user). */
	bearerToken?: string;
	/** Override auth source. Defaults to bearer if bearerToken is set, else cookie. */
	authSource?: 'bearer' | 'cookie';
	/**
	 * Static endpoint auth token for unauthenticated requests.
	 * Sent as X-Authorization header.
	 * Required when the caller has no n8n session (e.g. external users).
	 */
	endpointToken?: string;
}

export class DynamicCredentialApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	// ===== Resolver CRUD =====

	async createResolver(options: CreateResolverOptions): Promise<CredentialResolver> {
		const response = await this.api.request.post('/rest/credential-resolvers', {
			data: options,
		});
		if (!response.ok()) {
			throw new TestError(`Failed to create credential resolver: ${await response.text()}`);
		}
		const result = await response.json();
		return result.data ?? result;
	}

	async deleteResolver(id: string): Promise<void> {
		const response = await this.api.request.delete(`/rest/credential-resolvers/${id}`);
		if (!response.ok()) {
			throw new TestError(`Failed to delete credential resolver: ${await response.text()}`);
		}
	}

	// ===== Execution status =====

	/**
	 * GET /rest/workflows/:workflowId/execution-status
	 *
	 * Returns the execution status, asserting a 2xx response.
	 * For external (unauthenticated) callers, provide both `bearerToken` and `endpointToken`.
	 * For authenticated n8n users, the session cookie is used automatically.
	 */
	async getExecutionStatus(
		workflowId: string,
		options?: ExecutionStatusOptions,
	): Promise<WorkflowExecutionStatus> {
		const response = await this.getExecutionStatusRaw(workflowId, options);
		if (!response.ok()) {
			throw new TestError(
				`Failed to get execution status: ${response.status()} ${await response.text()}`,
			);
		}
		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * GET /rest/workflows/:workflowId/execution-status
	 *
	 * Returns the raw Playwright APIResponse for status-code assertions.
	 */
	async getExecutionStatusRaw(
		workflowId: string,
		options?: ExecutionStatusOptions,
	): Promise<APIResponse> {
		const params = new URLSearchParams();
		if (options?.authSource) {
			params.set('authSource', options.authSource);
		}

		const headers: Record<string, string> = {};
		if (options?.bearerToken) {
			headers['Authorization'] = `Bearer ${options.bearerToken}`;
		}
		if (options?.endpointToken) {
			headers['X-Authorization'] = options.endpointToken;
		}

		const query = params.toString();
		const url = `/rest/workflows/${workflowId}/execution-status${query ? `?${query}` : ''}`;

		return await this.api.request.get(url, { headers });
	}

	// ===== Authorization =====

	/**
	 * POST /rest/credentials/:id/authorize?resolverId=:resolverId
	 *
	 * Starts the OAuth2 authorization flow for a credential.
	 * Returns the OAuth2 provider authorization URL (e.g. Keycloak login page).
	 * The caller should then follow this URL to complete the login and obtain the
	 * n8n callback URL (with code + state), then GET the callback URL using the
	 * n8n API context to store the tokens.
	 */
	async getAuthorizationUrl(
		credentialId: string,
		resolverId: string,
		bearerToken: string,
	): Promise<string> {
		const response = await this.api.request.post(
			`/rest/credentials/${credentialId}/authorize?resolverId=${encodeURIComponent(resolverId)}`,
			{
				data: {},
				headers: { Authorization: `Bearer ${bearerToken}` },
			},
		);

		if (!response.ok()) {
			throw new TestError(
				`Failed to get credential authorization URL: ${response.status()} ${await response.text()}`,
			);
		}

		const result = await response.json();
		return result.data ?? result; // The OAuth2 provider authorization URL
	}

	/**
	 * POSTs to the `authorizationUrl` returned by the execution-status endpoint.
	 *
	 * The execution-status response includes a full `authorizationUrl` for each
	 * missing credential (e.g. `https://n8n:5678/rest/credentials/:id/authorize?resolverId=...`).
	 * This helper extracts the path+query from that URL and posts to it using the
	 * api.request context, so that the session cookie is included automatically.
	 *
	 * Returns the OAuth2 provider authorization URL (e.g. Keycloak login page).
	 */
	async startAuthorizationFromStatusUrl(
		statusAuthorizationUrl: string,
		bearerToken: string,
	): Promise<string> {
		// Extract path+query to use with api.request (which has its own baseURL).
		// This handles the case where the URL hostname differs from the test context baseURL.
		const parsed = new URL(statusAuthorizationUrl);
		const path = parsed.pathname + parsed.search;

		const response = await this.api.request.post(path, {
			data: {},
			headers: { Authorization: `Bearer ${bearerToken}` },
		});

		if (!response.ok()) {
			throw new TestError(
				`Failed to start authorization: ${response.status()} ${await response.text()}`,
			);
		}

		const result = await response.json();
		return result.data ?? result; // The OAuth2 provider authorization URL
	}

	// ===== Revoke =====

	/**
	 * DELETE /rest/credentials/:credentialId/revoke?resolverId=:resolverId
	 *
	 * Revokes stored credential data for the current user identity.
	 */
	async revokeCredential(
		credentialId: string,
		resolverId: string,
		options?: { bearerToken?: string; endpointToken?: string },
	): Promise<void> {
		const headers: Record<string, string> = {};
		if (options?.bearerToken) {
			headers['Authorization'] = `Bearer ${options.bearerToken}`;
		}
		if (options?.endpointToken) {
			headers['X-Authorization'] = options.endpointToken;
		}

		const response = await this.api.request.delete(
			`/rest/credentials/${credentialId}/revoke?resolverId=${encodeURIComponent(resolverId)}`,
			{ headers },
		);

		if (response.status() !== 204 && !response.ok()) {
			throw new TestError(`Failed to revoke credential: ${await response.text()}`);
		}
	}
}
