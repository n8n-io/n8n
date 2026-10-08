import { experienceModeSchema, type ExperienceMode, type User } from '@n8n/api-types';
import type { APIResponse } from '@playwright/test';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

/** Fills the fields that the caller did not set. */
function withUserDefaults(options: Partial<TestUser>): Omit<TestUser, 'id'> {
	return {
		email: options.email?.toLowerCase() ?? `testuser${nanoid()}@test.com`,
		password: options.password ?? 'PlaywrightTest123',
		firstName: options.firstName ?? 'Test',
		lastName: options.lastName ?? `User${nanoid()}`,
		role: options.role ?? 'global:member',
	};
}

// Only the settings field that the experience-mode helpers read.
const currentUserResponseSchema = z.object({
	data: z.object({
		settings: z
			.object({ experienceMode: experienceModeSchema.optional() })
			.passthrough()
			.optional(),
	}),
});

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
		const user = withUserDefaults(options);

		// Invite user
		const inviteResponse = await this.api.request.post('/rest/invitations', {
			data: [{ email: user.email, role: user.role }],
		});
		if (!inviteResponse.ok()) {
			throw new TestError(`Failed to invite user: ${inviteResponse.status()}`);
		}
		const inviteData = await inviteResponse.json();
		const { id, inviteAcceptUrl } = inviteData.data[0].user;

		// Accept invitation (invite URL contains token, e.g. /signup?token=...)
		const url = new URL(inviteAcceptUrl);
		const token = url.searchParams.get('token');
		if (!token) {
			throw new TestError(`Invite URL has no token: ${inviteAcceptUrl}`);
		}

		const acceptResponse = await this.api.request.post('/rest/invitations/accept', {
			data: {
				token,
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
	 * Triggers a password reset email for the given address. Returns the raw
	 * response so callers can assert on the status (the endpoint returns 200 even
	 * for unknown emails to avoid leaking which accounts exist).
	 */
	async forgotPassword(email: string): Promise<APIResponse> {
		return await this.api.request.post('/rest/forgot-password', {
			data: { email },
		});
	}

	/**
	 * The Simple or Power mode that the signed-in user saved. Undefined when the user
	 * has not chosen one, so the instance default applies.
	 */
	async getExperienceMode(): Promise<ExperienceMode | undefined> {
		const response = await this.api.request.get('/rest/login');
		if (!response.ok()) {
			throw new TestError(`Failed to read the current user (${response.status()})`);
		}
		const body = currentUserResponseSchema.parse(await response.json());
		return body.data.settings?.experienceMode;
	}

	/** Saves the Simple or Power mode for the signed-in user, as the sidebar switch does. */
	async setExperienceMode(mode: ExperienceMode): Promise<void> {
		const response = await this.api.request.patch('/rest/me/settings', {
			data: { experienceMode: mode },
		});
		if (!response.ok()) {
			throw new TestError(
				`Failed to save the experience mode (${response.status()}): ${await response.text()}`,
			);
		}
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
