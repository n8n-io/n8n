import type {
	CreateCredentialDto,
	CredentialsGetManyRequestQuery,
	CredentialsGetOneRequestQuery,
} from '@n8n/api-types';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

interface CredentialResponse {
	id: string;
	name: string;
	type: string;
	data?: ICredentialDataDecryptedObject;
	scopes?: string[];
	shared?: Array<{
		id: string;
		projectId: string;
		role: string;
	}>;
	createdAt: string;
	updatedAt: string;
}

type CredentialImportResult = {
	credentialId: string;
	createdCredential: CredentialResponse;
};

export class CredentialApiHelper {
	constructor(private api: ApiHelpers) {}

	/**
	 * Create a new credential
	 *
	 * Notes:
	 * - The `type` field is the credential type ID (e.g., 'notionApi'), which differs from the UI display name (e.g., 'Notion API').
	 * - You can find available credential type IDs in the codebase under `packages/nodes-base/credentials/*.credentials.ts` and by inspecting node credential references (e.g., Notion nodes use `type: 'notionApi'`).
	 */
	async createCredential(credential: CreateCredentialDto): Promise<CredentialResponse> {
		const response = await this.api.request.post('/rest/credentials', { data: credential });

		if (!response.ok()) {
			throw new TestError(`Failed to create credential: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Get all credentials with optional query parameters
	 */
	async getCredentials(query?: CredentialsGetManyRequestQuery): Promise<CredentialResponse[]> {
		const params = new URLSearchParams();
		if (query?.includeScopes) params.set('includeScopes', String(query.includeScopes));
		if (query?.includeData) params.set('includeData', String(query.includeData));
		if (query?.onlySharedWithMe) params.set('onlySharedWithMe', String(query.onlySharedWithMe));

		const response = await this.api.request.get('/rest/credentials', { params });

		if (!response.ok()) {
			throw new TestError(`Failed to get credentials: ${await response.text()}`);
		}

		const result = await response.json();
		return Array.isArray(result) ? result : (result.data ?? []);
	}

	/**
	 * Get a specific credential by ID
	 */
	async getCredential(
		credentialId: string,
		query?: CredentialsGetOneRequestQuery,
	): Promise<CredentialResponse> {
		const params = new URLSearchParams();
		if (query?.includeData) params.set('includeData', String(query.includeData));

		const response = await this.api.request.get(`/rest/credentials/${credentialId}`, { params });

		if (!response.ok()) {
			throw new TestError(`Failed to get credential: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Update an existing credential
	 */
	async updateCredential(
		credentialId: string,
		updates: Partial<CreateCredentialDto>,
	): Promise<CredentialResponse> {
		const existingCredential = await this.getCredential(credentialId);

		const updateData = {
			name: existingCredential.name,
			type: existingCredential.type,
			...updates,
		};

		const response = await this.api.request.patch(`/rest/credentials/${credentialId}`, {
			data: updateData,
		});

		if (!response.ok()) {
			throw new TestError(`Failed to update credential: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Delete a credential
	 */
	async deleteCredential(credentialId: string): Promise<boolean> {
		const response = await this.api.request.delete(`/rest/credentials/${credentialId}`);

		if (!response.ok()) {
			throw new TestError(`Failed to delete credential: ${await response.text()}`);
		}

		return true;
	}

	/**
	 * Get credentials available for a specific workflow or project
	 */
	async getCredentialsForWorkflow(options: {
		workflowId?: string;
		projectId?: string;
	}): Promise<CredentialResponse[]> {
		const params = new URLSearchParams();
		if (options.workflowId) params.set('workflowId', options.workflowId);
		if (options.projectId) params.set('projectId', options.projectId);

		const response = await this.api.request.get('/rest/credentials/for-workflow', { params });

		if (!response.ok()) {
			throw new TestError(`Failed to get credentials for workflow: ${await response.text()}`);
		}

		const result = await response.json();
		return Array.isArray(result) ? result : (result.data ?? []);
	}

	/**
	 * Transfer a credential to another project
	 */
	async transferCredential(credentialId: string, destinationProjectId: string): Promise<void> {
		const response = await this.api.request.put(`/rest/credentials/${credentialId}/transfer`, {
			data: { destinationProjectId },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to transfer credential: ${await response.text()}`);
		}
	}

	/**
	 * Make credential unique by adding a unique suffix to avoid naming conflicts in tests.
	 */
	private makeCredentialUnique(
		credential: CreateCredentialDto,
		options?: { idLength?: number },
	): CreateCredentialDto {
		const idLength = options?.idLength ?? 8;
		const uniqueSuffix = nanoid(idLength);

		return {
			...credential,
			name: `${credential.name} (Test ${uniqueSuffix})`,
		};
	}

	/**
	 * Create a credential from definition with automatic unique naming for testing.
	 * Returns detailed information about what was created.
	 */
	async createCredentialFromDefinition(
		credential: CreateCredentialDto,
		options?: { idLength?: number },
	): Promise<CredentialImportResult> {
		const uniqueCredential = this.makeCredentialUnique(credential, options);
		const createdCredential = await this.createCredential(uniqueCredential);
		const credentialId = createdCredential.id;

		return {
			credentialId,
			createdCredential,
		};
	}
}
