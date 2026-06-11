import type { IWorkflowBase } from 'n8n-workflow';

import { manualWorkflow, REDACT_OPTION, webhookWorkflow } from './redaction-helpers';
import { expect, test } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'redaction-enforcement',
		},
	},
});

async function runProductionExecution(
	api: ApiHelpers,
	settings?: Partial<IWorkflowBase['settings']>,
) {
	const { workflowId, webhookPath, createdWorkflow } =
		await api.workflows.createWorkflowFromDefinition(webhookWorkflow(settings));

	await api.workflows.activate(workflowId, createdWorkflow.versionId!);
	await api.webhooks.trigger(`/webhook/${webhookPath}`, { maxNotFoundRetries: 5 });
	const summary = await api.workflows.waitForExecution(workflowId, 15_000, 'webhook');

	return { executionId: summary.id, workflowId, workflow: createdWorkflow };
}

async function runManualExecution(api: ApiHelpers, settings?: Partial<IWorkflowBase['settings']>) {
	const createdWorkflow = await api.workflows.createWorkflow(manualWorkflow(settings));
	const result = await api.workflows.runManually(createdWorkflow.id, createdWorkflow.nodes[0].name);

	return {
		workflowId: createdWorkflow.id,
		executionId: result.executionId,
		workflow: createdWorkflow,
	};
}

