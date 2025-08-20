// services/api-helper.ts
import type { APIRequestContext } from '@playwright/test';
import { setTimeout as wait } from 'node:timers/promises';

import type { UserCredentials } from '../config/test-users';
import {
	INSTANCE_OWNER_CREDENTIALS,
	INSTANCE_MEMBER_CREDENTIALS,
	INSTANCE_ADMIN_CREDENTIALS,
} from '../config/test-users';
import { TestError } from '../Types';
import { ProjectApiHelper } from './project-api-helper';
import { WorkflowApiHelper } from './workflow-api-helper';

export interface LoginResponseData {
	id: string;
	[key: string]: unknown;
}

export type UserRole = 'owner' | 'admin' | 'member';
export type TestState = 'fresh' | 'reset' | 'signin-only';

const AUTH_TAGS = {
	ADMIN: '@auth:admin',
	OWNER: '@auth:owner',
	MEMBER: '@auth:member',
	NONE: '@auth:none',
} as const;

const DB_TAGS = {
	RESET: '@db:reset',
} as const;

export class ApiHelpers {
	request: APIRequestContext;
	workflowApi: WorkflowApiHelper;
	projectApi: ProjectApiHelper;

	constructor(requestContext: APIRequestContext) {
		this.request = requestContext;
		this.workflowApi = new WorkflowApiHelper(this);
		this.projectApi = new ProjectApiHelper(this);
	}

	// ===== MAIN SETUP METHODS =====

	/**
	 * Setup test environment based on test tags (recommended approach)
	 * @param tags - Array of test tags (e.g., ['@db:reset', '@auth:owner'])
	 * @param memberIndex - Which member to use (if auth role is 'member')
	 *
	 * Examples:
	 * - ['@db:reset'] = reset DB, manual signin required
	 * - ['@db:reset', '@auth:owner'] = reset DB + signin as owner
	 * - ['@auth:admin'] = signin as admin (no reset)
	 */
	async setupFromTags(tags: string[], memberIndex: number = 0): Promise<LoginResponseData | null> {
		const shouldReset = this.shouldResetDatabase(tags);
		const role = this.getRoleFromTags(tags);

		if (shouldReset && role) {
			// Reset + signin
			await this.resetDatabase();
			return await this.signin(role, memberIndex);
		} else if (shouldReset) {
			// Reset only, manual signin required
			await this.resetDatabase();
			return null;
		} else if (role) {
			// Signin only
			return await this.signin(role, memberIndex);
		}

		// No setup required
		return null;
	}

	/**
	 * Setup test environment based on desired state (programmatic approach)
	 * @param state - 'fresh': new container, 'reset': reset DB + signin, 'signin-only': just signin
	 * @param role - User role to sign in as
	 * @param memberIndex - Which member to use (if role is 'member')
	 */
	async setupTest(
		state: TestState,
		role: UserRole = 'owner',
		memberIndex: number = 0,
	): Promise<LoginResponseData | null> {
		switch (state) {
			case 'fresh':
				// For fresh docker container - just reset, no signin needed yet
				await this.resetDatabase();
				return null;

			case 'reset':
				// Reset database then sign in
				await this.resetDatabase();
				return await this.signin(role, memberIndex);

			case 'signin-only':
				// Just sign in without reset
				return await this.signin(role, memberIndex);

			default:
				throw new TestError('Unknown test state');
		}
	}

	// ===== CORE METHODS =====

	async resetDatabase(): Promise<void> {
		const response = await this.request.post('/rest/e2e/reset', {
			data: {
				owner: INSTANCE_OWNER_CREDENTIALS,
				members: INSTANCE_MEMBER_CREDENTIALS,
				admin: INSTANCE_ADMIN_CREDENTIALS,
			},
		});

		if (!response.ok()) {
			const errorText = await response.text();
			throw new TestError(errorText);
		}
		// Adding small delay to ensure database is reset
		await wait(1000);
	}

	async signin(role: UserRole, memberIndex: number = 0): Promise<LoginResponseData> {
		const credentials = this.getCredentials(role, memberIndex);
		return await this.loginAndSetCookies(credentials);
	}

	// ===== CONFIGURATION METHODS =====

	async setFeature(feature: string, enabled: boolean): Promise<void> {
		await this.request.patch('/rest/e2e/feature', {
			data: { feature: `feat:${feature}`, enabled },
		});
	}

