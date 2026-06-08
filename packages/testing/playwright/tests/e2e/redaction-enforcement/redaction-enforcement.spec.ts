import type { IWorkflowBase } from 'n8n-workflow';

import { manualWorkflow, REDACT_OPTION, webhookWorkflow } from './redaction-helpers';
import { expect, test } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'redaction-enforcement',
			N8N_ENV_FEAT_REDACTION_ENFORCEMENT: 'true',
		},
	},
});

async function executeProductionWorkflow(
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

async function executeManualWorkflow(
	api: ApiHelpers,
	settings?: Partial<IWorkflowBase['settings']>,
) {
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
		test.beforeEach(async ({ api }) => {
			await api.enableFeature('personalSpacePolicy');
			await api.enableFeature('dataRedaction');
		});

		test.afterEach(async ({ api }) => {
			await api.securitySettings.setRedactionFloor('off');
		});

		test('admin sets the instance floor via the UI and it persists', async ({ n8n }) => {
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

		// Scenario 3
		test('all floor locks both selects in the workflow drawer', async ({ n8n }) => {
			await n8n.api.securitySettings.setRedactionFloor('all');

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

		// Scenario 4
		test('workflow can opt stricter than the production floor', async ({ n8n }) => {
			await n8n.api.securitySettings.setRedactionFloor('production');
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

		// // Scenario 5a
		test('production floor redacts production executions', async ({ api, n8n }) => {
			await api.securitySettings.setRedactionFloor('production');

			const { executionId, workflowId, workflow } = await executeProductionWorkflow(api);

			await n8n.navigate.toExecution(workflowId, executionId);
			await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
			await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
				/Output data redacted/,
			);
		});

		test('production floor does not redact manual executions', async ({ api, n8n }) => {
			await api.securitySettings.setRedactionFloor('production');

			const { executionId, workflowId, workflow } = await executeManualWorkflow(api);

			await n8n.navigate.toExecution(workflowId, executionId);
			await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
			await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
				/This is an item, but it's empty/,
			);
			await expect(n8n.executions.outputPanel.getDataContainer()).not.toHaveText(
				/Output data redacted/,
			);
		});

		// // Scenario 5b
		test('workflow production-only policy redacts production with the floor off', async ({
			api,
			n8n,
		}) => {
			await api.securitySettings.setRedactionFloor('off');

			const { executionId, workflowId, workflow } = await executeProductionWorkflow(api, {
				redactionPolicy: 'non-manual',
			});

			await n8n.navigate.toExecution(workflowId, executionId);
			await n8n.executions.openNodeExecutionDetails(workflow.nodes[0].name);
			await expect(n8n.executions.outputPanel.getDataContainer()).toHaveText(
				/Output data redacted/,
			);
		});

		// // Scenario 6
		// test('manual redaction requires production redaction', async ({ n8n }) => {
		// 	await n8n.api.securitySettings.setRedactionFloor('off');
		// 	const workflow = await n8n.api.workflows.createWorkflow(manualRedactionWorkflow());

		// 	// UI: manual select is disabled while production is not redacted (IAM-697)
		// 	await n8n.navigate.toWorkflow(workflow.id);
		// 	await n8n.workflowSettingsModal.open();
		// 	await expect(n8n.workflowSettingsModal.getRedactProductionInput()).toHaveValue(
		// 		REDACT_OPTION.default,
		// 	);
		// 	await expect(n8n.workflowSettingsModal.getRedactManualInput()).toBeDisabled();

		// 	// API: the invalid combination is rejected on save (IAM-698)
		// 	const response = await n8n.api.workflows.updateRaw(workflow.id, workflow.versionId, {
		// 		settings: { ...workflow.settings, redactionPolicy: 'manual-only' },
		// 	});
		// 	expect(response.status()).toBe(422);
		// });

		// // Scenario 7
		// test('API rejects workflow redaction changes that violate the instance floor', async ({
		// 	api,
		// }) => {
		// 	await api.securitySettings.setRedactionFloor('production');
		// 	const workflow = await api.workflows.createWorkflow(manualRedactionWorkflow());
		// 	const current = await api.workflows.getWorkflow(workflow.id);

		// 	// Weaker than the floor → rejected
		// 	const rejected = await api.workflows.updateRaw(
		// 		workflow.id,
		// 		current.versionId as string,
		// 		{ settings: { ...current.settings, redactionPolicy: 'none' } },
		// 	);
		// 	expect(rejected.status()).toBe(422);

		// 	// Stricter than the floor → accepted
		// 	const refreshed = await api.workflows.getWorkflow(workflow.id);
		// 	const accepted = await api.workflows.updateRaw(
		// 		workflow.id,
		// 		refreshed.versionId as string,
		// 		{ settings: { ...refreshed.settings, redactionPolicy: 'all' } },
		// 	);
		// 	expect(accepted.ok()).toBe(true);
		// });

		// // Scenario 8
		// test('setting the floor does not retroactively redact existing executions', async ({ api }) => {
		// 	await api.securitySettings.setRedactionFloor('off');

		// 	const { workflowId, webhookPath } = await setupActiveWebhook(api);
		// 	let executionId: string;
		// 	try {
		// 		const execution = await runWebhookAndFetch(api, workflowId, webhookPath);
		// 		executionId = execution.id;
		// 		expect(isExecutionRedacted(execution.data)).toBe(false);
		// 		expect(execution.data).toContain(SECRET_VALUE);
		// 	} finally {
		// 		await api.workflows.deactivate(workflowId);
		// 	}

		// 	await api.securitySettings.setRedactionFloor('all');

		// 	const reloaded = await api.workflows.getExecution(executionId);
		// 	expect(isExecutionRedacted(reloaded.data)).toBe(false);
		// 	expect(reloaded.data).toContain(SECRET_VALUE);
		// });
	},
);
