import { expect, test } from '../../../../fixtures/base';

test.use({ capability: 'external-secrets' });

// LocalStack can take time to start up, and connection tests add latency
test.setTimeout(180_000);

// LocalStack test credentials (AWS_ENDPOINT_URL in the n8n container redirects all SDK calls to LocalStack)
const LOCALSTACK_AWS_SETTINGS = {
	region: 'us-east-1',
	authMethod: 'iamUser',
	accessKeyId: 'test',
	secretAccessKey: 'test',
} as const;

const INVALID_AWS_SETTINGS_REGION = 'us-east/1';

test.describe(
	'Secret Providers Connections UI @capability:external-secrets @licensed',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.beforeEach(async ({ n8n, services }) => {
			await n8n.api.enableFeature('externalSecrets');
			await services.localstack.secretsManager.clear();
		});

		/**
		 * Creates a global connection via the UI settings page, verifies the success
		 * callout and global badge, creates a credential referencing a secret from
		 * the provider, then deletes the connection through the UI delete flow.
		 */
		test('should create a global connection via UI and reference it in a credential', async ({
			n8n,
			services,
		}) => {
			const providerName = 'awsGlobal';

			await services.localstack.secretsManager.createSecret('apikey', 'supersecret');

			await n8n.navigate.toExternalSecrets();
			await n8n.secretsProviderSettings.waitForProvidersLoaded();
			await expect(n8n.secretsProviderSettings.getEmptyState()).toBeVisible();

			await n8n.secretsProviderSettings.clickEmptyStateAddButton();
			await n8n.secretsProviderConnectionModal.waitForModal();

			await n8n.secretsProviderConnectionModal.fillConnectionName(providerName);
			await n8n.secretsProviderConnectionModal.selectProviderType('AWS Secrets Manager');
			await n8n.secretsProviderConnectionModal.fillProviderField(
				'region',
				LOCALSTACK_AWS_SETTINGS.region,
			);
			await n8n.secretsProviderConnectionModal.fillProviderField(
				'accessKeyId',
				LOCALSTACK_AWS_SETTINGS.accessKeyId,
			);
			await n8n.secretsProviderConnectionModal.fillProviderField(
				'secretAccessKey',
				LOCALSTACK_AWS_SETTINGS.secretAccessKey,
			);

			await n8n.secretsProviderConnectionModal.save();
			await expect(n8n.secretsProviderConnectionModal.getSuccessCallout()).toBeVisible();
			await n8n.secretsProviderConnectionModal.close();

			await expect(n8n.secretsProviderSettings.getProviderNameCard(providerName)).toBeVisible();
			await expect(
				n8n.secretsProviderSettings.getProviderCardGlobalBadge(providerName),
			).toBeVisible();

			const credentialName = 'Secret Ref Header Auth';
			await n8n.navigate.toCredentials();
			await n8n.credentials.emptyListCreateCredentialButton.click();
			await n8n.credentials.selectCredentialType('Header Auth');
			await n8n.credentials.credentialModal.waitForModal();
			await n8n.credentials.credentialModal.renameCredential(credentialName);
			// plain text, not expression mode
			await n8n.credentials.credentialModal.fillField('name', 'Authorization');
			// expression mode, referencing the external secret
			await n8n.credentials.credentialModal.fillExpressionField(
				'value',
				`{{ $secrets['${providerName}']['apikey'] }}`,
			);
			await expect(n8n.credentials.credentialModal.getParameterInputHint()).toContainText(
				'*********',
			);
			await n8n.credentials.credentialModal.save();
			await n8n.credentials.credentialModal.close();

			await expect(n8n.credentials.cards.getCredential(credentialName)).toBeVisible();

			await n8n.navigate.toExternalSecrets();
			await n8n.secretsProviderSettings.waitForProvidersLoaded();
			await n8n.secretsProviderSettings.selectCardAction(providerName, 'Delete');
			await n8n.deleteSecretsProviderModal.waitForModal();

			// The credential references this provider, so the user must type the exact provider
			// name into the confirmation input to enable the delete button.
			await n8n.deleteSecretsProviderModal.fillConfirmation(providerName);
			await n8n.deleteSecretsProviderModal.confirmDelete();

			await expect(n8n.secretsProviderSettings.getEmptyState()).toBeVisible();
			await expect(n8n.secretsProviderSettings.getProviderNameCard(providerName)).toBeHidden();
		});

		/**
		 * Creates a global connection via the UI settings page,
		 * creates a connection with invalid region then saves it and verifies that the error banner is shown.
		 * Scopes it to a project and verifies that the connection appears in the project settings and can be referenced from a project credential.
		 */
		test('should create a connection, recover a wrong setting, scope it to a project, and use it in a project credential', async ({
			n8n,
			services,
		}) => {
			const providerName = 'awsGlobalRecovery';

			await services.localstack.secretsManager.createSecret('projectsecret', 'projectvalue');

			const project = await n8n.api.projects.createProject('SecretProject');
			const projectId = project.id;

			await n8n.navigate.toExternalSecrets();
			await n8n.secretsProviderSettings.waitForProvidersLoaded();
			await expect(n8n.secretsProviderSettings.getEmptyState()).toBeVisible();

			await n8n.secretsProviderSettings.clickEmptyStateAddButton();
			await n8n.secretsProviderConnectionModal.waitForModal();

			await n8n.secretsProviderConnectionModal.fillConnectionName(providerName);
			await n8n.secretsProviderConnectionModal.selectProviderType('AWS Secrets Manager');
			await n8n.secretsProviderConnectionModal.fillProviderField(
				'region',
				INVALID_AWS_SETTINGS_REGION,
			);
			await n8n.secretsProviderConnectionModal.fillProviderField(
				'accessKeyId',
				LOCALSTACK_AWS_SETTINGS.accessKeyId,
			);
			await n8n.secretsProviderConnectionModal.fillProviderField(
				'secretAccessKey',
				LOCALSTACK_AWS_SETTINGS.secretAccessKey,
			);

			await n8n.secretsProviderConnectionModal.save();
			await expect(n8n.secretsProviderConnectionModal.getErrorBanner()).toBeVisible();
			await expect(n8n.secretsProviderConnectionModal.getSuccessCallout()).toBeHidden();

			await n8n.secretsProviderConnectionModal.fillProviderField(
				'region',
				LOCALSTACK_AWS_SETTINGS.region,
			);

			await n8n.secretsProviderConnectionModal.save();
			await expect(n8n.secretsProviderConnectionModal.getSuccessCallout()).toBeVisible();

			await n8n.secretsProviderConnectionModal.switchToScopeTab();
			await n8n.secretsProviderConnectionModal.selectScope('SecretProject');
			await n8n.secretsProviderConnectionModal.save();
			await n8n.secretsProviderConnectionModal.close();

			await expect(n8n.secretsProviderSettings.getProviderNameCard(providerName)).toBeVisible();
			await expect(
				n8n.secretsProviderSettings.getProviderCardProjectBadge(providerName),
			).toBeVisible();

			await n8n.navigate.toProjectSettings(projectId);
			await expect(n8n.projectSettings.getExternalSecretsSection()).toBeVisible();
			await expect(n8n.projectSettings.getExternalSecretsTable()).toBeVisible();
			await expect(n8n.projectSettings.getExternalSecretsTableRow(providerName)).toBeVisible();

			const credentialName = 'Project Secret Ref Header Auth';
			await n8n.navigate.toCredentials(projectId);
			await n8n.credentials.emptyListCreateCredentialButton.click();
			await n8n.credentials.selectCredentialType('Header Auth');
			await n8n.credentials.credentialModal.waitForModal();
			await n8n.credentials.credentialModal.renameCredential(credentialName);
			// plain text, not expression mode
			await n8n.credentials.credentialModal.fillField('name', 'Authorization');
			// expression mode, referencing the project-scoped secret
			await n8n.credentials.credentialModal.fillExpressionField(
				'value',
				`{{ $secrets['${providerName}']['projectsecret'] }}`,
			);
			await expect(n8n.credentials.credentialModal.getParameterInputHint()).toContainText(
				'*********',
			);
			await n8n.credentials.credentialModal.save();
			await n8n.credentials.credentialModal.close();

			await expect(n8n.credentials.cards.getCredential(credentialName)).toBeVisible();
		});
	},
);
