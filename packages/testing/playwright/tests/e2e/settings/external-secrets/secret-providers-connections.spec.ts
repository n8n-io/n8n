import { expect, test } from '../../../../fixtures/base';

test.use({ capability: 'external-secrets' });

// LocalStack can take time to start up
test.setTimeout(180_000);

test.describe('Secret Providers Connections with LocalStack @capability:external-secrets @licensed', () => {
	const PROVIDER_KEY = 'aws-localstack-e2e';
	const PROVIDER_TYPE = 'awsSecretsManager';

	test.beforeEach(async ({ n8n, n8nContainer }) => {
		// N8N_ENV_FEAT_EXTERNAL_SECRETS_FOR_PROJECTS is set at container startup
		// via the external-secrets capability config

		// Enable the external secrets license feature
		await n8n.api.enableFeature('externalSecrets');

		// Clear any existing secrets from previous tests
		await n8nContainer.services.localstack.secretsManager.clear();
	});

	test.afterEach(async ({ n8n }) => {
		// Clean up: delete the test connection if it exists
		try {
			await n8n.api.request.delete(`/rest/secret-providers/connections/${PROVIDER_KEY}`);
		} catch {
			// Ignore errors if connection doesn't exist
		}
	});

	test('can create a connection pointing to LocalStack', async ({ n8n, n8nContainer }) => {
		// Arrange: Seed secrets in LocalStack
		await n8nContainer.services.localstack.secretsManager.createSecret('e2e-api-key', 'secret-123');
		await n8nContainer.services.localstack.secretsManager.createSecret(
			'e2e-db-credentials',
			JSON.stringify({ username: 'admin', password: 'hunter2' }),
		);

		// Verify secrets exist in LocalStack
		const secrets = await n8nContainer.services.localstack.secretsManager.listSecrets();
		expect(secrets).toContain('e2e-api-key');
		expect(secrets).toContain('e2e-db-credentials');

		// Act: Create a connection with settings that would work with LocalStack
		// (n8n container has AWS_ENDPOINT_URL set to point to LocalStack)
		const createResponse = await n8n.api.request.post('/rest/secret-providers/connections', {
			data: {
				providerKey: PROVIDER_KEY,
				type: PROVIDER_TYPE,
				projectIds: [],
				settings: {
					region: 'us-east-1',
					authMethod: 'iamUser',
					accessKeyId: 'test',
					secretAccessKey: 'test',
				},
			},
		});

		// Assert: Connection created successfully
		expect(createResponse.ok()).toBeTruthy();
		const created = await createResponse.json();
		expect(created.data.name).toBe(PROVIDER_KEY);
		expect(created.data.type).toBe(PROVIDER_TYPE);

		// TODO - this test should verify that the secrets are loaded - but that functionality is not there yet
	});
});
