import type { Locator } from '@playwright/test';
import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);
const APPROVE_EDIT_WORKFLOW_NAME = 'INS-171 Approval Edit Target';
const DENY_EDIT_WORKFLOW_NAME = 'INS-171 Deny Edit Target';
const APPROVE_EDIT_WORKFLOW_ID = 'hC397S83USUp9597';
const DENY_EDIT_WORKFLOW_ID = 'cK6nyU9IZfas3ZKe';
const RESTORE_ARCHIVED_WORKFLOW_NAME = 'INS-199 Archived Restore Target';
const RESTORE_ARCHIVED_WORKFLOW_ID = 'ins-199-archived-restore-target';
const INITIAL_STATUS_VALUE = 'before approval';
const APPROVED_STATUS_VALUE = 'approved edit was applied';
const DENIED_STATUS_VALUE = 'denied edit should not apply';

type WorkflowWithArchiveState = IWorkflowBase & { isArchived?: boolean };

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

type WorkflowApiForAssertions = {
	getWorkflows(): Promise<Array<Partial<IWorkflowBase> & { id?: string }>>;
	getWorkflow(workflowId: string): Promise<IWorkflowBase>;
	getExecutions(workflowId: string, limit?: number): Promise<Array<{ status?: string }>>;
};

type ApprovalExecutionAssertionContext = {
	api: { workflows: WorkflowApiForAssertions };
};

async function hasSuccessfulExecutionForNode(
	workflowsApi: WorkflowApiForAssertions,
	nodeName: string,
): Promise<boolean> {
	const workflows = await workflowsApi.getWorkflows();
	const workflowIds: string[] = [];

	for (const workflowSummary of workflows) {
		if (!workflowSummary.id) continue;

		const workflow = workflowSummary.nodes
			? workflowSummary
			: await workflowsApi.getWorkflow(workflowSummary.id);

		if (
			workflow.name?.toLowerCase().includes(nodeName) ||
			workflow.nodes?.some((node) => node.name.toLowerCase().includes(nodeName))
		) {
			workflowIds.push(workflowSummary.id);
		}
	}

	for (const workflowId of workflowIds) {
		const executions = await workflowsApi.getExecutions(workflowId, 10);
		if (executions.some((execution) => execution.status === 'success')) return true;
	}

	return false;
}

async function approveBuildPlanIfRequested({
	n8n,
	nodeName,
}: {
	n8n: {
		api: { workflows: WorkflowApiForAssertions };
		instanceAi: { getPlanApproveButton(): Locator };
	};
	nodeName: string;
}): Promise<void> {
	let clickedApprove = false;
	const approveButton = n8n.instanceAi.getPlanApproveButton();

	await expect
		.poll(
			async () => {
				if (!clickedApprove && (await approveButton.isVisible().catch(() => false))) {
					await approveButton.click();
					clickedApprove = true;
					return true;
				}

				return await hasSuccessfulExecutionForNode(n8n.api.workflows, nodeName);
			},
			{ intervals: [1_000, 2_000, 5_000], timeout: 150_000 },
		)
		.toBe(true);
}

async function expectApprovedExecutionComplete({
	n8n,
	nodeName,
}: {
	n8n: ApprovalExecutionAssertionContext;
	nodeName: string;
}): Promise<void> {
	await expect
		.poll(async () => await hasSuccessfulExecutionForNode(n8n.api.workflows, nodeName), {
			intervals: [1_000, 2_000, 5_000],
			timeout: 150_000,
		})
		.toBe(true);
}

