import { INSTANCE_MEMBER_CREDENTIALS } from '../../../../config/test-users';
import { test, expect } from '../../../../fixtures/base';
import type { n8nPage } from '../../../../pages/n8nPage';

const MEMBER_EMAIL = INSTANCE_MEMBER_CREDENTIALS[0].email;

// Helper to set up a project with a workflow and sign in as member with specified role
async function setupProjectWithWorkflowAndSignInAsMember({
	n8n,
	roleSlug,
	nodeName,
}: {
	n8n: n8nPage;
	roleSlug: string;
	nodeName: string;
}): Promise<void> {
	await n8n.navigate.toHome();

	// Create project and add member with role
	const { projectId, projectName: createdProjectName } = await n8n.projectComposer.createProject();
	await n8n.api.projects.addUserToProjectByEmail(projectId, MEMBER_EMAIL, roleSlug);

	// Create workflow with node
	await n8n.sideBar.clickProjectMenuItem(createdProjectName);
	await n8n.workflows.clickNewWorkflowButtonFromProject();
	await n8n.canvas.addNode(nodeName, { closeNDV: true });
	await n8n.canvas.waitForSaveWorkflowCompleted();

	// Sign in as member and navigate to the workflow
	await n8n.api.signin('member', 0);
	await n8n.navigate.toHome();
	await n8n.sideBar.clickProjectMenuItem(createdProjectName);
	await n8n.workflows.cards.getWorkflows().first().click();
	await expect(n8n.canvas.canvasPane()).toBeVisible();
	await expect(n8n.canvas.getLoadingMask()).toBeHidden({ timeout: 30000 });
	await expect(n8n.canvas.getLoadingMask()).not.toBeAttached();
}

test.describe('Workflow Viewer Permissions @isolated', () => {
	test.describe.configure({ mode: 'serial' });

	let readOnlyRole: { slug: string };
	let editorRole: { slug: string };

	test.beforeAll(async ({ api }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('customRoles');
		await api.setMaxTeamProjectsQuota(-1);

		// Sign in as owner (admin) to create custom roles
		await api.signin('owner');

		// Create custom read-only role (no workflow:update scope)
		readOnlyRole = await api.roles.createCustomRole(
			['project:read', 'workflow:read', 'workflow:list'],
			'Workflow Read Only',
		);

		// Create custom editor role (with workflow:update scope)
		editorRole = await api.roles.createCustomRole(
			['project:read', 'workflow:read', 'workflow:list', 'workflow:update', 'workflow:execute'],
			'Workflow Custom Editor',
		);
	});

	test('user without workflow:update scope cannot drag nodes @auth:owner', async ({ n8n }) => {
		await setupProjectWithWorkflowAndSignInAsMember({
			n8n,
			roleSlug: readOnlyRole.slug,
			nodeName: 'Edit Fields (Set)',
		});

		// Attempt to drag - node should not move (no workflow:update scope)
		const node = n8n.canvas.nodeByName('Edit Fields');
		const initialPosition = await node.boundingBox();

		await n8n.canvas.dragNodeToRelativePosition('Edit Fields', 100, 50);

		const finalPosition = await node.boundingBox();

		// Position should remain unchanged
		expect(finalPosition?.x).toBe(initialPosition?.x);
		expect(finalPosition?.y).toBe(initialPosition?.y);
	});

	test('user without workflow:update can copy but cannot paste @auth:owner', async ({ n8n }) => {
		await setupProjectWithWorkflowAndSignInAsMember({
			n8n,
			roleSlug: readOnlyRole.slug,
			nodeName: 'Edit Fields (Set)',
		});

		// Copy SHOULD work (useful for copying to another workflow)
		await n8n.canvasComposer.selectAllAndCopy();

		// Paste should NOT work (requires workflow:update)
		const nodeCountBefore = await n8n.canvas.getCanvasNodes().count();
		await n8n.page.keyboard.press('ControlOrMeta+V');
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(nodeCountBefore);
	});

	test('user with workflow:update scope can drag and paste @auth:owner', async ({ n8n }) => {
		await setupProjectWithWorkflowAndSignInAsMember({
			n8n,
			roleSlug: editorRole.slug,
			nodeName: 'Edit Fields (Set)',
		});

		// Drag should work
		const node = n8n.canvas.nodeByName('Edit Fields');
		const initialPosition = await node.boundingBox();

		await n8n.canvas.dragNodeToRelativePosition('Edit Fields', 100, 50);

		// Position SHOULD change
		await expect.poll(async () => (await node.boundingBox())?.x).not.toBe(initialPosition?.x);

		// Copy and paste should work
		await n8n.canvasComposer.selectAllAndCopy();

		const nodeCountBefore = await n8n.canvas.getCanvasNodes().count();
		await n8n.page.keyboard.press('ControlOrMeta+V');
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(nodeCountBefore + 1);
	});
});
