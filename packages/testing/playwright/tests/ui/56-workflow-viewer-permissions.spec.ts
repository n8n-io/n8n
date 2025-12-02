import { nanoid } from 'nanoid';

import { INSTANCE_MEMBER_CREDENTIALS } from '../../config/test-users';
import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';
import type { ApiHelpers } from '../../services/api-helper';

const MEMBER_EMAIL = INSTANCE_MEMBER_CREDENTIALS[0].email;

// Helper to create custom roles via REST API with unique names
async function createCustomRole(
	api: ApiHelpers,
	scopes: string[],
	displayName: string,
): Promise<{ slug: string }> {
	const uniqueName = `${displayName} (${nanoid(8)})`;
	const response = await api.request.post('/rest/roles', {
		data: {
			displayName: uniqueName,
			description: `Custom role with scopes: ${scopes.join(', ')}`,
			roleType: 'project',
			scopes,
		},
	});
	const result = await response.json();
	return result.data;
}

// Helper to set up a project with a workflow and sign in as member with specified role
async function setupProjectWithWorkflowAndSignInAsMember({
	n8n,
	projectName,
	roleSlug,
	nodeName,
}: {
	n8n: n8nPage;
	projectName: string;
	roleSlug: string;
	nodeName: string;
}): Promise<void> {
	await n8n.navigate.toHome();

	// Create project and add member with role
	const { projectId, projectName: createdProjectName } =
		await n8n.projectComposer.createProject(projectName);
	await n8n.api.projects.addUserToProjectByEmail(projectId, MEMBER_EMAIL, roleSlug);

	// Create workflow with node
	await n8n.sideBar.clickProjectMenuItem(createdProjectName);
	await n8n.workflows.clickNewWorkflowCard();
	await n8n.canvas.addNode(nodeName, { closeNDV: true });
	await n8n.canvas.saveWorkflow();

	// Sign in as member and navigate to the workflow
	await n8n.api.signin('member', 0);
	await n8n.navigate.toHome();
	await n8n.sideBar.clickProjectMenuItem(createdProjectName);
	await n8n.workflows.cards.getWorkflows().first().click();
	await expect(n8n.canvas.getLoadingMask()).toBeHidden({ timeout: 30000 });
}

test.describe('Workflow Viewer Permissions @isolated', () => {
	test.describe.configure({ mode: 'serial' });

	let readOnlyRole: { slug: string };
	let editorRole: { slug: string };

	test.beforeAll(async ({ api }) => {
		await api.resetDatabase();
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('customRoles');
		await api.setMaxTeamProjectsQuota(-1);

		// Sign in as owner (admin) to create custom roles
		await api.signin('owner');

		// Create custom read-only role (no workflow:update scope)
		readOnlyRole = await createCustomRole(
			api,
			['project:read', 'workflow:read', 'workflow:list'],
			'Workflow Read Only',
		);

		// Create custom editor role (with workflow:update scope)
		editorRole = await createCustomRole(
			api,
			['project:read', 'workflow:read', 'workflow:list', 'workflow:update', 'workflow:execute'],
			'Workflow Custom Editor',
		);
	});

	test('user without workflow:update scope cannot drag nodes @auth:owner', async ({ n8n }) => {
		await setupProjectWithWorkflowAndSignInAsMember({
			n8n,
			projectName: 'Drag Test Project',
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
			projectName: 'Copy Test Project',
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
			projectName: 'Editor Test Project',
			roleSlug: editorRole.slug,
			nodeName: 'Edit Fields (Set)',
		});

		// Drag should work
		const node = n8n.canvas.nodeByName('Edit Fields');
		const initialPosition = await node.boundingBox();

		await n8n.canvas.dragNodeToRelativePosition('Edit Fields', 100, 50);

		const finalPosition = await node.boundingBox();

		// Position SHOULD change
		expect(finalPosition?.x).not.toBe(initialPosition?.x);

		// Copy and paste should work
		await n8n.canvasComposer.selectAllAndCopy();

		const nodeCountBefore = await n8n.canvas.getCanvasNodes().count();
		await n8n.page.keyboard.press('ControlOrMeta+V');
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(nodeCountBefore + 1);
	});
});