test.describe(
	'Instance AI confirmations @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test.beforeEach(async ({ api }) => {
			await api.setInstanceAiPermissions({
				runWorkflow: 'require_approval',
				updateWorkflow: 'require_approval',
			});
		});

		test('should list archived workflows and restore one via Instance AI', async ({
			api,
			n8n,
			n8nContainer,
		}) => {
			test.skip(!n8nContainer, 'LLM replay requires the container proxy harness');

			await api.setInstanceAiPermissions({
				deleteWorkflow: 'always_allow',
			});

			try {
				const workflow = await n8n.api.workflows.createWorkflow({
					id: RESTORE_ARCHIVED_WORKFLOW_ID,
					...seededEditableWorkflow(RESTORE_ARCHIVED_WORKFLOW_NAME),
				});
				expect(workflow.id).toBe(RESTORE_ARCHIVED_WORKFLOW_ID);
				await n8n.api.workflows.archive(workflow.id);

				await expect
					.poll(async () => {
						const archivedWorkflow = (await n8n.api.workflows.getWorkflow(
							workflow.id,
						)) as WorkflowWithArchiveState;
						return archivedWorkflow.isArchived;
					})
					.toBe(true);

				const prompt = `Restore the archived workflow named "${RESTORE_ARCHIVED_WORKFLOW_NAME}".`;

				await n8n.navigate.toInstanceAi();
				await n8n.instanceAi.sendMessage(prompt);
				await n8n.instanceAi.waitForResponseComplete();
				await expect(n8n.instanceAi.getAssistantMessageText(/restored/i)).toBeVisible();
				await expect
					.poll(async () => {
						const restoredWorkflow = (await n8n.api.workflows.getWorkflow(
							workflow.id,
						)) as WorkflowWithArchiveState;
						return restoredWorkflow.isArchived;
					})
					.toBe(false);
			} finally {
				// Settings are merged, not replaced — reset deleteWorkflow so the
				// override does not leak into later tests in this describe block.
				await api.setInstanceAiPermissions({
					deleteWorkflow: 'require_approval',
				});
			}
		});

		test(
			'should show approval panel and approve workflow execution',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description: 'should-show-approval-panel-and-approve-workflow-execution',
					},
				],
			},
			async ({ n8n }, testInfo) => {
				test.skip(
					testInfo.project.name.includes('multi-main'),
					'Post-approval agent actions are not yet stable on the multi-main project',
				);

				await n8n.navigate.toInstanceAi();

				await n8n.instanceAi.sendMessage(
					'Create a plan to build and run a simple workflow with a manual trigger and a set node called "approval test". Show me the plan for approval before building it.',
				);

				await approveBuildPlanIfRequested({ n8n, nodeName: 'approval test' });
				await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible({ timeout: 120_000 });
				await n8n.instanceAi.getConfirmApproveButton().click();

				await expectApprovedExecutionComplete({ n8n, nodeName: 'approval test' });
				await n8n.instanceAi.waitForResponseComplete();

				await expect(n8n.instanceAi.getConfirmApproveButton()).not.toBeVisible();
				await expect(n8n.instanceAi.getConfirmDenyButton()).not.toBeVisible();
			},
		);

		test(
			'should show approval panel and deny workflow execution',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description: 'should-show-approval-panel-and-deny-workflow-execution',
					},
				],
			},
			async ({ n8n }) => {
				await n8n.navigate.toInstanceAi();

				await n8n.instanceAi.sendMessage(
					'Create a plan to build and run a simple workflow with a manual trigger and a set node called "deny test". Show me the plan for approval before building it.',
				);

				await approveBuildPlanIfRequested({ n8n, nodeName: 'deny test' });
				await expect(n8n.instanceAi.getConfirmDenyButton()).toBeVisible({ timeout: 120_000 });
				await n8n.instanceAi.getConfirmDenyButton().click();
				await n8n.instanceAi.waitForResponseComplete();

				await expect
					.poll(async () => await hasSuccessfulExecutionForNode(n8n.api.workflows, 'deny test'))
					.toBe(false);
				await expect(n8n.instanceAi.getConfirmApproveButton()).not.toBeVisible();
				await expect(n8n.instanceAi.getConfirmDenyButton()).not.toBeVisible();
			},
		);

		// The ticket's autonomous "similar workflow" edit and this explicit edit both
		// converge on build-workflow with a workflowId before the update is saved.
		test('should require approval before editing an existing workflow and apply after approval', async ({
			api,
			n8n,
		}, testInfo) => {
			test.skip(
				testInfo.project.name.includes('multi-main'),
				'Post-approval agent actions are not yet stable on the multi-main project',
			);

			await api.setInstanceAiPermissions({
				runWorkflow: 'always_allow',
			});

			const workflow = await n8n.api.workflows.createWorkflow({
				id: APPROVE_EDIT_WORKFLOW_ID,
				...seededEditableWorkflow(APPROVE_EDIT_WORKFLOW_NAME),
			});
			const beforeEdit = await n8n.api.workflows.getWorkflow(workflow.id);
			const beforeEditSignature = workflowSignature(beforeEdit);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(
				`Edit the existing workflow named "${APPROVE_EDIT_WORKFLOW_NAME}". Change the Set node named "Status Marker" so the "status" field value is exactly "${APPROVED_STATUS_VALUE}". Do not create a new workflow.`,
			);

			await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible({ timeout: 120_000 });
			const whileAwaitingApproval = await n8n.api.workflows.getWorkflow(workflow.id);
			expect(workflowSignature(whileAwaitingApproval)).toBe(beforeEditSignature);

			await n8n.instanceAi.getConfirmApproveButton().click();

			let approvedUpdate = false;
			await expect
				.poll(
					async () => {
						if (
							!approvedUpdate &&
							(await n8n.instanceAi
								.getConfirmationText(`Update workflow "${APPROVE_EDIT_WORKFLOW_NAME}"`)
								.isVisible()
								.catch(() => false))
						) {
							await n8n.instanceAi.getConfirmApproveButton().click();
							approvedUpdate = true;
						}

						const updated = await n8n.api.workflows.getWorkflow(workflow.id);
						return workflowSignature(updated);
					},
					{ timeout: 180_000 },
				)
				.toContain(APPROVED_STATUS_VALUE);
			await n8n.instanceAi.waitForResponseComplete();
		});

		test('should require approval before editing an existing workflow and keep it unchanged when denied', async ({
			n8n,
		}) => {
			const workflow = await n8n.api.workflows.createWorkflow({
				id: DENY_EDIT_WORKFLOW_ID,
				...seededEditableWorkflow(DENY_EDIT_WORKFLOW_NAME),
			});
			const beforeEdit = await n8n.api.workflows.getWorkflow(workflow.id);
			const beforeEditSignature = workflowSignature(beforeEdit);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(
				`Edit the existing workflow named "${DENY_EDIT_WORKFLOW_NAME}". Change the Set node named "Status Marker" so the "status" field value is exactly "${DENIED_STATUS_VALUE}". Do not create a new workflow.`,
			);

			await expect(n8n.instanceAi.getConfirmDenyButton()).toBeVisible({ timeout: 120_000 });
			await n8n.instanceAi.getConfirmDenyButton().click();
			await n8n.instanceAi.waitForResponseComplete();

			const afterDeny = await n8n.api.workflows.getWorkflow(workflow.id);
			expect(workflowSignature(afterDeny)).toBe(beforeEditSignature);
		});
	},
);
