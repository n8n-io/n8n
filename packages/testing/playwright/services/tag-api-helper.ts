import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export interface Tag {
	id: string;
	name: string;
	createdAt?: string;
	updatedAt?: string;
}

/**
 * Helper class for managing tags via the n8n API
 */
export class TagApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	/**
	 * Create a new tag
	 * @param name - The name of the tag to create
	 * @returns The created tag with its ID
	 */
	async create(name: string): Promise<Tag> {
		const response = await this.api.request.post('/rest/tags', {
			data: { name },
		});

		if (!response.ok()) {
			throw new TestError(
				`Failed to create tag "${name}": ${response.status()} ${await response.text()}`,
			);
		}

		const result = await response.json();
		// Unwrap the data property if it exists
		return result.data ?? result;
	}

	/**
	 * Delete a tag by ID
	 * @param id - The ID of the tag to delete
	 */
	async delete(id: string): Promise<void> {
		const response = await this.api.request.delete(`/rest/tags/${id}`);

		if (!response.ok()) {
			throw new TestError(`Failed to delete tag ${id}: ${response.status()}`);
		}
	}

	/**
	 * Get all tags
	 * @returns Array of all tags
	 */
	async getAll(): Promise<Tag[]> {
		const response = await this.api.request.get('/rest/tags');

		if (!response.ok()) {
			throw new TestError(`Failed to get tags: ${response.status()}`);
		}

		const result = await response.json();
		return Array.isArray(result) ? result : (result.data ?? []);
	}
}
