import { nanoid } from 'nanoid';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export class RoleApiHelper {
	constructor(private api: ApiHelpers) {}

	/**
	 * Create a custom role with unique name via REST API
	 * @param scopes Array of scope strings (e.g., ['project:read', 'workflow:read'])
	 * @param displayName Base display name for the role (will be made unique with nanoid)
	 * @returns The created role data including slug
	 */
	async createCustomRole(scopes: string[], displayName: string): Promise<{ slug: string }> {
		const uniqueName = `${displayName} (${nanoid(8)})`;
		const response = await this.api.request.post('/rest/roles', {
			data: {
				displayName: uniqueName,
				description: `Custom role with scopes: ${scopes.join(', ')}`,
				roleType: 'project',
				scopes,
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create custom role: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data;
	}

	/**
	 * Delete a custom role by slug
	 * @param slug The role slug to delete
	 * @returns True if deletion was successful
	 */
	async deleteRole(slug: string): Promise<boolean> {
		const response = await this.api.request.delete(`/rest/roles/${slug}`);

		if (!response.ok()) {
			throw new TestError(`Failed to delete role: ${await response.text()}`);
		}

		return true;
	}
}
