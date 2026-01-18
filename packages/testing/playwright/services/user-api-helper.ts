import type { User } from '@n8n/api-types';
import { customAlphabet } from 'nanoid';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

export interface TestUser {
	id: string;
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	role: 'global:owner' | 'global:admin' | 'global:member';
}

/**
 * Creates test users via n8n's invitation API.
 * Note: Using this with n8n.api will affect browser cookies. Use with the isolated api fixture instead unless you want to overwrite the existing user
 */
export class UserApiHelper {
	constructor(private api: ApiHelpers) {}

	/**
	 * Create and activate a test user
	 */
	async create(options: Partial<TestUser> = {}): Promise<TestUser> {
		const user = {
			email: options.email?.toLowerCase() ?? `testuser${nanoid()}@test.com`,
			password: options.password ?? 'PlaywrightTest123',
			firstName: options.firstName ?? 'Test',
			lastName: options.lastName ?? `User${nanoid()}`,
			role: options.role ?? 'global:member',
		};

		// Invite user
		const inviteResponse = await this.api.request.post('/rest/invitations', {
			data: [{ email: user.email, role: user.role }],
		});
		if (!inviteResponse.ok()) {
			throw new TestError(`Failed to invite user: ${inviteResponse.status()}`);
		}
		const inviteData = await inviteResponse.json();
		const { id, inviteAcceptUrl } = inviteData.data[0].user;

		// Accept invitation
		const url = new URL(inviteAcceptUrl);
		const inviterId = url.searchParams.get('inviterId');
		const inviteeId = url.searchParams.get('inviteeId');

		const acceptResponse = await this.api.request.post(`/rest/invitations/${inviteeId}/accept`, {
			data: {
				inviterId,
				firstName: user.firstName,
				lastName: user.lastName,
				password: user.password,
			},
		});
		if (!acceptResponse.ok()) {
			throw new TestError(`Failed to accept invitation: ${acceptResponse.status()}`);
		}

		return { id, ...user };
	}

	/**
	 * Delete a user
	 */
	async delete(userId: string): Promise<void> {
		await this.api.request.delete(`/rest/users/${userId}`);
	}

	/**
	 * Get all users, with optional filtering by email, firstName, lastName, or fullText search
	 */
	async getUsers(options?: {
		filter?: { email?: string; firstName?: string; lastName?: string; fullText?: string };
	}): Promise<User[]> {
		const params = new URLSearchParams();
		if (options?.filter) {
			params.set('filter', JSON.stringify(options.filter));
		}

		const response = await this.api.request.get('/rest/users', { params });
		if (!response.ok()) {
			throw new TestError(`Failed to get users: ${response.status()}`);
		}
		const json = await response.json();
		// API returns { data: { count, items: [...users] } }
		return json.data?.items ?? [];
	}

	/**
	 * Get a single user by email address
	 * @param email - The email address to search for
	 * @returns User object if found, null if no user exists with that email
	 */
	async getUserByEmail(email: string): Promise<User | null> {
		const users = await this.getUsers({ filter: { email } });
		return users[0] ?? null;
	}
}
