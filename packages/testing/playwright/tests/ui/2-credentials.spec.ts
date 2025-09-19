import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';

test.describe('Credentials', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
	});

	test('should create a new credential using empty state', async ({ n8n }) => {
		const projectId = await n8n.start.fromNewProject();
		const credentialName = `My awesome Notion account ${nanoid()}`;

		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: '1234567890' },
			{ name: credentialName, projectId },
		);

		await expect(n8n.credentials.credentialCards).toHaveCount(1);
		await expect(n8n.credentials.getCredentialByName(credentialName)).toBeVisible();
	});

	test('should sort credentials', async ({ n8n, api }) => {
		const projectId = await n8n.start.fromNewProject();
		const credentialA = `A Credential ${nanoid()}`;
		const credentialZ = `Z Credential ${nanoid()}`;

		await api.credentialApi.createCredential({
			name: credentialA,
			type: 'notionApi',
			data: { apiKey: '1234567890' },
			projectId,
		});

		await api.credentialApi.createCredential({
			name: credentialZ,
			type: 'trelloApi',
			data: { apiKey: 'test_api_key', apiToken: 'test_api_token' },
			projectId,
		});

		await n8n.navigate.toCredentials(projectId);
		await n8n.credentials.clearSearch();
		await n8n.credentials.sortByNameDescending();

		const firstCardDescending = n8n.credentials.credentialCards.first();
		await expect(firstCardDescending).toContainText(credentialZ);

		await n8n.credentials.sortByNameAscending();

		const firstCardAscending = n8n.credentials.credentialCards.first();
		await expect(firstCardAscending).toContainText(credentialA);
	});

	test('should create credentials from NDV for node with multiple auth options', async ({
		n8n,
	}) => {
		await n8n.start.fromNewProjectBlankCanvas();
		const credentialName = `My Google OAuth2 Account ${nanoid()}`;

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Gmail', { action: 'Send a message' });

		await n8n.ndv.clickCreateNewCredential();

		await expect(
			n8n.canvas.credentialModal
				.getModal()
				.getByTestId('node-auth-type-selector')
				.locator('label.el-radio'),
		).toHaveCount(2);

		await n8n.canvas.credentialModal
			.getModal()
			.getByTestId('node-auth-type-selector')
			.locator('label.el-radio')
			.first()
			.click();

		await n8n.canvas.credentialModal.addCredential(
			{
				clientId: 'test_client_id',
				clientSecret: 'test_client_secret',
			},
			{ name: credentialName },
		);

		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(credentialName);
	});

	test('should show multiple credential types in the same dropdown', async ({ n8n, api }) => {
		const projectId = await n8n.start.fromNewProjectBlankCanvas();
		const serviceAccountCredentialName2 = `OAuth2 Credential ${nanoid()}`;
		const serviceAccountCredentialName = `Service Account Credential ${nanoid()}`;

		await api.credentialApi.createCredential({
			name: serviceAccountCredentialName2,
			type: 'googleApi',
			data: { email: 'test@service.com', privateKey: 'test_key' },
			projectId,
		});

		await api.credentialApi.createCredential({
			name: serviceAccountCredentialName,
			type: 'googleApi',
			data: { email: 'test@service.com', privateKey: 'test_key' },
			projectId,
		});

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Gmail', { action: 'Send a message' });

		await n8n.ndv.getCredentialSelect().click();
		await expect(n8n.ndv.getCredentialOptionByText(serviceAccountCredentialName2)).toBeVisible();
		await expect(n8n.ndv.getCredentialOptionByText(serviceAccountCredentialName)).toBeVisible();
		await expect(n8n.ndv.credentialDropdownCreateNewCredential()).toBeVisible();
		await expect(n8n.ndv.getCredentialDropdownOptions()).toHaveCount(2);
	});

	test('should correctly render required and optional credentials', async ({ n8n }) => {
		await n8n.start.fromNewProjectBlankCanvas();

		await n8n.canvas.addNode('Pipedrive', { trigger: 'On new Pipedrive event' });
		await n8n.ndv.selectOptionInParameterDropdown('incomingAuthentication', 'Basic Auth');
		await expect(n8n.ndv.getNodeCredentialsSelect()).toHaveCount(2);

		await n8n.ndv.clickCreateNewCredential(0);
		await expect(
			n8n.canvas.credentialModal
				.getModal()
				.getByTestId('node-auth-type-selector')
				.locator('label.el-radio'),
		).toHaveCount(2);
		await n8n.canvas.credentialModal.close();

		await n8n.ndv.clickCreateNewCredential(1);
		await expect(n8n.canvas.credentialModal.getModal()).toBeVisible();
		await expect(n8n.canvas.credentialModal.getAuthMethodSelector()).toBeHidden();
		await n8n.canvas.credentialModal.close();
	});

	test('should create credentials from NDV for node with no auth options', async ({ n8n }) => {
		await n8n.start.fromNewProjectBlankCanvas();
		const credentialName = `My Trello Account ${nanoid()}`;

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Trello', { action: 'Create a card' });

		await n8n.credentialsComposer.createFromNdv(
			{
				apiKey: 'test_api_key',
				apiToken: 'test_api_token',
			},
			{ name: credentialName },
		);

		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(credentialName);
	});

	test('should delete credentials from NDV', async ({ n8n }) => {
		await n8n.start.fromNewProjectBlankCanvas();
		const credentialName = `Notion Credential ${nanoid()}`;

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Notion', { action: 'Append a block' });

		await n8n.credentialsComposer.createFromNdv({ apiKey: '1234567890' }, { name: credentialName });
		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(credentialName);

		await n8n.canvas.credentialModal.editCredential();
		await n8n.canvas.credentialModal.deleteCredential();
		await n8n.canvas.credentialModal.confirmDelete();

		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Credential deleted'),
		).toBeVisible();

		await expect(n8n.ndv.getCredentialSelect()).not.toHaveValue(credentialName);
	});

	test('should rename credentials from NDV', async ({ n8n }) => {
		await n8n.start.fromNewProjectBlankCanvas();
		const initialName = `My Trello Account ${nanoid()}`;
		const renamedName = `Something else ${nanoid()}`;

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Trello', { action: 'Create a card' });

		await n8n.credentialsComposer.createFromNdv(
			{
				apiKey: 'test_api_key',
				apiToken: 'test_api_token',
			},
			{ name: initialName },
		);

		await n8n.canvas.credentialModal.editCredential();
		await n8n.canvas.credentialModal.renameCredential(renamedName);
		await n8n.canvas.credentialModal.save();
		await n8n.canvas.credentialModal.close();

		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(renamedName);
	});

	test('should edit credential for non-standard credential type', async ({ n8n }) => {
		await n8n.start.fromNewProjectBlankCanvas();
		const initialName = `Adalo Credential ${nanoid()}`;
		const editedName = `Something else ${nanoid()}`;

		await n8n.canvas.addNode('AI Agent', { closeNDV: true });
		await n8n.canvas.addNode('HTTP Request Tool');

		await n8n.ndv.selectOptionInParameterDropdown('authentication', 'Predefined Credential Type');
		await n8n.ndv.selectOptionInParameterDropdown('nodeCredentialType', 'Adalo API');

		await n8n.credentialsComposer.createFromNdv(
			{
				apiKey: 'test_adalo_key',
				appId: 'test_app_id',
			},
			{ name: initialName },
		);

		await n8n.canvas.credentialModal.editCredential();
		await n8n.canvas.credentialModal.renameCredential(editedName);
		await n8n.canvas.credentialModal.save();
		await n8n.canvas.credentialModal.close();

		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(editedName);
	});

	test('should set a default credential when adding nodes', async ({ n8n, api }) => {
		const projectId = await n8n.start.fromNewProjectBlankCanvas();
		const credentialName = `My awesome Notion account ${nanoid()}`;

		await api.credentialApi.createCredential({
			name: credentialName,
			type: 'notionApi',
			data: { apiKey: '1234567890' },
			projectId,
		});

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Notion', { action: 'Append a block' });
		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(credentialName);

		const credentials = await api.credentialApi.getCredentials();
		const credential = credentials.find((c) => c.name === credentialName);
		await api.credentialApi.deleteCredential(credential!.id);
	});

	test('should set a default credential when editing a node', async ({ n8n, api }) => {
		const projectId = await n8n.start.fromNewProjectBlankCanvas();
		const credentialName = `My awesome Notion account ${nanoid()}`;

		await api.credentialApi.createCredential({
			name: credentialName,
			type: 'notionApi',
			data: { apiKey: '1234567890' },
			projectId,
		});

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('HTTP Request');

		await n8n.ndv.selectOptionInParameterDropdown('authentication', 'Predefined Credential Type');
		await n8n.ndv.selectOptionInParameterDropdown('nodeCredentialType', 'Notion API');
		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(credentialName);

		const credentials = await api.credentialApi.getCredentials();
		const credential = credentials.find((c) => c.name === credentialName);
		await api.credentialApi.deleteCredential(credential!.id);
	});

	test('should setup generic authentication for HTTP node', async ({ n8n }) => {
		await n8n.start.fromNewProjectBlankCanvas();
		const credentialName = `Query Auth Credential ${nanoid()}`;

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('HTTP Request');

		await n8n.ndv.selectOptionInParameterDropdown('authentication', 'Generic Credential Type');
		await n8n.ndv.selectOptionInParameterDropdown('genericAuthType', 'Query Auth');

		await n8n.credentialsComposer.createFromNdv(
			{
				name: 'api_key',
				value: 'test_query_value',
			},
			{ name: credentialName },
		);

		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(credentialName);
	});

	test('should not show OAuth redirect URL section when OAuth2 credentials are overridden', async ({
		n8n,
		page,
	}) => {
		// Mock credential types response to simulate admin override
		await page.route('**/rest/types/credentials.json', async (route) => {
			const response = await route.fetch();
			const json = await response.json();

			// Override Slack OAuth2 credential properties
			if (json.slackOAuth2Api) {
				json.slackOAuth2Api.__overwrittenProperties = ['clientId', 'clientSecret'];
			}

			await route.fulfill({ json });
		});

		await n8n.start.fromNewProjectBlankCanvas();

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Slack', { action: 'Get a channel' });

		await n8n.ndv.clickCreateNewCredential();

		await n8n.canvas.credentialModal
			.getModal()
			.getByTestId('node-auth-type-selector')
			.locator('label.el-radio')
			.first()
			.click();

		await expect(n8n.canvas.credentialModal.getOAuthRedirectUrl()).toBeHidden();
		await expect(n8n.canvas.credentialModal.getModal()).toBeVisible();
	});

	test('ADO-2583 should show notifications above credential modal overlay', async ({
		n8n,
		page,
	}) => {
		await page.route('**/rest/credentials', async (route) => {
			if (route.request().method() === 'POST') {
				await route.abort('failed');
			} else {
				await route.continue();
			}
		});

		const projectId = await n8n.start.fromNewProject();
		await n8n.navigate.toCredentials(projectId);
		await n8n.credentials.addResourceButton.click();
		await n8n.credentials.actionCredentialButton.click();
		await n8n.credentials.selectCredentialType('Notion API');
		await n8n.canvas.credentialModal.fillField('apiKey', '1234567890');

		const saveBtn = n8n.canvas.credentialModal.getSaveButton();
		await saveBtn.click();

		const errorNotification = n8n.notifications.getErrorNotifications();
		await expect(errorNotification).toBeVisible();
		await expect(n8n.canvas.credentialModal.getModal()).toBeVisible();

		const modalOverlay = page.locator('.el-overlay').first();
		await expect(errorNotification).toHaveCSS('z-index', '2100');
		await expect(modalOverlay).toHaveCSS('z-index', '2001');
	});
});
