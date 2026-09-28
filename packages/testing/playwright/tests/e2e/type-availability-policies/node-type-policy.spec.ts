import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import {
	executionErrorOf,
	loadPostgresColumns,
	NO_OP,
	POSTGRES,
	postgresWorkflow,
	SCHEDULE_TRIGGER_NAME,
	scheduleToNoOpWorkflow,
	SET,
	setNode,
	triggerOnlyWorkflow,
	violationsOf,
} from './policy-helpers';
import { expect, test } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';
import { policyRule as rule } from '../../../services/type-policy-api-helper';

// An instance policy applies to every workflow on the instance, so the spec needs its own.
test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'type-availability-policies',
			N8N_ENABLED_MODULES: 'type-availability-policies',
		},
	},
});

async function findType(api: ApiHelpers, projectId: string, nodeType: string) {
	const types = await api.nodeTypePolicies.getAvailability(projectId);
	return types.find((entry) => entry.name === nodeType);
}

test.describe(
	'Node type policies @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		// The instance policy is shared state: run one test at a time.
		test.describe.configure({ mode: 'default' });

		test.beforeEach(async ({ api }) => {
			expect(
				await api.getActiveModules(),
				'the type-availability-policies module is not active: the instance needs a license granting feat:typeAvailabilityPolicies at startup',
			).toContain('type-availability-policies');

			// The check reads the license on every decision, not only at startup.
			await api.enableFeature('typeAvailabilityPolicies');
			await api.enableProjectFeatures();
			await api.setMaxTeamProjectsQuota(-1);
			await api.nodeTypePolicies.resetInstancePolicy();
		});

		test.describe('an instance block on an existing workflow', () => {
			let projectId: string;
			let workflow: IWorkflowBase;

			test.beforeEach(async ({ api }) => {
				({ id: projectId } = await api.projects.createProject());
				workflow = await api.workflows.createWorkflow(scheduleToNoOpWorkflow(), projectId);

				await api.nodeTypePolicies.setInstancePolicy({
					rules: [rule('deny', NO_OP.type), rule('deny', SET.type)],
					defaultAction: 'allow',
				});
			});

			test('should still save the workflow with the blocked type it already stores', async ({
				api,
			}) => {
				const movedNodes = workflow.nodes.map((node) => ({
					...node,
					position: [node.position[0], node.position[1] + 100] as [number, number],
				}));

				const response = await api.workflows.updateRaw(workflow.id, workflow.versionId!, {
					nodes: movedNodes,
					connections: workflow.connections,
				});

				expect(response.status()).toBe(200);
			});

			test('should refuse a save that adds a different blocked type', async ({ api }) => {
				const response = await api.workflows.updateRaw(workflow.id, workflow.versionId!, {
					nodes: [...workflow.nodes, setNode()],
					connections: workflow.connections,
				});

				expect(response.status()).toBe(403);
				expect(await violationsOf(response)).toEqual([
					expect.objectContaining({
						kind: 'node-type-unavailable',
						subject: SET.type,
						scope: 'instance',
					}),
				]);

				const stored = await api.workflows.getWorkflow(workflow.id);
				expect(stored.nodes.map((node) => node.type)).not.toContain(SET.type);
			});

			test('should refuse to publish the workflow', async ({ api }) => {
				const response = await api.workflows.activateRaw(workflow.id, workflow.versionId!);

				expect(response.status()).toBe(403);
				expect(await violationsOf(response)).toEqual([
					expect.objectContaining({
						kind: 'node-type-unavailable',
						subject: NO_OP.type,
						scope: 'instance',
					}),
				]);
			});

			test('should fail a run of the workflow with the violation on the execution', async ({
				api,
			}) => {
				const { executionId } = await api.workflows.runManually(workflow.id, SCHEDULE_TRIGGER_NAME);
				const execution = await api.workflows.waitForExecutionById(executionId);

				expect(execution.status).toBe('error');
				expect(executionErrorOf(execution).violations).toEqual([
					expect.objectContaining({
						kind: 'node-type-unavailable',
						subject: NO_OP.type,
						scope: 'instance',
					}),
				]);
			});

			test('should show the blocked node as restricted and keep the workflow editable', async ({
				n8n,
			}) => {
				await n8n.start.fromExistingWorkflow(workflow.id);

				await expect(n8n.canvas.nodeRestrictedBadge(NO_OP.name)).toBeVisible();

				await n8n.canvas.openNode(NO_OP.name);
				await expect(n8n.ndv.getRestrictedNodePanel()).toBeVisible();
				await n8n.ndv.close();

				const saved = n8n.canvas.waitForSaveWorkflowCompleted();
				await n8n.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: true });

				expect((await saved).status()).toBe(200);
			});
		});

		test.describe('a project that narrows the instance policy', () => {
			let narrowedProjectId: string;
			let otherProjectId: string;

			test.beforeEach(async ({ api }) => {
				({ id: narrowedProjectId } = await api.projects.createProject());
				({ id: otherProjectId } = await api.projects.createProject());

				await api.nodeTypePolicies.setProjectPolicy(narrowedProjectId, {
					rules: [rule('deny', NO_OP.type)],
					defaultAction: 'allow',
				});
			});

			test('should report the type unavailable in that project only', async ({ api }) => {
				expect(await findType(api, narrowedProjectId, NO_OP.type)).toMatchObject({
					available: false,
					scope: 'project',
				});
				expect(await findType(api, otherProjectId, NO_OP.type)).toMatchObject({
					available: true,
				});
			});

			test('should refuse a workflow with the type in that project only', async ({ api }) => {
				const refused = await api.workflows.createWorkflowRaw(
					scheduleToNoOpWorkflow(),
					narrowedProjectId,
				);

				expect(refused.status()).toBe(403);
				expect(await violationsOf(refused)).toEqual([
					expect.objectContaining({
						kind: 'node-type-unavailable',
						subject: NO_OP.type,
						scope: 'project',
					}),
				]);

				const accepted = await api.workflows.createWorkflowRaw(
					scheduleToNoOpWorkflow(),
					otherProjectId,
				);
				expect(accepted.status()).toBe(200);
			});

			test('should show the type as restricted in the nodes panel of that project only', async ({
				api,
				n8n,
			}) => {
				const inNarrowed = await api.workflows.createWorkflow(
					triggerOnlyWorkflow(),
					narrowedProjectId,
				);
				const inOther = await api.workflows.createWorkflow(triggerOnlyWorkflow(), otherProjectId);

				await n8n.start.fromExistingWorkflow(inNarrowed.id);
				await n8n.canvas.nodeCreator.open();
				await n8n.canvas.nodeCreator.searchFor('No Operation');
				await expect(n8n.canvas.nodeCreator.getRestrictedItem(NO_OP.name)).toBeVisible();

				await n8n.start.fromExistingWorkflow(inOther.id);
				await n8n.canvas.nodeCreator.open();
				await n8n.canvas.nodeCreator.searchFor('No Operation');
				await expect(n8n.canvas.nodeCreator.getItem(NO_OP.name)).toBeVisible();
				await expect(n8n.canvas.nodeCreator.getRestrictedItem(NO_OP.name)).toBeHidden();
			});
		});

		test.describe('a type the instance delegates to projects', () => {
			test.beforeEach(async ({ api }) => {
				await api.nodeTypePolicies.setInstancePolicy({
					rules: [rule('delegate', NO_OP.type)],
					defaultAction: 'allow',
				});
			});

			test('should make the type available only in a project that allows it', async ({ api }) => {
				const { id: optedInProjectId } = await api.projects.createProject();
				const { id: otherProjectId } = await api.projects.createProject();

				await api.nodeTypePolicies.setProjectPolicy(optedInProjectId, {
					rules: [rule('allow', NO_OP.type)],
					defaultAction: 'allow',
				});

				expect(await findType(api, optedInProjectId, NO_OP.type)).toMatchObject({
					available: true,
				});
				expect(await findType(api, otherProjectId, NO_OP.type)).toMatchObject({
					available: false,
					optInAvailable: true,
				});

				const accepted = await api.workflows.createWorkflowRaw(
					scheduleToNoOpWorkflow(),
					optedInProjectId,
				);
				expect(accepted.status()).toBe(200);

				const refused = await api.workflows.createWorkflowRaw(
					scheduleToNoOpWorkflow(),
					otherProjectId,
				);
				expect(refused.status()).toBe(403);
				expect(await violationsOf(refused)).toEqual([
					expect.objectContaining({ kind: 'node-type-unavailable', subject: NO_OP.type }),
				]);
			});

			test('should not count a project default of allow as an opt-in', async ({ api }) => {
				const { id: projectId } = await api.projects.createProject();

				await api.nodeTypePolicies.setProjectPolicy(projectId, {
					rules: [],
					defaultAction: 'allow',
				});

				expect(await findType(api, projectId, NO_OP.type)).toMatchObject({ available: false });
			});
		});

		test.describe('a credential used by a blocked node', () => {
			let projectId: string;
			let credential: { id: string; name: string };

			test.beforeEach(async ({ api }) => {
				({ id: projectId } = await api.projects.createProject());

				const created = await api.credentials.createCredential({
					name: `Postgres ${nanoid(8)}`,
					type: 'postgres',
					data: {
						host: 'localhost',
						database: 'n8n',
						user: 'n8n',
						password: 'not-used',
						port: 5432,
					},
					projectId,
				});
				credential = { id: created.id, name: created.name };
			});

			test('should refuse to decrypt the credential for the blocked node', async ({ api }) => {
				await api.nodeTypePolicies.setInstancePolicy({
					rules: [rule('deny', POSTGRES.type)],
					defaultAction: 'allow',
				});

				const response = await loadPostgresColumns(api, credential, projectId);

				expect(response.ok()).toBe(false);
				expect((await response.json()).message).toBe(
					`Node type "${POSTGRES.type}" is blocked by an instance policy`,
				);
			});

			test('should show the blocked node as restricted on the canvas and in the nodes panel', async ({
				api,
				n8n,
			}) => {
				const workflow = await api.workflows.createWorkflow(
					postgresWorkflow(credential),
					projectId,
				);
				await api.nodeTypePolicies.setInstancePolicy({
					rules: [rule('deny', POSTGRES.type)],
					defaultAction: 'allow',
				});

				await n8n.start.fromExistingWorkflow(workflow.id);
				await expect(n8n.canvas.nodeRestrictedBadge(POSTGRES.name)).toBeVisible();

				await n8n.canvas.nodeCreator.open();
				await n8n.canvas.nodeCreator.searchFor(POSTGRES.name);
				await expect(n8n.canvas.nodeCreator.getRestrictedItem(POSTGRES.name)).toBeVisible();
			});
		});
	},
);
