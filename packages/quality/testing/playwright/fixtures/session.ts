import { request, type APIRequestContext } from '@playwright/test';

import { ApiHelpers, type UserRole } from '../services/api-helper';
import { TestError } from '../Types';

export type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;
export type SessionRole = UserRole | 'none';

/** The session of an unauthenticated test (`@auth:none`). */
const NO_SESSION: StorageState = { cookies: [], origins: [] };

const ROLES: readonly SessionRole[] = ['admin', 'owner', 'member', 'chat', 'none'];

function lowerCase(tags: string[]): string[] {
	return tags.map((tag) => tag.toLowerCase());
}

/** The role from an `@auth:<role>` tag. A test without the tag signs in as the owner. */
export function roleFromTags(tags: string[]): SessionRole {
	const authTags = lowerCase(tags).filter((tag) => tag.startsWith('@auth:'));
	const role = ROLES.find((candidate) => authTags.includes(`@auth:${candidate}`));
	if (!role && authTags.length > 0) throw new TestError(`Unsupported auth tag: ${authTags[0]}`);
	return role ?? 'owner';
}

export function wantsReset(tags: string[]): boolean {
	return lowerCase(tags).includes('@db:reset');
}

/** Signs in once and returns the session for the API and browser contexts. */
export async function signIn(url: string, role: SessionRole): Promise<StorageState> {
	if (role === 'none') return NO_SESSION;
	await using context = await request.newContext({ baseURL: url });
	await new ApiHelpers(context).signin(role);
	return await context.storageState();
}