test.describe(
	'Redaction enforcement',
	{ annotation: [{ type: 'owner', description: 'Enterprise Node & Partnerships' }] },
	() => {
		// The redaction floor is a single instance-global value, so these tests cannot
		// run in parallel against the shared instance without racing on it. Force serial
		// execution; each test then sets the floor it needs from a clean baseline.
		test.describe.configure({ mode: 'serial' });

		test.beforeEach(async ({ api }) => {
			await api.enableFeature('personalSpacePolicy');
			await api.enableFeature('dataRedaction');
			// Reset the instance-global floor to a known-clean value before each test.
			await api.securitySettings.setRedactionFloor('off');
		});

		test('can be enabled and scoped from the Security & Policies UI', async ({ n8n }) => {
			await n8n.securitySettings.goto();

			await n8n.securitySettings.enableEnforcement();
			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Data redaction enforced'),
			).toBeVisible();
			await expect(n8n.securitySettings.getEnforcementSummary()).toContainText(
				'Production executions',
			);
			expect(await n8n.api.securitySettings.getRedactionFloor()).toBe('production');

			await n8n.securitySettings.selectScope('all');
			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Redaction scope updated'),
			).toBeVisible();
			await expect(n8n.securitySettings.getEnforcementSummary()).toContainText(
				'Manual and production executions',
			);
			expect(await n8n.api.securitySettings.getRedactionFloor()).toBe('all');
		});

		test.describe('when floor is "production"', () => {
			test.beforeEach(async ({ n8n }) => {
				await n8n.api.securitySettings.setRedactionFloor('production');
			});

			test('locks only the production select in the workflow settings', async ({ n8n }) => {
				const workflow = await n8n.api.workflows.createWorkflow(webhookWorkflow());
				await n8n.navigate.toWorkflow(workflow.id);
				await n8n.workflowSettingsModal.open();

				await expect(n8n.workflowSettingsModal.getRedactProductionInput()).toHaveValue('Redact');
				await expect(n8n.workflowSettingsModal.getRedactProductionInput()).toBeDisabled();

				await n8n.workflowSettingsModal.hoverRedactProductionSelect();
				await expect(n8n.workflowSettingsModal.getTooltip()).toHaveText(
					/This option is enforced by your instance's redaction policy./,
				);

				await expect(n8n.workflowSettingsModal.getRedactManualInput()).toBeEnabled();
			});

			test('lets set stricter policy in the workflow settings', async ({ n8n }) => {
				const workflow = await n8n.api.workflows.createWorkflow(webhookWorkflow());
				await n8n.navigate.toWorkflow(workflow.id);

				await n8n.workflowSettingsModal.open();
				await expect(n8n.workflowSettingsModal.getRedactManualInput()).toBeEnabled();

				await n8n.workflowSettingsModal.selectManualRedactMode(REDACT_OPTION.redact);
				await n8n.workflowSettingsModal.clickSave();
				await expect(n8n.workflowSettingsModal.getModal()).toBeHidden();
				await expect(
					n8n.notifications.getNotificationByTitleOrContent('Workflow settings saved'),
				).toBeVisible();

				const saved = await n8n.api.workflows.getWorkflow(workflow.id);
				expect(saved.settings?.redactionPolicy).toBe('all');
			});

			test('redacts production executions', async ({ api, n8n }) => {
				const { executionId, workflowId, workflow } = await runProductionExecution(api);

				await n8n.navigate.toExecution(workflowId, executionId);
				await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
				await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
					/Output data redacted/,
				);
			});

			test('leaves manual executions unredacted', async ({ api, n8n }) => {
				const { executionId, workflowId, workflow } = await runManualExecution(api);

				await n8n.navigate.toExecution(workflowId, executionId);
				await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
				await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
					/This is an item, but it's empty/,
				);
				await expect(n8n.executions.outputPanel.getDataContainer()).not.toHaveText(
					/Output data redacted/,
				);
			});

			test('rejects workflow redaction changes that fall below the floor', async ({ api }) => {
				const workflow = await api.workflows.createWorkflow(webhookWorkflow());

				const current = await api.workflows.getWorkflow(workflow.id);
				const rejected = await api.workflows.updateRaw(workflow.id, current.versionId!, {
					settings: { ...current.settings, redactionPolicy: 'none' },
				});
				expect(rejected.status()).toBe(422);

				const refreshed = await api.workflows.getWorkflow(workflow.id);
				const accepted = await api.workflows.updateRaw(workflow.id, refreshed.versionId!, {
					settings: { ...refreshed.settings, redactionPolicy: 'all' },
				});
				expect(accepted.ok()).toBe(true);
			});
		});

		test.describe('when floor is "all"', () => {
			test.beforeEach(async ({ n8n }) => {
				await n8n.api.securitySettings.setRedactionFloor('all');
			});

			test('locks both selects in the workflow settings', async ({ n8n }) => {
				const workflow = await n8n.api.workflows.createWorkflow(webhookWorkflow());
				await n8n.navigate.toWorkflow(workflow.id);
				await n8n.workflowSettingsModal.open();

				await expect(n8n.workflowSettingsModal.getRedactProductionInput()).toHaveValue('Redact');
				await expect(n8n.workflowSettingsModal.getRedactManualInput()).toHaveValue('Redact');
				await expect(n8n.workflowSettingsModal.getRedactProductionInput()).toBeDisabled();
				await expect(n8n.workflowSettingsModal.getRedactManualInput()).toBeDisabled();

				await n8n.workflowSettingsModal.hoverRedactProductionSelect();
				await expect(n8n.workflowSettingsModal.getTooltip()).toHaveText(
					/This option is enforced by your instance's redaction policy./,
				);

				await n8n.workflowSettingsModal.hoverRedactManualSelect();
				await expect(n8n.workflowSettingsModal.getTooltip()).toHaveText(
					/This option is enforced by your instance's redaction policy./,
				);
			});

			test('redacts production executions', async ({ api, n8n }) => {
				const { executionId, workflowId, workflow } = await runProductionExecution(api);

				await n8n.navigate.toExecution(workflowId, executionId);
				await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
				await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
					/Output data redacted/,
				);
			});

			test('redacts manual executions', async ({ api, n8n }) => {
				const { executionId, workflowId, workflow } = await runManualExecution(api);

				await n8n.navigate.toExecution(workflowId, executionId);
				await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
				await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
					/Output data redacted/,
				);
			});
		});

		test.describe('when floor is "off" and workflow redaction is "non-manual"', () => {
			test('redacts production executions', async ({ api, n8n }) => {
				const { executionId, workflowId, workflow } = await runProductionExecution(api, {
					redactionPolicy: 'non-manual',
				});

				await n8n.navigate.toExecution(workflowId, executionId);
				await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
				await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
					/Output data redacted/,
				);
			});

			test('leaves manual executions unredacted', async ({ api, n8n }) => {
				const { executionId, workflowId, workflow } = await runManualExecution(api, {
					redactionPolicy: 'non-manual',
				});

				await n8n.navigate.toExecution(workflowId, executionId);
				await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
				await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
					/This is an item, but it's empty/,
				);
				await expect(n8n.executions.outputPanel.getDataContainer()).not.toHaveText(
					/Output data redacted/,
				);
			});
		});

		test('does not retroactively redact executions captured before the floor was raised', async ({
			api,
			n8n,
		}) => {
			const { executionId, workflowId, workflow } = await runProductionExecution(api);
			await n8n.navigate.toExecution(workflowId, executionId);
			await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
			await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
				/executionMode[\s\S]*production/i,
			);
			await expect(n8n.executions.outputPanel.getDataContainer()).not.toHaveText(
				/Output data redacted/,
			);

			await api.securitySettings.setRedactionFloor('all');
			await n8n.navigate.toExecution(workflowId, executionId);
			await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
			await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
				/executionMode[\s\S]*production/i,
			);
			await expect(n8n.executions.outputPanel.getDataContainer()).not.toHaveText(
				/Output data redacted/,
			);
		});
	},
);
