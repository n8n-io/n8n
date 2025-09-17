import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe('04 - Credentials', () => {
	test('composer: createFromList creates credential', async ({ n8n }) => {
		const projectId = await n8n.start.fromNewProject();
		const credentialName = `credential-${nanoid()}`;
		await n8n.navigate.toCredentials(projectId);

		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: '1234567890' },
			{
				name: credentialName,
				closeDialog: false,
			},
		);
		await expect(n8n.credentials.getCredentialByName(credentialName)).toBeVisible();
	});

	test('composer: createFromNdv creates credential for node', async ({ n8n }) => {
		const name = `credential-${nanoid()}`;
		await n8n.start.fromNewProjectBlankCanvas();
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Notion', { action: 'Append a block' });

		await n8n.credentialsComposer.createFromNdv({ apiKey: '1234567890' }, { name });
		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(name);
	});

	test('composer: createFromApi creates credential (then NDV picks it up)', async ({ n8n }) => {
		const name = `credential-${nanoid()}`;
		const projectId = await n8n.start.fromNewProjectBlankCanvas();
		await n8n.credentialsComposer.createFromApi({
			name,
			type: 'notionApi',
			data: { apiKey: '1234567890' },
			projectId,
		});

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Notion', { action: 'Append a block' });
		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(name);
	});

	test('create a new credential from empty state using the credential chooser list', async ({
		n8n,
	}) => {
		const projectId = await n8n.start.fromNewProject();
		await n8n.navigate.toCredentials(projectId);
		await n8n.credentials.emptyListCreateCredentialButton.click();
		await n8n.credentials.createCredentialFromCredentialPicker('Notion API', {
			apiKey: '1234567890',
		});
		await expect(n8n.credentials.credentialCards).toHaveCount(1);
	});

	test('create a new credential from the NDV', async ({ n8n }) => {
		const uniqueCredentialName = `credential-${nanoid()}`;
		await n8n.start.fromNewProjectBlankCanvas();
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Notion', { action: 'Append a block' });

		await n8n.ndv.getNodeCredentialsSelect().click();
		await n8n.ndv.credentialDropdownCreateNewCredential().click();
		await n8n.canvas.credentialModal.addCredential(
			{
				apiKey: '1234567890',
			},
			{ name: uniqueCredentialName },
		);
		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(uniqueCredentialName);
	});

	test('add an existing credential from the NDV', async ({ n8n, api }) => {
		const uniqueCredentialName = `credential-${nanoid()}`;
		const projectId = await n8n.start.fromNewProjectBlankCanvas();

		await api.credentialApi.createCredential({
			name: uniqueCredentialName,
			type: 'notionApi',
			data: {
				apiKey: '1234567890',
			},
			projectId,
		});

		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Notion', { action: 'Append a block' });
		await expect(n8n.ndv.getCredentialSelect()).toHaveValue(uniqueCredentialName);
	});
});
