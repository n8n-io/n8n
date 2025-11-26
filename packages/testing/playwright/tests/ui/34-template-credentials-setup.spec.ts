import { readFileSync } from 'fs';

import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';
import { resolveFromRoot } from '../../utils/path-helper';

const TEMPLATE_HOSTNAME = 'custom.template.host';
const TEMPLATE_HOST = `https://${TEMPLATE_HOSTNAME}/api`;
const TEMPLATE_ID = 1205;
const TEMPLATE_WITHOUT_CREDS_ID = 1344;

const testTemplate = JSON.parse(
	readFileSync(resolveFromRoot('workflows', 'Test_Template_1.json'), 'utf8'),
);

const templateWithoutCredentials = JSON.parse(
	readFileSync(resolveFromRoot('workflows', 'Test_Template_2.json'), 'utf8'),
);

function createTemplateRequirements(): TestRequirements {
	return {
		config: {
			settings: {
				templates: {
					enabled: true,
					host: TEMPLATE_HOST,
				},
			},
		},
		intercepts: {
			health: {
				url: `${TEMPLATE_HOST}/health`,
				response: { status: 'OK' },
			},
			categories: {
				url: `${TEMPLATE_HOST}/templates/categories`,
				response: { categories: [] },
			},
			getTemplatePreview: {
				url: `${TEMPLATE_HOST}/templates/workflows/${TEMPLATE_ID}`,
				response: testTemplate,
			},
			getTemplate: {
				url: `${TEMPLATE_HOST}/workflows/templates/${TEMPLATE_ID}`,
				response: {
					id: TEMPLATE_ID,
					name: testTemplate.workflow.name,
					workflow: testTemplate.workflow.workflow,
				},
			},
			getTemplateWithoutCredentials: {
				url: `${TEMPLATE_HOST}/templates/workflows/${TEMPLATE_WITHOUT_CREDS_ID}`,
				response: templateWithoutCredentials,
			},
			getTemplateWithoutCredentialsData: {
				url: `${TEMPLATE_HOST}/workflows/templates/${TEMPLATE_WITHOUT_CREDS_ID}`,
				response: {
					id: TEMPLATE_WITHOUT_CREDS_ID,
					name: templateWithoutCredentials.workflow.name,
					workflow: templateWithoutCredentials.workflow.workflow,
				},
			},
		},
	};
}

test.describe('Template credentials setup @db:reset', () => {
	test.beforeEach(async ({ setupRequirements, n8n }) => {
		await setupRequirements(createTemplateRequirements());
		await n8n.goHome();
	});

	test('Should take users to canvas when importing template', async ({ n8n }) => {
		await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
		await expect(n8n.canvas.getLoadingMask()).toBeHidden({ timeout: 30000 });

		await expect(n8n.page).toHaveURL(/\/workflow\/new\?templateId=/);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.templateCredentialSetup.getSetupTemplateButton()).toBeVisible();
	});

	test('Loads template setup modal correctly', async ({ n8n }) => {
		await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
		await expect(n8n.canvas.getLoadingMask()).toBeHidden({ timeout: 30000 });

		await expect(n8n.page).toHaveURL(/\/workflow\/new\?templateId=/);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.templateCredentialSetup.getSetupTemplateButton()).toBeVisible();

		await n8n.templateCredentialSetup.openTemplateSetupModal();
		await expect(n8n.templateCredentialSetup.credentialModal.getModal()).toBeVisible();

		const modalSteps = n8n.templateCredentialSetup.getSetupCredentialModalSteps();
		await expect(modalSteps).toHaveCount(3);
		await expect(modalSteps.nth(0)).toContainText('Shopify');
		await expect(modalSteps.nth(1)).toContainText('X (Formerly Twitter)');
		await expect(modalSteps.nth(2)).toContainText('Telegram');
	});

	test('Should not show template setup if template does not have credentials', async ({ n8n }) => {
		await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_WITHOUT_CREDS_ID);
		await expect(n8n.canvas.getLoadingMask()).toBeHidden({ timeout: 30000 });

		await expect(n8n.page).toHaveURL(/\/workflow\/new\?templateId=/);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await expect(n8n.templateCredentialSetup.getSetupTemplateButton()).toBeHidden();
	});
});
