import type { ApiKeyScope } from '@n8n/permissions';
import { request } from '@playwright/test';
import { nanoid } from 'nanoid';

import type { ApiHelpers } from './api-helper';
import type { TestUser } from './user-api-helper';
import { TestError } from '../Types';

export interface ApiKey {
	id: string;
	label: string;
	apiKey: string;
	rawApiKey: string;
	createdAt: string;
	expiresAt: string | null;
}

/** Default scopes for test API keys - covers most common operations */
const DEFAULT_API_KEY_SCOPES: ApiKeyScope[] = [
	'user:read',
	'user:list',
	'user:create',
	'user:delete',
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:list',
	'credential:create',
	'credential:update',
	'credential:delete',
	'project:create',
	'project:update',
	'project:delete',
	'project:list',
];

/** Helper for working with n8n's Public API using API key authentication. */
export class PublicApiHelper {
	private apiKey: string | null = null;

	constructor(private readonly api: ApiHelpers) {}

	async createApiKey(
		label?: string,
		scopes: ApiKeyScope[] = DEFAULT_API_KEY_SCOPES,
	): Promise<ApiKey> {
		const keyLabel = label ?? `E2E Test API Key ${nanoid()}`;
		const response = await this.api.request.post('/rest/api-keys', {
			data: { label: keyLabel, scopes, expiresAt: null },
		});

		if (!response.ok()) {
			const errorText = await response.text();
			throw new TestError(
				`Failed to create API key "${keyLabel}": ${response.status()} ${errorText}`,
			);
		}

		const result = await response.json();
		const apiKeyData = result.data ?? result;
		this.apiKey = apiKeyData.rawApiKey;
		return apiKeyData;
	}

	private async ensureApiKey(): Promise<string> {
		if (!this.apiKey) {
			await this.createApiKey();
		}
		return this.apiKey!;
	}

	private async getApiHeaders(): Promise<Record<string, string>> {
		return { 'X-N8N-API-KEY': await this.ensureApiKey() };
	}

	/** Invite a user and return the invite accept URL for completing registration. */
	async inviteUser(
		email: string,
		role: 'global:member' | 'global:admin' = 'global:member',
	): Promise<{ id: string; email: string; inviteAcceptUrl: string; emailSent: boolean }> {
		const headers = await this.getApiHeaders();
		const response = await this.api.request.post('/api/v1/users', {
			headers,
			data: [{ email, role }],
		});

		if (!response.ok()) {
			const errorText = await response.text();
			throw new TestError(`Failed to invite user: ${response.status()} ${errorText}`);
		}

		const result = await response.json();
		const userResult = result[0];

		if (!userResult) {
			throw new TestError('Failed to invite user: empty response from API');
		}

		if (userResult.error) {
			throw new TestError(`Failed to invite user: ${userResult.error}`);
		}

		return userResult.user;
	}

	/**
	 * Create a fully activated user by inviting them via the Public API and accepting the invitation.
	 *
	 * n8n's Public API doesn't have a direct "create user" endpoint. Users must be invited first,
	 * then accept the invitation to complete registration. The invitation acceptance endpoint
	 * (`/rest/invitations/:id/accept`) automatically logs in the new user by setting session cookies.
	 *
	 * To prevent this from hijacking the current browser session (which would log out the owner),
	 * we use an isolated request context for the acceptance step. This ensures the owner's session
	 * remains intact and multiple users can be created consecutively without session interference.
	 */
	async createUser(
		options: {
			email?: string;
			password?: string;
			firstName?: string;
			lastName?: string;
			role?: 'global:member' | 'global:admin';
		} = {},
	): Promise<TestUser> {
		const email = options.email ?? `testuser-${nanoid()}@test.com`;
		const password = options.password ?? 'PlaywrightTest123';
		const firstName = options.firstName ?? 'Test';
		const lastName = options.lastName ?? `User${nanoid()}`;
		const role = options.role ?? 'global:member';

		const invited = await this.inviteUser(email, role);

		const url = new URL(invited.inviteAcceptUrl);
		const inviterId = url.searchParams.get('inviterId');
		const inviteeId = url.searchParams.get('inviteeId');

		// Use an isolated request context to prevent session cookie contamination.
		// The accept endpoint sets cookies that would otherwise override the current user's session.
		const isolatedContext = await request.newContext({ baseURL: url.origin });
		try {
			const acceptResponse = await isolatedContext.post(`/rest/invitations/${inviteeId}/accept`, {
				data: { inviterId, firstName, lastName, password },
			});

			if (!acceptResponse.ok()) {
				const errorText = await acceptResponse.text();
				throw new TestError(`Failed to accept invitation: ${acceptResponse.status()} ${errorText}`);
			}
		} finally {
			await isolatedContext.dispose();
		}

		return { id: invited.id, email, password, firstName, lastName, role: role as TestUser['role'] };
	}

	async getUsers(options?: { includeRole?: boolean; limit?: number }): Promise<
		Array<{ id: string; email: string; firstName: string; lastName: string; role?: string }>
	> {
		const headers = await this.getApiHeaders();
		const params = new URLSearchParams();

		if (options?.includeRole) params.set('includeRole', 'true');
		if (options?.limit) params.set('limit', options.limit.toString());

		const response = await this.api.request.get('/api/v1/users', { headers, params });

		if (!response.ok()) {
			const errorText = await response.text();
			throw new TestError(`Failed to get users: ${response.status()} ${errorText}`);
		}

		const result = await response.json();
		return result.data;
	}

	async deleteUser(userId: string): Promise<void> {
		const headers = await this.getApiHeaders();
		const response = await this.api.request.delete(`/api/v1/users/${userId}`, { headers });

		if (!response.ok()) {
			const errorText = await response.text();
			throw new TestError(`Failed to delete user: ${response.status()} ${errorText}`);
		}
	}
}
