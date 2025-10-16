import { readFileSync } from 'fs';

import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';
import { resolveFromRoot } from '../../utils/path-helper';

const TEMPLATE_HOST = 'https://api.n8n.io/api/';
const TEMPLATE_ID = 1205;
const TEMPLATE_WITHOUT_CREDS_ID = 1344;
const COLLECTION_ID = 1;

const testTemplate = JSON.parse(
	readFileSync(resolveFromRoot('workflows', 'Test_Template_1.json'), 'utf8'),
);

const templateWithoutCredentials = JSON.parse(
	readFileSync(resolveFromRoot('workflows', 'Test_Template_2.json'), 'utf8'),
);

const ecommerceCollection = JSON.parse(
	readFileSync(
		resolveFromRoot('workflows', 'Ecommerce_starter_pack_template_collection.json'),
		'utf8',
	),
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
			getTemplatePreview: {
				url: `${TEMPLATE_HOST}templates/workflows/${TEMPLATE_ID}`,
				response: testTemplate,
			},
			getTemplate: {
				url: `${TEMPLATE_HOST}workflows/templates/${TEMPLATE_ID}`,
				response: testTemplate.workflow,
			},
			getTemplateCollection: {
				url: `${TEMPLATE_HOST}templates/collections/${COLLECTION_ID}`,
				response: ecommerceCollection,
			},
		},
	};
}

