import type { Folder, Project } from '@n8n/db';
import { nanoid } from 'nanoid';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export class ProjectApiHelper {
	constructor(private api: ApiHelpers) {}

	/**
	 * Create a new project with a unique name
	 * @param projectName Optional base name for the project. If not provided, generates a default name.
	 * @returns The created project data
	 */
	async createProject(projectName?: string): Promise<Project> {
		const uniqueName = projectName ? `${projectName} (${nanoid(8)})` : `Test Project ${nanoid(8)}`;

		const response = await this.api.request.post('/rest/projects', {
			data: {
				name: uniqueName,
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create project: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Get the current logged-in user's personal project.
	 * Uses the dedicated /rest/projects/personal endpoint which returns
	 * only the authenticated user's personal project, not all visible personal projects.
	 * @returns The current user's personal project
	 */
	async getMyPersonalProject(): Promise<Project> {
		const response = await this.api.request.get('/rest/projects/personal');

		if (!response.ok()) {
			throw new TestError(`Failed to get personal project: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Delete a project
	 * @param projectId The ID of the project to delete
	 * @returns True if deletion was successful
	 */
	async deleteProject(projectId: string): Promise<boolean> {
		const response = await this.api.request.delete(`/rest/projects/${projectId}`);

		if (!response.ok()) {
			throw new TestError(`Failed to delete project: ${await response.text()}`);
		}

		return true;
	}

	/**
	 * Create a new folder in a project
	 * @param projectId The ID of the project to create the folder in
	 * @param folderName The name of the folder to create
	 * @param parentFolderId Optional parent folder ID for nested folders
	 * @returns The created folder data
	 */
	async createFolder(
		projectId: string,
		folderName?: string,
		parentFolderId?: string,
	): Promise<Folder> {
		const uniqueName = folderName ? `${folderName} (${nanoid(8)})` : `Test Folder ${nanoid(8)}`;
		const response = await this.api.request.post(`/rest/projects/${projectId}/folders`, {
			data: {
				name: uniqueName,
				...(parentFolderId && { parentFolderId }),
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create folder: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Update a folder
	 * @param projectId The ID of the project containing the folder
	 * @param folderId The ID of the folder to update
	 * @param updates Object containing folder updates (name, parentFolderId, tagIds)
	 * @returns True if update was successful
	 */
	async updateFolder(
		projectId: string,
		folderId: string,
		updates: { name?: string; parentFolderId?: string; tagIds?: string[] },
	): Promise<boolean> {
		const response = await this.api.request.patch(
			`/rest/projects/${projectId}/folders/${folderId}`,
			{
				data: updates,
			},
		);

		if (!response.ok()) {
			throw new TestError(`Failed to update folder: ${await response.text()}`);
		}

		return true;
	}

	/**
	 * Delete a folder
	 * @param projectId The ID of the project containing the folder
	 * @param folderId The ID of the folder to delete
	 * @param deleteWorkflows Whether to delete workflows in the folder (default: false)
	 * @returns True if deletion was successful
	 */
	async deleteFolder(
		projectId: string,
		folderId: string,
		deleteWorkflows: boolean = false,
	): Promise<boolean> {
		const response = await this.api.request.delete(
			`/rest/projects/${projectId}/folders/${folderId}?deleteWorkflows=${deleteWorkflows}`,
		);

		if (!response.ok()) {
			throw new TestError(`Failed to delete folder: ${await response.text()}`);
		}

		return true;
	}

	/**
	 * Get folder tree for a specific folder
	 * @param projectId The ID of the project
	 * @param folderId The ID of the folder to get the tree for
	 * @returns The folder tree data
	 */
	async getFolderTree(projectId: string, folderId: string) {
		const response = await this.api.request.get(
			`/rest/projects/${projectId}/folders/${folderId}/tree`,
		);

		if (!response.ok()) {
			throw new TestError(`Failed to get folder tree: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * List folders in a project
	 * @param projectId The ID of the project
	 * @param filters Optional filters for the folder list
	 * @returns The folder list data
	 */
	async listFolders(projectId: string, filters?: { search?: string; parentFolderId?: string }) {
		const queryParams = new URLSearchParams();
		if (filters?.search) queryParams.append('search', filters.search);
		if (filters?.parentFolderId) queryParams.append('parentFolderId', filters.parentFolderId);

		const url = `/rest/projects/${projectId}/folders${queryParams.toString() ? `?${queryParams}` : ''}`;
		const response = await this.api.request.get(url);

		if (!response.ok()) {
			throw new TestError(`Failed to list folders: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Get folder content (counts of sub-folders and workflows)
	 * @param projectId The ID of the project
	 * @param folderId The ID of the folder
	 * @returns Folder content counts
	 */
	async getFolderContent(projectId: string, folderId: string) {
		const response = await this.api.request.get(
			`/rest/projects/${projectId}/folders/${folderId}/content`,
		);

		if (!response.ok()) {
			throw new TestError(`Failed to get folder content: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Private helper: Add multiple users to a project
	 * @param projectId The ID of the project
	 * @param relations Array of userId and role pairs
	 * @returns True if users were added successfully
	 */
	private async addUsersToProject(
		projectId: string,
		relations: Array<{ userId: string; role: string }>,
	): Promise<boolean> {
		const response = await this.api.request.post(`/rest/projects/${projectId}/users`, {
			data: { relations },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to add users to project: ${await response.text()}`);
		}

		return true;
	}

	/**
	 * Add a user to a project
	 * @param projectId The ID of the project
	 * @param userId The ID of the user to add
	 * @param role The role to assign to the user (e.g., 'project:editor', 'project:viewer', 'project:admin')
	 * @returns True if user was added successfully
	 */
	async addUserToProject(projectId: string, userId: string, role: string): Promise<boolean> {
		return await this.addUsersToProject(projectId, [{ userId, role }]);
	}

	/**
	 * Add a user to a project by email
	 * @param projectId The ID of the project
	 * @param email The email of the user to add
	 * @param role The role to assign to the user (e.g., 'project:editor', 'project:viewer', 'project:admin')
	 * @returns True if user was added successfully
	 */
	async addUserToProjectByEmail(projectId: string, email: string, role: string): Promise<boolean> {
		const user = await this.api.users.getUserByEmail(email);
		if (!user) {
			throw new TestError(`User with email ${email} not found`);
		}
		return await this.addUserToProject(projectId, user.id, role);
	}

	/**
	 * Add multiple users to a project by their emails
	 * @param projectId The ID of the project
	 * @param userRoles Array of user emails and their roles
	 * @returns True if all users were added successfully
	 * @example
	 * await addMultipleUsersToProjectByEmails(projectId, [
	 *   { email: 'user1@test.com', role: 'project:editor' },
	 *   { email: 'user2@test.com', role: 'project:viewer' }
	 * ]);
	 */
	async addMultipleUsersToProjectByEmails(
		projectId: string,
		userRoles: Array<{ email: string; role: string }>,
	): Promise<boolean> {
		// Fetch all users and build relations in parallel
		const relations = await Promise.all(
			userRoles.map(async ({ email, role }) => {
				const user = await this.api.users.getUserByEmail(email);
				if (!user) {
					throw new TestError(`User with email ${email} not found`);
				}
				return { userId: user.id, role };
			}),
		);

		return await this.addUsersToProject(projectId, relations);
	}
}
