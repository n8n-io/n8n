import type { Locator } from '@playwright/test';
import { request } from '@playwright/test';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { DATA_NODE, manualWorkflow, uniqueSecret, webhookWorkflow } from './redaction-helpers';
import { expect, test } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';
import { ApiHelpers } from '../../../services/api-helper';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'redaction-enforcement',
		},
	},
});

interface ExecutionRef {
	workflowId: string;
	executionId: string;
	secret: string;
}

async function runProductionExecution(
	api: ApiHelpers,
	settings?: Partial<IWorkflowBase['settings']>,
	projectId?: string,
): Promise<ExecutionRef> {
	const secret = uniqueSecret();
	const { workflowId, webhookPath, createdWorkflow } =
		await api.workflows.createWorkflowFromDefinition(webhookWorkflow({ secret, settings }), {
			projectId,
		});

	await api.workflows.activate(workflowId, createdWorkflow.versionId!);
	await api.webhooks.trigger(`/webhook/${webhookPath}`, { maxNotFoundRetries: 5 });
	const summary = await api.workflows.waitForExecution(workflowId, 15_000, 'webhook');

	return { workflowId, executionId: summary.id, secret };
}

async function runManualExecution(
	api: ApiHelpers,
	settings?: Partial<IWorkflowBase['settings']>,
): Promise<ExecutionRef> {
	const secret = uniqueSecret();
	const workflow = await api.workflows.createWorkflow(manualWorkflow({ secret, settings }));
	const { executionId } = await api.workflows.runManually(workflow.id, 'Manual');

	return { workflowId: workflow.id, executionId, secret };
}

