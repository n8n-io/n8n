import type { InstanceAiPermissions } from '@n8n/api-types';
import type { APIRequestContext } from '@playwright/test';
import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

const APPROVE_EDIT_WORKFLOW_NAME = 'INS-171 Approval Edit Target';
const DENY_EDIT_WORKFLOW_NAME = 'INS-171 Deny Edit Target';
const INITIAL_STATUS_VALUE = 'before approval';
const APPROVED_STATUS_VALUE = 'approved edit was applied';
const DENIED_STATUS_VALUE = 'denied edit should not apply';

async function configureInstanceAiPermissions(
	request: APIRequestContext,
	permissions: Partial<InstanceAiPermissions>,
): Promise<void> {
	const response = await request.put('/rest/instance-ai/settings', {
		data: { permissions },
	});
	expect(response.ok(), await response.text()).toBe(true);
}

function seededEditableWorkflow(name: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'manual',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'status-marker',
				name: 'Status Marker',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [240, 0],
				parameters: {
					assignments: {
						assignments: [
							{
								id: 'status-assignment',
								name: 'status',
								value: INITIAL_STATUS_VALUE,
								type: 'string',
							},
						],
					},
					options: {},
				},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'Status Marker', type: 'main', index: 0 }]],
			},
		},
		settings: {},
	};
}

function workflowSignature(workflow: IWorkflowBase): string {
	return JSON.stringify({
		nodes: workflow.nodes,
		connections: workflow.connections,
	});
}

test.describe(
	'Instance AI confirmations @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test.beforeEach(async ({ api }) => {
			await configureInstanceAiPermissions(api.request, {
				updateWorkflow: 'require_approval',
			});
		});

		test('should show approval panel and approve workflow execution', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			// "build and run" triggers a confirmation for the execution step
			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "approval test" and run it',
			);

			// Approve the build plan so the orchestrator proceeds to the run step.
			await n8n.instanceAi.approveBuildPlan();

			await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible({ timeout: 120_000 });
			await n8n.instanceAi.getConfirmApproveButton().click();

			// After approval, execution should proceed
			await expect(n8n.instanceAi.getAssistantMessages().first()).toBeVisible({
				timeout: 120_000,
			});
		});

		test('should show approval panel and deny workflow execution', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "deny test" and run it',
			);

			await n8n.instanceAi.approveBuildPlan();

			await expect(n8n.instanceAi.getConfirmDenyButton()).toBeVisible({ timeout: 120_000 });
			await n8n.instanceAi.getConfirmDenyButton().click();

			// After denial, the assistant should acknowledge
			await expect(n8n.instanceAi.getAssistantMessages().first()).toBeVisible({
				timeout: 120_000,
			});
		});

		// The ticket's autonomous "similar workflow" edit and this explicit edit both
		// converge on build-workflow-with-agent with a workflowId before the builder spawns.
		test('should require approval before editing an existing workflow and apply after approval', async ({
			n8n,
		}) => {
			const workflow = await n8n.api.workflows.createWorkflow(
				seededEditableWorkflow(APPROVE_EDIT_WORKFLOW_NAME),
			);
			const beforeEdit = await n8n.api.workflows.getWorkflow(workflow.id);
			const beforeEditSignature = workflowSignature(beforeEdit);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(
				`Edit the existing workflow named "${APPROVE_EDIT_WORKFLOW_NAME}". Change the Set node named "Status Marker" so the "status" field value is exactly "${APPROVED_STATUS_VALUE}". Do not create a new workflow.`,
			);

			await expect(
				n8n.page.getByText(`Edit existing workflow "${APPROVE_EDIT_WORKFLOW_NAME}"`, {
					exact: false,
				}),
			).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible({ timeout: 120_000 });
			const whileAwaitingApproval = await n8n.api.workflows.getWorkflow(workflow.id);
			expect(workflowSignature(whileAwaitingApproval)).toBe(beforeEditSignature);

			await n8n.instanceAi.getConfirmApproveButton().click();

			await expect
				.poll(
					async () => {
						const updated = await n8n.api.workflows.getWorkflow(workflow.id);
						return workflowSignature(updated);
					},
					{ timeout: 180_000 },
				)
				.toContain(APPROVED_STATUS_VALUE);
		});

		test('should require approval before editing an existing workflow and keep it unchanged when denied', async ({
			n8n,
		}) => {
			const workflow = await n8n.api.workflows.createWorkflow(
				seededEditableWorkflow(DENY_EDIT_WORKFLOW_NAME),
			);
			const beforeEdit = await n8n.api.workflows.getWorkflow(workflow.id);
			const beforeEditSignature = workflowSignature(beforeEdit);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(
				`Edit the existing workflow named "${DENY_EDIT_WORKFLOW_NAME}". Change the Set node named "Status Marker" so the "status" field value is exactly "${DENIED_STATUS_VALUE}". Do not create a new workflow.`,
			);

			await expect(
				n8n.page.getByText(`Edit existing workflow "${DENY_EDIT_WORKFLOW_NAME}"`, {
					exact: false,
				}),
			).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.getConfirmDenyButton()).toBeVisible({ timeout: 120_000 });
			await n8n.instanceAi.getConfirmDenyButton().click();
			await n8n.instanceAi.waitForResponseComplete();

			const afterDeny = await n8n.api.workflows.getWorkflow(workflow.id);
			expect(workflowSignature(afterDeny)).toBe(beforeEditSignature);
		});
	},
);
