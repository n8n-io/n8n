import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export type ProjectFileConflictMode = 'replace' | 'keepBoth' | 'error';

export interface ProjectFileRecord {
	id: string;
	name: string;
	mimeType: string;
	sizeBytes: number;
	projectId: string;
	createdAt: string;
	updatedAt: string;
}

export interface FileStorageLimits {
	totalBytes: number;
	maxBytes: number;
	quotaStatus: 'ok' | 'warn' | 'error';
}

/**
 * API helper for the file-storage module (project-scoped files).
 * Endpoints live under `/rest/projects/:projectId/files` with an
 * instance-wide aggregate under `/rest/files`.
 */
export class FileApiHelper {
	constructor(private api: ApiHelpers) {}

	/**
	 * Upload a file into a project via multipart POST. Throws on failure —
	 * use {@link tryUploadFile} for error-path assertions.
	 */
	async uploadFile(
		projectId: string,
		name: string,
		content: string | Buffer,
		options?: { mimeType?: string; conflict?: ProjectFileConflictMode },
	): Promise<ProjectFileRecord> {
		const response = await this.tryUploadFile(projectId, name, content, options);

		if (!response.ok()) {
			throw new TestError(
				`Failed to upload file '${name}' (${response.status()}): ${await response.text()}`,
			);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Upload a file and return the raw response without asserting success.
	 * Use for quota / per-file-size rejection tests.
	 */
	async tryUploadFile(
		projectId: string,
		name: string,
		content: string | Buffer,
		options?: { mimeType?: string; conflict?: ProjectFileConflictMode },
	): Promise<APIResponse> {
		return await this.api.request.post(`/rest/projects/${projectId}/files`, {
			params: options?.conflict ? { conflict: options.conflict } : {},
			multipart: {
				file: {
					name,
					mimeType: options?.mimeType ?? 'text/plain',
					buffer: typeof content === 'string' ? Buffer.from(content) : content,
				},
			},
		});
	}

	async listFiles(
		projectId: string,
		filter?: { name?: string },
	): Promise<{ count: number; data: ProjectFileRecord[] }> {
		const response = await this.api.request.get(`/rest/projects/${projectId}/files`, {
			params: filter?.name ? { filter: JSON.stringify({ name: filter.name }) } : {},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to list files (${response.status()}): ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async renameFile(projectId: string, fileId: string, name: string): Promise<ProjectFileRecord> {
		const response = await this.api.request.patch(`/rest/projects/${projectId}/files/${fileId}`, {
			data: { name },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to rename file (${response.status()}): ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async deleteFile(projectId: string, fileId: string): Promise<void> {
		const response = await this.api.request.delete(`/rest/projects/${projectId}/files/${fileId}`);

		if (!response.ok()) {
			throw new TestError(`Failed to delete file (${response.status()}): ${await response.text()}`);
		}
	}

	/** Instance-wide storage usage from `GET /rest/files/limits`. */
	async getLimits(): Promise<FileStorageLimits> {
		const response = await this.api.request.get('/rest/files/limits');

		if (!response.ok()) {
			throw new TestError(
				`Failed to fetch file storage limits (${response.status()}): ${await response.text()}`,
			);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Whether the file-storage REST surface is registered. False when the
	 * module is disabled (`N8N_DISABLED_MODULES=file-storage`), where the
	 * routes are never mounted and return 404.
	 */
	async isFileStorageAvailable(): Promise<boolean> {
		const response = await this.api.request.get('/rest/files/limits');
		return response.ok();
	}
}
