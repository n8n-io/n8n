import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { MessageBox } from '../../../pages/components/messageBoxLocators';

test.describe(
	'Credentials',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('shows and finds Philips Hue credentials by their type label', async ({ n8n }) => {
			const label = 'Philips Hue OAuth2 API';
			const name = `credential-${nanoid()}`;
			const projectId = await n8n.start.fromNewProjectBlankCanvas();
			await n8n.api.credentials.createCredential({
				name,
				type: 'philipsHueOAuth2Api',
				data: {},
				projectId,
			});

			await n8n.canvas.addNode('Philips Hue', { action: 'Get a light' });
			await expect(n8n.ndv.getCredentialSelect()).toHaveValue(name);
			await n8n.ndv.clickCreateNewCredential();
			await expect(n8n.canvas.credentialModal.getText(label, { exact: true })).toBeVisible();
			await n8n.canvas.credentialModal.close();
			await new MessageBox(n8n.page).buttonByText('Close').click();
			await expect(n8n.canvas.credentialModal.getModal()).toBeHidden();
			await n8n.ndv.close();

			await n8n.navigate.toCredentials(projectId);
			await n8n.credentials.search('Philips Hue');
			await expect(n8n.credentials.cards.getCredential(name)).toContainText(label);

			await n8n.credentials.addResource.credential();
			await n8n.credentials.searchCredentialTypes('Philips Hue');
			await expect(n8n.credentials.getCredentialTypeOptions()).toHaveText([label]);
			await n8n.credentials.selectCredentialType(label);
			await expect(n8n.credentials.credentialModal.getText(label, { exact: true })).toBeVisible();
			await n8n.credentials.credentialModal.close();
			await new MessageBox(n8n.page).buttonByText('Close').click();
			await expect(n8n.credentials.credentialModal.getModal()).toBeHidden();
		});

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
			await expect(n8n.credentials.cards.getCredential(credentialName)).toBeVisible();
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
			const userN8n = await n8n.start.withNewUser();
			await userN8n.credentialsComposer.createFromApi({
				name,
				type: 'notionApi',
				data: { apiKey: '1234567890' },
			});

			await userN8n.start.fromBlankCanvas();
			await userN8n.canvas.addNode('Manual Trigger');
			await userN8n.canvas.addNode('Notion', { action: 'Append a block' });
			await expect(userN8n.ndv.getCredentialSelect()).toHaveValue(name);
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
			await expect(n8n.credentials.cards.getCredentials()).toHaveCount(1);
		});

		test('create a new credential from the NDV', async ({ n8n }) => {
			const uniqueCredentialName = `credential-${nanoid()}`;
			const projectId = await n8n.start.fromNewProjectBlankCanvas();
			// An existing credential makes the NDV show the picker, so the new
			// credential is created from the dropdown and not from the empty state.
			await n8n.credentialsComposer.createFromApi({
				name: `credential-${nanoid()}`,
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId,
			});
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Notion', { action: 'Append a block' });

			await n8n.ndv.clickCreateNewCredential();
			await n8n.canvas.credentialModal.addCredential(
				{
					apiKey: '1234567890',
				},
				{ name: uniqueCredentialName },
			);
			await expect(n8n.ndv.getCredentialSelect()).toHaveValue(uniqueCredentialName);
		});

		test('add an existing credential from the NDV', async ({ n8n }) => {
			const uniqueCredentialName = `credential-${nanoid()}`;
			const userN8n = await n8n.start.withNewUser();

			await userN8n.api.credentials.createCredential({
				name: uniqueCredentialName,
				type: 'notionApi',
				data: {
					apiKey: '1234567890',
				},
			});

			await userN8n.start.fromBlankCanvas();
			await userN8n.canvas.addNode('Manual Trigger');
			await userN8n.canvas.addNode('Notion', { action: 'Append a block' });
			await expect(userN8n.ndv.getCredentialSelect()).toHaveValue(uniqueCredentialName);
		});
	},
);
