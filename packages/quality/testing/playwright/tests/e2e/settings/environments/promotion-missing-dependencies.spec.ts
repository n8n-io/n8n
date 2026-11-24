import type { ApiKeyScope } from '@n8n/permissions';
import type { GiteaHelper } from 'n8n-containers';
import type { INode } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { expect, test } from '../../../../fixtures/base';
import type { ApiHelpers } from '../../../../services/api-helper';
import type { PromotionsApiHelper } from '../../../../services/promotions-api-helper';
import { generateUniqueRepoName } from '../../../../utils/source-control-helper';

const PROMOTION_SCOPES: ApiKeyScope[] = [
	'promotions:manageProviders',
	'promotions:readProviders',
	'promotions:manageEnvironments',
	'promotions:readEnvironments',
	'promotions:promote',
];

const BRANCH = 'main';

type CreatedWorkflow = { id: string; name: string; versionId: string };

test.use({
	capability: {
		services: ['gitea'],
		env: {
			TEST_ISOLATION: 'promotion-missing-dependencies',
		},
	},
});

/** Enables the promotions UI and returns a helper for the promotions public API. */
async function preparePromotions(api: ApiHelpers): Promise<PromotionsApiHelper> {
	expect(
		await api.getActiveModules(),
		'the promotions module is not active: it needs a license granting feat:promotions at startup',
	).toContain('promotions');
	await api.enableFeature('promotions');
	// The editor loads the Environments version through source control preferences.
	await api.enableFeature('sourceControl');
	const { rawApiKey } = await api.publicApi.createApiKey(
		`Promotions ${nanoid()}`,
		PROMOTION_SCOPES,
	);
	const promotions = api.promotions.viaPublicApi(rawApiKey);
	// An instance has one environment for each direction, and the tests of this file share one.
	for (const { id } of await promotions.listEnvironments('instance')) {
		await promotions.deleteEnvironment(id);
	}
	return promotions;
}

function headerAuthNode({ id, name }: { id: string; name: string }): INode {
	return {
		id: nanoid(),
		name: 'Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: { url: 'https://example.com' },
		credentials: { httpHeaderAuth: { id, name } },
	};
}

function executeWorkflowNode(workflowId: string): INode {
	return {
		id: nanoid(),
		name: 'Execute',
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1,
		position: [200, 0],
		parameters: { workflowId: { __rl: true, mode: 'list', value: workflowId } },
	};
}

/**
 * The workflow `caller` of project A uses a credential of project B, which B shares with A, and
 * calls a sub-workflow of B. The workflow `independent` of project A uses nothing.
 */
async function seedCrossProjectUse(api: ApiHelpers) {
	const projectA = await api.projects.createProject('Orders');
	const projectB = await api.projects.createProject('Shared');
	const credential = await api.credentials.createCredential({
		name: `CRM key ${nanoid(6)}`,
		type: 'httpHeaderAuth',
		data: { name: 'X-Token', value: 'secret' },
		projectId: projectB.id,
	});
	await api.credentials.shareCredential(credential.id, [projectA.id]);
	const subWorkflow: CreatedWorkflow = await api.workflows.createWorkflow(
		{ name: `Notify ${nanoid(6)}`, nodes: [], connections: {} },
		projectB.id,
	);
	const caller: CreatedWorkflow = await api.workflows.createWorkflow(
		{
			name: `Sync ${nanoid(6)}`,
			nodes: [headerAuthNode(credential), executeWorkflowNode(subWorkflow.id)],
			connections: {},
		},
		projectA.id,
	);
	const independent: CreatedWorkflow = await api.workflows.createWorkflow(
		{ name: `Report ${nanoid(6)}`, nodes: [], connections: {} },
		projectA.id,
	);
	return { projectA, credential, subWorkflow, caller, independent };
}

/** Creates a repository and a provider that can read and write it. */
async function createRepository(promotions: PromotionsApiHelper, gitea: GiteaHelper) {
	const repoName = generateUniqueRepoName();
	await gitea.createRepo(repoName);
	const { provider } = await promotions.createProvider({
		name: `Gitea ${nanoid(6)}`,
		type: 'git',
		auth: { authType: 'token', username: gitea.adminUsername, password: gitea.adminPassword },
	});
	return {
		providerId: provider.id,
		remoteUrl: `http://gitea:3000/${gitea.adminUsername}/${repoName}.git`,
	};
}