	async setQuota(quotaName: string, value: number | string): Promise<void> {
		await this.request.patch('/rest/e2e/quota', {
			data: { feature: `quota:${quotaName}`, value },
		});
	}

	async setQueueMode(enabled: boolean): Promise<void> {
		await this.request.patch('/rest/e2e/queue-mode', {
			data: { enabled },
		});
	}

	// ===== FEATURE FLAG METHODS =====

	async setEnvFeatureFlags(flags: Record<string, string>): Promise<{
		data: {
			success: boolean;
			message: string;
			flags: Record<string, string>;
		};
	}> {
		const response = await this.request.patch('/rest/e2e/env-feature-flags', {
			data: { flags },
		});
		return await response.json();
	}

	async clearEnvFeatureFlags(): Promise<{
		data: {
			success: boolean;
			message: string;
			flags: Record<string, string>;
		};
	}> {
		const response = await this.request.patch('/rest/e2e/env-feature-flags', {
			data: { flags: {} },
		});
		return await response.json();
	}

	async getEnvFeatureFlags(): Promise<{
		data: Record<string, string>;
	}> {
		const response = await this.request.get('/rest/e2e/env-feature-flags');
		return await response.json();
	}

	// ===== CONVENIENCE METHODS =====

	async enableFeature(feature: string): Promise<void> {
		await this.setFeature(feature, true);
	}

	async disableFeature(feature: string): Promise<void> {
		await this.setFeature(feature, false);
	}

	async setMaxTeamProjectsQuota(value: number | string): Promise<void> {
		await this.setQuota('maxTeamProjects', value);
	}

	async get(path: string, params?: URLSearchParams) {
		const response = await this.request.get(path, { params });

		const { data } = await response.json();
		return data;
	}

	// ===== PRIVATE METHODS =====

	private async loginAndSetCookies(
		credentials: Pick<UserCredentials, 'email' | 'password'>,
	): Promise<LoginResponseData> {
		const response = await this.request.post('/rest/login', {
			data: {
				emailOrLdapLoginId: credentials.email,
				password: credentials.password,
			},
		});

		if (!response.ok()) {
			const errorText = await response.text();
			throw new TestError(errorText);
		}

		let responseData: unknown;
		try {
			responseData = await response.json();
		} catch (error: unknown) {
			const errorText = await response.text();
			throw new TestError(errorText);
		}

		const loginData: LoginResponseData = (responseData as { data: LoginResponseData }).data;

		if (!loginData?.id) {
			throw new TestError('Login did not return expected user data (missing user ID)');
		}

		return loginData;
	}

	private getCredentials(role: UserRole, memberIndex: number = 0): UserCredentials {
		switch (role) {
			case 'owner':
				return INSTANCE_OWNER_CREDENTIALS;
			case 'admin':
				return INSTANCE_ADMIN_CREDENTIALS;
			case 'member':
				if (!INSTANCE_MEMBER_CREDENTIALS || memberIndex >= INSTANCE_MEMBER_CREDENTIALS.length) {
					throw new TestError(`No member credentials found for index ${memberIndex}`);
				}
				return INSTANCE_MEMBER_CREDENTIALS[memberIndex];
			default:
				throw new TestError(`Unknown role: ${role as string}`);
		}
	}

	// ===== TAG PARSING METHODS =====

	private shouldResetDatabase(tags: string[]): boolean {
		const lowerTags = tags.map((tag) => tag.toLowerCase());
		return lowerTags.includes(DB_TAGS.RESET.toLowerCase());
	}

	/**
	 * Get the role from the tags
	 * @param tags - Array of test tags (e.g., ['@db:reset', '@auth:owner'])
	 * @returns The role from the tags, or 'owner' if no role is found
	 */
	getRoleFromTags(tags: string[]): UserRole | null {
		const lowerTags = tags.map((tag) => tag.toLowerCase());

		if (lowerTags.includes(AUTH_TAGS.ADMIN.toLowerCase())) return 'admin';
		if (lowerTags.includes(AUTH_TAGS.OWNER.toLowerCase())) return 'owner';
		if (lowerTags.includes(AUTH_TAGS.MEMBER.toLowerCase())) return 'member';
		if (lowerTags.includes(AUTH_TAGS.NONE.toLowerCase())) return null;
		return 'owner';
	}
}
