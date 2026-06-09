import { REDACT_OPTION, webhookWorkflow } from './redaction-helpers';
import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'redaction-enforcement-disabled',
		},
	},
});

test.describe(
	'Redaction enforcement (feature flag off)',
	{ annotation: [{ type: 'owner', description: 'Enterprise Node & Partnerships' }] },
	() => {
		test.beforeEach(async ({ api }) => {
			await api.enableFeature('personalSpacePolicy');
			await api.enableFeature('dataRedaction');
		});

		test('hides the instance floor in UI and API', async ({ n8n, api }) => {
			await n8n.securitySettings.goto();
			await expect(n8n.securitySettings.getEnforcementToggle()).toBeHidden();
			expect(await api.securitySettings.getRedactionFloor()).toBeUndefined();
		});

		test('keeps workflow redaction selects editable with no floor lock', async ({ n8n }) => {
			const workflow = await n8n.api.workflows.createWorkflow(webhookWorkflow());
			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.workflowSettingsModal.open();

			await expect(n8n.workflowSettingsModal.getRedactionPolicyRow()).toBeVisible();
			await expect(n8n.workflowSettingsModal.getRedactProductionInput()).toBeEnabled();

			// Enabling production redaction unlocks the manual select — baseline
			await n8n.workflowSettingsModal.selectProductionRedactMode(REDACT_OPTION.redact);
			await expect(n8n.workflowSettingsModal.getRedactManualInput()).toBeEnabled();
		});
	},
);