/** Adds an instance environment on the repository and clones it. */
async function connectEnvironment(
	promotions: PromotionsApiHelper,
	{ providerId, remoteUrl }: { providerId: string; remoteUrl: string },
	direction: 'apply' | 'promote',
) {
	const common = {
		scope: 'instance' as const,
		providerId,
		remote: { schemaVersion: 1 as const, remoteUrl },
	};
	const environment = await promotions.createEnvironment(
		direction === 'promote'
			? {
					...common,
					name: `Production ${nanoid(6)}`,
					direction,
					settings: { schemaVersion: 1, baseBranchName: BRANCH, createBranchOnPromotion: false },
				}
			: {
					...common,
					name: `Development ${nanoid(6)}`,
					direction,
					settings: { schemaVersion: 1, branchName: BRANCH },
				},
	);
	expect((await promotions.connect(environment.id)).hasCheckout).toBe(true);
}

test.describe(
	'Promotion missing dependencies @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		test('promotes a workflow that uses dependencies of another project after a confirmation', async ({
			n8n,
			api,
			services,
		}) => {
			const promotions = await preparePromotions(api);
			const { projectA, credential, subWorkflow, caller, independent } =
				await seedCrossProjectUse(api);
			const repository = await createRepository(promotions, services.gitea);
			await connectEnvironment(promotions, repository, 'promote');
			const preview = n8n.promotionPreview;
			const unresolved = 'Promote with 2 unresolved dependencies';

			await n8n.start.fromHome();
			await preview.goto(projectA.id, 'promote');

			await test.step('name the unresolved dependencies of the selection on the button', async () => {
				await expect(preview.getWorkflowCheckbox(caller.id)).toBeChecked();
				await expect(preview.getWorkflowCheckbox(independent.id)).toBeChecked();
				await expect(preview.getIssuesTab()).toHaveText(/Issues\s*2$/);
				await expect(preview.getSubmitButton()).toHaveText(unresolved);
			});

			await test.step('show no issues for a workflow without such dependencies', async () => {
				await preview.getWorkflowCheckbox(caller.id).uncheck();
				await expect(preview.getWorkflowCheckbox(independent.id)).toBeChecked();
				await expect(preview.getIssuesTab()).toBeHidden();
				// The project and the workflow that stays selected.
				await expect(preview.getSubmitButton()).toHaveText('Promote 2 changes');
				await preview.getWorkflowCheckbox(caller.id).check();
				await expect(preview.getSubmitButton()).toHaveText(unresolved);
			});

			await test.step('list the dependencies of the other project on the Issues tab', async () => {
				await preview.getIssuesTab().click();
				const section = preview.getIssuesSection('In another project (2)');
				await expect(section).toBeVisible();
				for (const name of [credential.name, subWorkflow.name]) {
					await expect(section).toContainText(name);
					await expect(preview.getIssueRow(name)).toContainText(caller.name);
					await expect(preview.getIssueRow(name)).toContainText('Not included');
				}
			});

			await test.step('confirm the dependencies with the commit message', async () => {
				await preview.getSubmitButton().click();
				const dialog = preview.getPromoteDialog();
				await expect(preview.getPromoteDialogTitle()).toHaveText(`${unresolved}?`);
				await expect(preview.getUnresolvedDependency(dialog, credential.name)).toBeVisible();
				await expect(preview.getUnresolvedDependency(dialog, subWorkflow.name)).toBeVisible();
				await expect(preview.getPromoteConfirmButton()).toHaveText(unresolved);
				// The list comes before the commit message, so the user reads it first.
				const list = await preview.getUnresolvedDependencyList(dialog).boundingBox();
				const commitMessage = await preview.getPromoteCommitMessage().boundingBox();
				expect(list && commitMessage && list.y + list.height <= commitMessage.y).toBe(true);
			});

			await test.step('promote without the dependencies', async () => {
				await preview.getPromoteCommitMessage().fill('Promote the orders workflows');
				const promote = n8n.page.waitForResponse(
					(response) =>
						response.url().endsWith(`/promotions/projects/${projectA.id}/promote`) &&
						response.request().method() === 'POST',
				);
				await preview.getPromoteConfirmButton().click();
				const response = await promote;
				expect(response.ok()).toBe(true);
				expect(await response.json()).toMatchObject({
					status: 'promoted',
					git: { branchName: BRANCH },
					missingDependencies: [
						expect.objectContaining({ kind: 'credential', id: credential.id }),
						expect.objectContaining({ kind: 'workflow', id: subWorkflow.id }),
					],
				});
				await expect(n8n.notifications.getNotificationByTitle('Changes promoted')).toContainText(
					'2 dependencies are not included.',
				);
			});
		});

		test('applies a workflow that calls a workflow missing on this instance after a confirmation', async ({
			n8n,
			api,
			services,
		}) => {
			const promotions = await preparePromotions(api);
			const { projectA, subWorkflow, caller, independent } = await seedCrossProjectUse(api);
			const repository = await createRepository(promotions, services.gitea);
			await connectEnvironment(promotions, repository, 'promote');
			expect(
				await promotions.promoteProjectSelection(projectA.id, {
					workflowIds: [caller.id, independent.id],
					confirmMissingDependencies: true,
				}),
			).toMatchObject({ status: 'promoted' });
			// The branch exists after the Promote, so the Apply environment can clone it.
			await connectEnvironment(promotions, repository, 'apply');
			// The Apply needs a change to write, and a dependency that this instance lacks.
			const editedName = `Sync edited ${nanoid(6)}`;
			await api.workflows.update(caller.id, caller.versionId, { name: editedName });
			await api.workflows.archive(subWorkflow.id);
			await api.workflows.delete(subWorkflow.id);
			const preview = n8n.promotionPreview;
			const unresolved = 'Apply with 1 unresolved dependency';

			await n8n.start.fromHome();
			await preview.goto(projectA.id, 'apply');

			await test.step('name the unresolved dependency of the selection on the button', async () => {
				await expect(preview.getWorkflowCheckbox(caller.id)).toBeChecked();
				await expect(preview.getSubmitButton()).toHaveText(unresolved);
			});

			await test.step('list the missing workflow on the Issues tab', async () => {
				await expect(preview.getIssuesTab()).toHaveText(/Issues\s*1$/);
				await preview.getIssuesTab().click();
				await expect(preview.getIssueRow(subWorkflow.name)).toContainText('Not on the branch');
			});

			await test.step('keep the workflow that calls it selectable', async () => {
				await preview.getChangesTab().click();
				await preview.getWorkflowCheckbox(caller.id).uncheck();
				await expect(preview.getSubmitButton()).toBeDisabled();
				await preview.getWorkflowCheckbox(caller.id).check();
				await expect(preview.getSubmitButton()).toHaveText(unresolved);
				await expect(preview.getSubmitButton()).toBeEnabled();
			});

			await test.step('apply after the confirmation of the dependency', async () => {
				await preview.getSubmitButton().click();
				const dialog = preview.getApplyUnresolvedDialog();
				await expect(preview.getApplyUnresolvedDialogTitle()).toHaveText(`${unresolved}?`);
				await expect(preview.getUnresolvedDependency(dialog, subWorkflow.name)).toBeVisible();
				await expect(preview.getApplyUnresolvedConfirmButton()).toHaveText(unresolved);
				const apply = n8n.page.waitForResponse(
					(response) =>
						response.url().endsWith(`/promotions/projects/${projectA.id}/apply/continue`) &&
						response.request().method() === 'POST',
				);
				await preview.getApplyUnresolvedConfirmButton().click();
				const response = await apply;
				expect(response.ok()).toBe(true);
				expect(await response.json()).toMatchObject({ status: 'applied' });
				await expect(n8n.notifications.getNotificationByTitle('Changes applied')).toBeVisible();
				// The Apply wrote the workflow of the branch over the change on this instance.
				expect((await api.workflows.getWorkflow(caller.id)).name).toBe(caller.name);
			});
		});
	},
);
