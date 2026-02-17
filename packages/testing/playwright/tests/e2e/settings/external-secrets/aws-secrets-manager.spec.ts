import { expect, test } from '../../../../fixtures/base';

test.use({ capability: 'external-secrets' });
test.setTimeout(180_000);

test.describe(
	'AWS Secrets Manager with LocalStack @capability:external-secrets @licensed',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		const PROVIDER_NAME = 'awsSecretsManager';
		const PROVIDER_SETTINGS = {
			region: 'us-east-1',
			authMethod: 'iamUser',
			accessKeyId: 'test',
			secretAccessKey: 'test',
		};

		test.beforeEach(async ({ n8n, services }) => {
			await services.localstack.secretsManager.clear();
			await n8n.api.enableFeature('externalSecrets');
		});

		test('can configure, connect, and sync secrets from LocalStack', async ({ n8n, services }) => {
			const { secretsManager } = services.localstack;

			await secretsManager.createSecret('api-key', 'secret-123');

			await n8n.api.externalSecrets.saveProviderSettings(PROVIDER_NAME, PROVIDER_SETTINGS);
			await n8n.api.externalSecrets.testProvider(PROVIDER_NAME, PROVIDER_SETTINGS);
			await n8n.api.externalSecrets.connectProvider(PROVIDER_NAME);
			await n8n.api.externalSecrets.updateProvider(PROVIDER_NAME);

			expect(await n8n.api.externalSecrets.getSecrets(PROVIDER_NAME)).toContain('api-key');

			await secretsManager.createSecret('new-secret', 'value-2');
			await n8n.api.externalSecrets.updateProvider(PROVIDER_NAME);

			const secrets = await n8n.api.externalSecrets.getSecrets(PROVIDER_NAME);
			expect(secrets).toContain('api-key');
			expect(secrets).toContain('new-secret');
		});
	},
);