test.describe('Template credentials setup @db:reset', () => {
	test.beforeEach(async ({ setupRequirements }) => {
		await setupRequirements(createTemplateRequirements());
	});

	test('can be opened from template collection page', async ({ n8n }) => {
		await n8n.navigate.toTemplateCollection(COLLECTION_ID);
		await n8n.templates.clickUseWorkflowButton('Promote new Shopify products');

		await expect(
			n8n.templateCredentialSetup.getTitle("Set up 'Promote new Shopify products' template"),
		).toBeVisible();
	});

	test('has all the elements on page', async ({ n8n }) => {
		await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);

		await expect(
			n8n.templateCredentialSetup.getTitle("Set up 'Promote new Shopify products' template"),
		).toBeVisible();

		await expect(n8n.templateCredentialSetup.getInfoCallout()).toContainText(
			'You need 1x Shopify, 1x X (Formerly Twitter) and 1x Telegram account to setup this template',
		);

		const expectedAppNames = ['1. Shopify', '2. X (Formerly Twitter)', '3. Telegram'];
		const expectedAppDescriptions = [
			'The credential you select will be used in the product created node of the workflow template.',
			'The credential you select will be used in the Twitter node of the workflow template.',
			'The credential you select will be used in the Telegram node of the workflow template.',
		];

		const formSteps = n8n.templateCredentialSetup.getFormSteps();
		const count = await formSteps.count();

		for (let i = 0; i < count; i++) {
			const step = formSteps.nth(i);
			await expect(n8n.templateCredentialSetup.getStepHeading(step)).toHaveText(
				expectedAppNames[i],
			);
			await expect(n8n.templateCredentialSetup.getStepDescription(step)).toHaveText(
				expectedAppDescriptions[i],
			);
		}
	});

	test('can skip template creation', async ({ n8n }) => {
		await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);

		await n8n.templateCredentialSetup.getSkipLink().click();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
	});

	test('can create credentials and workflow from the template', async ({ n8n }) => {
		await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);

		await expect(n8n.templateCredentialSetup.getContinueButton()).toBeDisabled();

		await n8n.templatesComposer.fillDummyCredentialForApp('Shopify');

		await expect(n8n.templateCredentialSetup.getContinueButton()).toBeEnabled();

		await n8n.templatesComposer.fillDummyCredentialForAppWithConfirm('X (Formerly Twitter)');
		await n8n.templatesComposer.fillDummyCredentialForApp('Telegram');

		await n8n.notifications.quickCloseAll();

		const workflowCreatePromise = n8n.page.waitForResponse('**/rest/workflows');
		await n8n.templateCredentialSetup.getContinueButton().click();
		await workflowCreatePromise;

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);

		const workflow = await n8n.canvasComposer.getWorkflowFromClipboard();

		expect(workflow.meta).toHaveProperty('templateId', TEMPLATE_ID.toString());
		expect(workflow.meta).not.toHaveProperty('templateCredsSetupCompleted');
		workflow.nodes.forEach((node: { credentials?: Record<string, unknown> }) => {
			expect(Object.keys(node.credentials ?? {})).toHaveLength(1);
		});
	});

	test('should work with a template that has no credentials (ADO-1603)', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements({
			config: {
				settings: {
					templates: {
						enabled: true,
						host: TEMPLATE_HOST,
					},
				},
			},
			intercepts: {
				getTemplatePreview: {
					url: `${TEMPLATE_HOST}templates/workflows/${TEMPLATE_WITHOUT_CREDS_ID}`,
					response: templateWithoutCredentials,
				},
				getTemplate: {
					url: `${TEMPLATE_HOST}workflows/templates/${TEMPLATE_WITHOUT_CREDS_ID}`,
					response: templateWithoutCredentials.workflow,
				},
			},
		});

		await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_WITHOUT_CREDS_ID);

		const expectedAppNames = ['1. Email (IMAP)', '2. Nextcloud'];
		const expectedAppDescriptions = [
			'The credential you select will be used in the IMAP Email node of the workflow template.',
			'The credential you select will be used in the Nextcloud node of the workflow template.',
		];

		const formSteps = n8n.templateCredentialSetup.getFormSteps();
		const count = await formSteps.count();

		for (let i = 0; i < count; i++) {
			const step = formSteps.nth(i);
			await expect(n8n.templateCredentialSetup.getStepHeading(step)).toHaveText(
				expectedAppNames[i],
			);
			await expect(n8n.templateCredentialSetup.getStepDescription(step)).toHaveText(
				expectedAppDescriptions[i],
			);
		}

		await expect(n8n.templateCredentialSetup.getContinueButton()).toBeDisabled();

		await n8n.templatesComposer.fillDummyCredentialForApp('Email (IMAP)');
		await n8n.templatesComposer.fillDummyCredentialForApp('Nextcloud');

		await n8n.notifications.quickCloseAll();

		const workflowCreatePromise = n8n.page.waitForResponse('**/rest/workflows');
		await n8n.templateCredentialSetup.getContinueButton().click();
		await workflowCreatePromise;

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
	});

	test.describe('Credential setup from workflow editor', () => {
		test('should allow credential setup from workflow editor if user skips it during template setup', async ({
			n8n,
		}) => {
			await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
			await n8n.templateCredentialSetup.getSkipLink().click();

			await expect(n8n.canvas.getSetupWorkflowCredentialsButton()).toBeVisible();
		});

		test('should allow credential setup from workflow editor if user fills in credentials partially during template setup', async ({
			n8n,
		}) => {
			await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
			await n8n.templatesComposer.fillDummyCredentialForApp('Shopify');

			await n8n.notifications.quickCloseAll();

			const workflowCreatePromise = n8n.page.waitForResponse('**/rest/workflows');
			await n8n.templateCredentialSetup.getContinueButton().click();
			await workflowCreatePromise;

			await expect(n8n.canvas.getSetupWorkflowCredentialsButton()).toBeVisible();
		});

		test('should fill credentials from workflow editor', async ({ n8n }) => {
			await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
			await n8n.templateCredentialSetup.getSkipLink().click();

			await n8n.canvas.getSetupWorkflowCredentialsButton().click();
			await expect(n8n.workflowCredentialSetupModal.getModal()).toBeVisible();

			await n8n.templatesComposer.fillDummyCredentialForApp('Shopify');
			await n8n.templatesComposer.fillDummyCredentialForAppWithConfirm('X (Formerly Twitter)');
			await n8n.templatesComposer.fillDummyCredentialForApp('Telegram');

			await n8n.notifications.quickCloseAll();

			await n8n.workflowCredentialSetupModal.clickContinue();
			await expect(n8n.workflowCredentialSetupModal.getModal()).toBeHidden();

			const workflow = await n8n.canvasComposer.getWorkflowFromClipboard();

			workflow.nodes.forEach((node: { credentials?: Record<string, unknown> }) => {
				expect(Object.keys(node.credentials ?? {})).toHaveLength(1);
			});

			await expect(n8n.canvas.getSetupWorkflowCredentialsButton()).toBeHidden();
		});
	});
});
