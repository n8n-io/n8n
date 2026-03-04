import { readFileSync } from 'fs';

import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';
import { resolveFromRoot } from '../../../utils/path-helper';

test.use({ capability: { env: { TEST_ISOLATION: 'setup-panel-template-insert' } } });

const TEMPLATE_HOSTNAME = 'custom.template.host';
const TEMPLATE_HOST = `https://${TEMPLATE_HOSTNAME}/api`;
const TEMPLATE_ID = 1205;

const testTemplate = JSON.parse(
	readFileSync(resolveFromRoot('workflows', 'Test_Template_1.json'), 'utf8'),
);

function createTemplateRequirements(): TestRequirements {
	return {
		storage: {
			N8N_EXPERIMENT_OVERRIDES: JSON.stringify({
				'055_template_setup_experience': 'variant',
				'069_setup_panel': 'variant',
			}),
		},
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
		},
	};
}

test.describe(
	'Setup panel should open when inserting template @db:reset',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements, n8n }) => {
			await setupRequirements(createTemplateRequirements());
			await n8n.goHome();
		});

		test('should automatically open setup panel when inserting template with credentials', async ({
			n8n,
		}) => {
			// Navigate to template credential setup (this imports the template)
			await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);

			// Wait for canvas to load
			await expect(n8n.canvas.getLoadingMask()).toBeHidden({ timeout: 30000 });

			// Template should be imported to canvas
			await expect(n8n.page).toHaveURL(/\/workflow\/.+\?templateId=.+&new=true/);
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);

			// BUG: Setup panel should automatically open but doesn't
			// The focus sidebar should be visible
			const focusSidebar = n8n.page.getByTestId('focus-sidebar');
			await expect(focusSidebar).toBeVisible({ timeout: 5000 });

			// The setup panel should be active (showing the setup tab)
			const setupPanelContainer = n8n.page.getByTestId('setup-panel-container');
			await expect(setupPanelContainer).toBeVisible();
		});

		test('should show setup panel with credential cards', async ({ n8n }) => {
			// Navigate to template credential setup
			await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);

			// Wait for canvas to load
			await expect(n8n.canvas.getLoadingMask()).toBeHidden({ timeout: 30000 });
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);

			// Setup panel should be visible
			const setupPanelCards = n8n.page.getByTestId('setup-panel-cards');
			await expect(setupPanelCards).toBeVisible({ timeout: 5000 });

			// Should show credential cards for the nodes that need credentials
			// Template has 3 nodes: Shopify, Twitter, and Telegram - all need credentials
			const credentialCards = setupPanelCards.locator('[data-test-id^="credential-card-"]');
			await expect(credentialCards).toHaveCount(3, { timeout: 5000 });
		});
	},
);