async function openExecutionOutput(
	n8n: n8nPage,
	{ workflowId, executionId }: ExecutionRef,
): Promise<Locator> {
	await n8n.navigate.toExecution(workflowId, executionId);
	await n8n.executions.openNodeExecutionDetails(DATA_NODE);
	return n8n.ndv.outputPanel.getDataContainer();
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
			await api.securitySettings.setRedactionFloor('off');
		});

		// The floor is instance-global: restore the default so executions in other
		// spec files (which share the server in local runs) aren't redacted after
		// this suite finishes. The `api` fixture is test-scoped, so build one here.
		test.afterAll(async ({ backendUrl }) => {
			const context = await request.newContext({ baseURL: backendUrl });
			const api = new ApiHelpers(context);
			await api.signin('owner');
			await api.securitySettings.setRedactionFloor('off');
			await context.dispose();
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

		test.describe('authorization', () => {
			test('rejects redaction floor changes from a non-admin member', async ({ api }) => {
				const member = await api.publicApi.createUser({
					email: `member-${nanoid()}@test.com`,
					firstName: 'Red',
					lastName: 'Action',
					role: 'global:member',
				});
				const memberApi = await api.createApiForUser(member);

				const response = await memberApi.securitySettings.setRedactionFloorRaw('production');
				expect(response.status()).toBe(403);
			});

			test('shows the no-permission notice when a member without the reveal scope opens redacted data', async ({
				api,
				n8n,
			}) => {
				await api.enableProjectFeatures();
				await api.securitySettings.setRedactionFloor('all');

				// A project editor lacks execution:reveal
				const project = await api.projects.createProject(`Redaction Team ${nanoid()}`);
				const execution = await runProductionExecution(api, undefined, project.id);

				const member = await api.publicApi.createUser({
					email: `member-${nanoid()}@test.com`,
					firstName: 'Red',
					lastName: 'Action',
					role: 'global:member',
				});
				await api.projects.addUserToProject(project.id, member.id, 'project:editor');

				const memberN8n = await n8n.start.withUser(member);
				const output = await openExecutionOutput(memberN8n, execution);
				await expect(output).toHaveText(/Output data redacted/);
				await expect(output).toContainText('You do not have the permissions to reveal it');
			});

			test('enforces the reveal scope on the executions API', async ({ api }) => {
				await api.enableProjectFeatures();
				await api.securitySettings.setRedactionFloor('all');

				// A project editor lacks execution:reveal
				const project = await api.projects.createProject(`Redaction Team ${nanoid()}`);
				const execution = await runProductionExecution(api, undefined, project.id);

				const member = await api.publicApi.createUser({
					email: `member-${nanoid()}@test.com`,
					firstName: 'Red',
					lastName: 'Action',
					role: 'global:member',
				});
				await api.projects.addUserToProject(project.id, member.id, 'project:editor');
				const memberApi = await api.createApiForUser(member);

				// The default read is redacted for the editor
				const redacted = await memberApi.workflows.getExecution(execution.executionId);
				expect(redacted.data).not.toContain(execution.secret);

				// The reveal query param is rejected without the scope, and leaks nothing
				const rejected = await memberApi.workflows.getExecutionRaw(execution.executionId, {
					redactExecutionData: false,
				});
				expect(rejected.status()).toBe(403);
				expect(await rejected.text()).not.toContain(execution.secret);

				// The owner holds execution:reveal: the same param returns the data
				const revealed = await api.workflows.getExecution(execution.executionId, {
					redactExecutionData: false,
				});
				expect(revealed.data).toContain(execution.secret);
			});

			test('prevents members without the enable-redaction scope from setting redaction', async ({
				api,
				n8n,
			}) => {
				await api.enableProjectFeatures();

				// A project editor lacks workflow:enableRedaction
				const project = await api.projects.createProject(`Redaction Team ${nanoid()}`);
				const member = await api.publicApi.createUser({
					email: `member-${nanoid()}@test.com`,
					firstName: 'Red',
					lastName: 'Action',
					role: 'global:member',
				});
				await api.projects.addUserToProject(project.id, member.id, 'project:editor');

				const memberApi = await api.createApiForUser(member);
				const created = await memberApi.workflows.createWorkflow(
					webhookWorkflow({ settings: { redactionPolicy: 'all' } }),
					project.id,
				);
				const saved = await memberApi.workflows.getWorkflow(created.id);
				expect(saved.settings?.redactionPolicy).toBeUndefined();

				const memberN8n = await n8n.start.withUser(member);
				await memberN8n.navigate.toWorkflow(created.id);
				await memberN8n.workflowSettingsModal.open();
				await expect(memberN8n.workflowSettingsModal.getRedactProductionInput()).toBeDisabled();

				await memberN8n.workflowSettingsModal.hoverRedactProductionSelect();
				await expect(memberN8n.workflowSettingsModal.getTooltip()).toHaveText(
					/You don't have permission to change data redaction settings./,
				);
			});
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

				await n8n.workflowSettingsModal.selectManualRedactMode('Redact');
				await n8n.workflowSettingsModal.clickSave();
				await expect(n8n.workflowSettingsModal.getModal()).toBeHidden();
				await expect(
					n8n.notifications.getNotificationByTitleOrContent('Workflow settings saved'),
				).toBeVisible();

				const saved = await n8n.api.workflows.getWorkflow(workflow.id);
				expect(saved.settings?.redactionPolicy).toBe('all');
			});

			test('seeds new workflows up to the floor on create', async ({ api }) => {
				const created = await api.workflows.createWorkflow(
					webhookWorkflow({ settings: { redactionPolicy: 'none' } }),
				);

				const saved = await api.workflows.getWorkflow(created.id);
				expect(saved.settings?.redactionPolicy).toBe('non-manual');
			});

			test('redacts production executions', async ({ api, n8n }) => {
				const execution = await runProductionExecution(api);
				const output = await openExecutionOutput(n8n, execution);

				await expect(output).toHaveText(/Output data redacted/);
				await expect(output).not.toContainText(execution.secret);

				const executionData = await api.workflows.getExecution(execution.executionId);
				expect(executionData.data).not.toContain(execution.secret);
			});

			test('leaves manual executions unredacted', async ({ api, n8n }) => {
				const execution = await runManualExecution(api);
				const output = await openExecutionOutput(n8n, execution);

				await expect(output).toContainText(execution.secret);
				await expect(output).not.toHaveText(/Output data redacted/);

				const executionData = await api.workflows.getExecution(execution.executionId);
				expect(executionData.data).toContain(execution.secret);
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
				const execution = await runProductionExecution(api);
				const output = await openExecutionOutput(n8n, execution);

				await expect(output).toHaveText(/Output data redacted/);
				await expect(output).not.toContainText(execution.secret);

				const executionData = await api.workflows.getExecution(execution.executionId);
				expect(executionData.data).not.toContain(execution.secret);
			});

			test('redacts manual executions', async ({ api, n8n }) => {
				const execution = await runManualExecution(api);
				const output = await openExecutionOutput(n8n, execution);

				await expect(output).toHaveText(/Output data redacted/);
				await expect(output).not.toContainText(execution.secret);

				const executionData = await api.workflows.getExecution(execution.executionId);
				expect(executionData.data).not.toContain(execution.secret);
			});

			test('redacts execution data served via the public API', async ({ api }) => {
				const execution = await runProductionExecution(api);

				// Assert on the execution payload (`data`), not the whole body: the
				// sentinel legitimately appears in the workflow definition (node
				// parameters), which is readable with workflow:read.
				const response = await api.publicApi.getExecutionRaw(execution.executionId, {
					includeData: true,
				});
				expect(response.ok()).toBe(true);
				const body = await response.json();
				expect(JSON.stringify(body.data)).not.toContain(execution.secret);

				// Positive control: the owner's reveal returns the data on this channel too
				const revealed = await api.publicApi.getExecutionRaw(execution.executionId, {
					includeData: true,
					redactExecutionData: false,
				});
				expect(revealed.ok()).toBe(true);
				const revealedBody = await revealed.json();
				expect(JSON.stringify(revealedBody.data)).toContain(execution.secret);
			});
		});

		test.describe('when floor is "off" and workflow redaction is "non-manual"', () => {
			test('redacts production executions', async ({ api, n8n }) => {
				const execution = await runProductionExecution(api, { redactionPolicy: 'non-manual' });
				const output = await openExecutionOutput(n8n, execution);

				await expect(output).toHaveText(/Output data redacted/);
				await expect(output).not.toContainText(execution.secret);

				const executionData = await api.workflows.getExecution(execution.executionId);
				expect(executionData.data).not.toContain(execution.secret);
			});

			test('leaves manual executions unredacted', async ({ api, n8n }) => {
				const execution = await runManualExecution(api, { redactionPolicy: 'non-manual' });
				const output = await openExecutionOutput(n8n, execution);

				await expect(output).toContainText(execution.secret);
				await expect(output).not.toHaveText(/Output data redacted/);

				const executionData = await api.workflows.getExecution(execution.executionId);
				expect(executionData.data).toContain(execution.secret);
			});
		});

		test('does not retroactively redact executions captured before the floor was raised', async ({
			api,
			n8n,
		}) => {
			const execution = await runProductionExecution(api);

			const before = await openExecutionOutput(n8n, execution);
			await expect(before).toContainText(execution.secret);
			await expect(before).not.toHaveText(/Output data redacted/);

			await api.securitySettings.setRedactionFloor('all');

			const after = await openExecutionOutput(n8n, execution);
			await expect(after).toContainText(execution.secret);
			await expect(after).not.toHaveText(/Output data redacted/);

			const executionData = await api.workflows.getExecution(execution.executionId);
			expect(executionData.data).toContain(execution.secret);
		});
	},
);
