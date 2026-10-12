import { workflow, trigger, node } from '@n8n/workflow-sdk';
import { expect } from '@playwright/test';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import type { A11yChecker } from '../../fixtures/a11y';
import type { n8nPage } from '../../pages/n8nPage';
import type { ApiHelpers } from '../../services/api-helper';
import type { TestUser } from '../../services/user-api-helper';

const TRIGGER_NAME = 'Manual Trigger';
const NOOP_NODE_NAME = 'Code';
const WORKFLOWS_IN_PROJECT = 2;
const EXECUTIONS_PER_WORKFLOW = 1;

export interface AdminViewsExecutionsListContext {
	admin: TestUser;
	project: { id: string; name: string };
	workflows: Array<{ id: string; name: string }>;
}

function buildJourneyWorkflow(name: string): Partial<IWorkflowBase> {
	const manualTrigger = trigger({
		type: 'n8n-nodes-base.manualTrigger',
		version: 1,
		config: { name: TRIGGER_NAME, parameters: {} },
	});
	const noop = node({
		type: 'n8n-nodes-base.code',
		version: 1,
		config: {
			name: NOOP_NODE_NAME,
			parameters: {
				mode: 'runOnceForAllItems',
				jsCode: 'return [{ json: { ok: true } }];',
			},
		},
	});
	const wf = workflow(nanoid(), name).add(manualTrigger.to(noop));
	const json = wf.toJSON() as IWorkflowBase;
	json.settings = { executionOrder: 'v1' };
	return json;
}

export async function setupAdminViewsExecutionsList(
	api: ApiHelpers,
): Promise<AdminViewsExecutionsListContext> {
	const admin = await api.publicApi.createUser({
		email: `journey-admin-${nanoid()}@test.com`.toLowerCase(),
		firstName: 'Journey',
		lastName: 'Admin',
	});

	const project = await api.projects.createProject(`journey-${nanoid(8)}`);
	await api.projects.addUserToProject(project.id, admin.id, 'project:admin');

	const workflows: Array<{ id: string; name: string }> = [];
	for (let i = 0; i < WORKFLOWS_IN_PROJECT; i++) {
		const name = `journey-wf-${nanoid(6)}`;
		const def = buildJourneyWorkflow(name);
		(def as IWorkflowBase & { projectId: string }).projectId = project.id;
		const { workflowId } = await api.workflows.createWorkflowFromDefinition(def, {
			makeUnique: false,
		});
		workflows.push({ id: workflowId, name });
	}

	await Promise.all(
		workflows.map(async (wf) => {
			for (let i = 0; i < EXECUTIONS_PER_WORKFLOW; i++) {
				await api.workflows.runManually(wf.id, TRIGGER_NAME);
				await api.workflows.waitForExecution(wf.id, 15_000, 'manual');
			}
		}),
	);

	return {
		admin,
		project: { id: project.id, name: project.name },
		workflows,
	};
}

export async function viewExecutionsListAsAdmin(
	n8n: n8nPage,
	ctx: AdminViewsExecutionsListContext,
): Promise<void> {
	const executionsResponse = n8n.page.waitForResponse(
		(r) => r.url().includes('/rest/executions') && r.status() === 200,
		{ timeout: 120_000 },
	);
	await n8n.navigate.toProjectExecutions(ctx.project.id, {
		waitUntil: 'commit',
		timeout: 120_000,
	});
	await executionsResponse;

	await expect(n8n.executions.getGlobalExecutionItems().first()).toBeVisible({
		timeout: 60_000,
	});
}

/**
 * The journey as a test drives it: seed, sign in as the project admin, open the
 * executions list.
 *
 * Pass `a11y` to scan the screens the journey lands on. The scans happen after the
 * list has rendered - scanning mid-navigation reports the loading state, not the
 * screen the admin ends up looking at. They never fail the journey on their own;
 * `PLAYWRIGHT_A11Y_MAX_VIOLATIONS` decides that, and is unset by default.
 */
export async function adminViewsExecutionsList(deps: {
	n8n: n8nPage;
	api: ApiHelpers;
	a11y?: A11yChecker;
}): Promise<void> {
	const ctx = await setupAdminViewsExecutionsList(deps.api);
	const adminN8n = await deps.n8n.start.withUser(ctx.admin);
	await viewExecutionsListAsAdmin(adminN8n, ctx);

	// `withUser` opens its own page, so point the checker at the admin's.
	const a11y = deps.a11y?.for(adminN8n);
	await a11y?.check('page');
	await a11y?.check('sidebar');
}
