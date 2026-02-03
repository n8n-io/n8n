import { expect, test } from '../../../../fixtures/base';
import type { n8nPage } from '../../../../pages/n8nPage';

test.use({ capability: 'external-secrets' });
test.setTimeout(180_000);

test.describe('AWS Secrets Manager with LocalStack @capability:external-secrets @licensed', () => {
	const PROVIDER_NAME = 'awsSecretsManager';
	const PROVIDER_BASE_URL = `/rest/external-secrets/providers/${PROVIDER_NAME}`;
	const PROVIDER_SETTINGS = {
		region: 'us-east-1',
		authMethod: 'iamUser',
		accessKeyId: 'test',
		secretAccessKey: 'test',
	};

	async function getSecrets(n8n: n8nPage): Promise<string[]> {
		const response = await n8n.api.request.get('/rest/external-secrets/secrets');
		const { data } = await response.json();
		return data[PROVIDER_NAME] ?? [];
	}

	test.beforeEach(async ({ n8n, n8nContainer }) => {
		await n8nContainer.services.localstack.secretsManager.clear();
		await n8n.api.enableFeature('externalSecrets');
	});

	test('can configure, connect, and sync secrets from LocalStack', async ({
		n8n,
		n8nContainer,
	}) => {
		const { secretsManager } = n8nContainer.services.localstack;

		await secretsManager.createSecret('api-key', 'secret-123');

		const settingsResponse = await n8n.api.request.post(PROVIDER_BASE_URL, {
			data: PROVIDER_SETTINGS,
		});
		expect(settingsResponse.ok()).toBeTruthy();

		const testResponse = await n8n.api.request.post(`${PROVIDER_BASE_URL}/test`, {
			data: PROVIDER_SETTINGS,
		});
		expect(testResponse.ok()).toBeTruthy();

		await n8n.api.request.post(`${PROVIDER_BASE_URL}/connect`, { data: { connected: true } });
		await n8n.api.request.post(`${PROVIDER_BASE_URL}/update`);

		expect(await getSecrets(n8n)).toContain('api-key');

		await secretsManager.createSecret('new-secret', 'value-2');
		await n8n.api.request.post(`${PROVIDER_BASE_URL}/update`);

		const secrets = await getSecrets(n8n);
		expect(secrets).toContain('api-key');
		expect(secrets).toContain('new-secret');
	});
});
