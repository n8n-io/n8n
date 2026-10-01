import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

interface ExternalSecretsProviderSettings {
	region: string;
	authMethod: string;
	accessKeyId: string;
	secretAccessKey: string;
}

interface SecretProviderConnectionDto {
	providerKey: string;
	type: string;
	projectIds?: string[];
	settings: ExternalSecretsProviderSettings;
}

export class ExternalSecretsApiHelper {
	constructor(private api: ApiHelpers) {}

	async getSecrets(providerName: string): Promise<string[]> {
		const response = await this.api.request.get('/rest/external-secrets/secrets');

		if (!response.ok()) {
			throw new TestError(`Failed to get secrets: ${await response.text()}`);
		}

		const { data } = await response.json();
		return data[providerName] ?? [];
	}

	async saveProviderSettings(
		providerName: string,
		settings: ExternalSecretsProviderSettings,
	): Promise<void> {
		const response = await this.api.request.post(
			`/rest/external-secrets/providers/${providerName}`,
			{ data: settings },
		);

		if (!response.ok()) {
			throw new TestError(`Failed to save provider settings: ${await response.text()}`);
		}
	}

	async testProvider(
		providerName: string,
		settings: ExternalSecretsProviderSettings,
	): Promise<void> {
		const response = await this.api.request.post(
			`/rest/external-secrets/providers/${providerName}/test`,
			{ data: settings },
		);

		if (!response.ok()) {
			throw new TestError(`Failed to test provider: ${await response.text()}`);
		}
	}

	async connectProvider(providerName: string): Promise<void> {
		const response = await this.api.request.post(
			`/rest/external-secrets/providers/${providerName}/connect`,
			{ data: { connected: true } },
		);

		if (!response.ok()) {
			throw new TestError(`Failed to connect provider: ${await response.text()}`);
		}
	}

	async updateProvider(providerName: string): Promise<void> {
		const response = await this.api.request.post(
			`/rest/external-secrets/providers/${providerName}/update`,
		);

		if (!response.ok()) {
			throw new TestError(`Failed to update provider: ${await response.text()}`);
		}
	}

	async createConnection(
		connection: SecretProviderConnectionDto,
	): Promise<Record<string, unknown>> {
		const response = await this.api.request.post('/rest/secret-providers/connections', {
			data: connection,
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create connection: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async deleteConnection(providerKey: string): Promise<void> {
		const response = await this.api.request.delete(
			`/rest/secret-providers/connections/${providerKey}`,
		);

		if (!response.ok()) {
			throw new TestError(`Failed to delete connection: ${await response.text()}`);
		}
	}
}
