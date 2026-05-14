import { nanoid } from 'nanoid';

import { test, expect } from '../../../../../fixtures/base';
import type { TestRequirements } from '../../../../../Types';

const FIXTURE = 'Canvas-node-groups-fixture.json';
const TRIGGER = 'When clicking ‘Execute workflow’';
const DEFAULT_GROUP_TITLE = 'Group 1';

test.describe(
	'Canvas node groups',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		const requirements: TestRequirements = {
			storage: {
				N8N_EXPERIMENT_OVERRIDES: JSON.stringify({
					'083_canvas_nodes_grouping': true,
				}),
			},
		};

		test.beforeEach(async ({ n8n, setupRequirements }) => {
			await setupRequirements(requirements);
			await n8n.start.fromImportedWorkflow(FIXTURE);
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();
		});

		test('shows the Group toolbar above a valid selection and creates an overlay on click', async ({
			n8n,
		}) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B']);

			await expect(n8n.canvas.selectionToolbar.groupButton()).toBeVisible();
			await expect(n8n.canvas.selectionToolbar.extractSubWorkflowButton()).toBeVisible();
			await n8n.canvas.selectionToolbar.groupButton().click();

			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);
			await expect(n8n.canvas.getNodeGroupTitle(DEFAULT_GROUP_TITLE)).toBeVisible();
		});

		test('expands the group frame when a member node is dragged farther away', async ({ n8n }) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B']);
			await n8n.canvas.selectionToolbar.groupButton().click();
			await n8n.canvas.deselectAll();

			const before = await n8n.canvas.getNodeGroupBoundingBox(DEFAULT_GROUP_TITLE);
			await n8n.canvas.dragNodeToRelativePosition('Set B', 200, 0);
			const after = await n8n.canvas.getNodeGroupBoundingBox(DEFAULT_GROUP_TITLE);

			expect(after.width).toBeGreaterThan(before.width);
		});

		test('commits a new title on Enter and reverts on Escape', async ({ n8n }) => {
			const renamed = `Renamed ${nanoid(6)}`;
			await n8n.canvas.selectNodes(['Set A', 'Set B']);
			await n8n.canvas.selectionToolbar.groupButton().click();
			await n8n.canvas.deselectAll();

			await n8n.canvas.editNodeGroupTitle(DEFAULT_GROUP_TITLE, renamed, 'enter');
			await expect(n8n.canvas.getNodeGroupTitle(renamed)).toBeVisible();

			await n8n.canvas.cancelNodeGroupTitleEdit(renamed);
			await expect(n8n.canvas.getNodeGroupTitle(renamed)).toBeVisible();

			const blurredTitle = `Blurred ${nanoid(6)}`;
			await n8n.canvas.editNodeGroupTitle(renamed, blurredTitle, 'blur');
			await expect(n8n.canvas.getNodeGroupTitle(blurredTitle)).toBeVisible();
		});

		test('removes the overlay when the group ungroup button is clicked', async ({ n8n }) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B']);
			await n8n.canvas.selectionToolbar.groupButton().click();
			await n8n.canvas.deselectAll();

			await n8n.canvas.getNodeGroupHeader(DEFAULT_GROUP_TITLE).hover();
			await expect(n8n.canvas.groupUngroupButton(DEFAULT_GROUP_TITLE)).toBeVisible();
			await n8n.canvas.groupUngroupButton(DEFAULT_GROUP_TITLE).click();

			await expect(n8n.canvas.getNodeGroups()).toHaveCount(0);
			await expect(n8n.canvas.nodeByName('Set A')).toBeVisible();
			await expect(n8n.canvas.nodeByName('Set B')).toBeVisible();
			await expect(n8n.canvas.connectionBetweenNodes('Set A', 'Set B')).toHaveCount(1);
		});

		test('hides the Group action when nodes inside an existing group are selected', async ({
			n8n,
		}) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B', 'Set C']);
			await n8n.canvas.selectionToolbar.groupButton().click();
			await n8n.canvas.deselectAll();

			await n8n.canvas.selectNodes(['Set A', 'Set B']);
			await expect(n8n.canvas.selectionToolbar.groupButton()).toBeHidden();
			await expect(n8n.canvas.selectionToolbar.extractSubWorkflowButton()).toBeVisible();
		});

		test('hides the toolbar for invalid selections', async ({ n8n }) => {
			await n8n.canvas.nodeByName('Set A').click();
			await expect(n8n.canvas.selectionToolbar.root()).toBeHidden();

			await n8n.canvas.deselectAll();
			await n8n.canvas.selectNodes([TRIGGER, 'Set A']);
			await expect(n8n.canvas.selectionToolbar.root()).toBeHidden();
		});

		test('removes the group when membership drops below 2', async ({ n8n }) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B']);
			await n8n.canvas.selectionToolbar.groupButton().click();
			await n8n.canvas.deselectAll();
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);

			await n8n.canvas.deleteNodeFromContextMenu('Set B');
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(0);
		});

		test('keeps the group when one of three members is deleted', async ({ n8n }) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B', 'Set C']);
			await n8n.canvas.selectionToolbar.groupButton().click();
			await n8n.canvas.deselectAll();
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);

			await n8n.canvas.deleteNodeFromContextMenu('Set C');
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);
		});

		test('does not persist groups across navigation (Phase 1: in-memory only)', async ({ n8n }) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B']);
			await n8n.canvas.selectionToolbar.groupButton().click();
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);

			await n8n.page.reload();
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(0);
		});

		test('blocks Convert to sub-workflow for selections that include a trigger', async ({
			n8n,
		}) => {
			await n8n.canvas.selectNodes([TRIGGER, 'Set A']);
			await expect(n8n.canvas.selectionToolbar.root()).toBeHidden();
		});

		test('auto-extends the group when a new connection would otherwise invalidate it', async ({
			n8n,
		}) => {
			await n8n.canvas.selectNodes(['Set B', 'Set C']);
			await n8n.canvas.selectionToolbar.groupButton().click();
			await n8n.canvas.deselectAll();
			await expect(n8n.canvas.getNodeGroupByTitle(DEFAULT_GROUP_TITLE)).toBeVisible();

			const before = await n8n.canvas.getNodeGroupBoundingBox(DEFAULT_GROUP_TITLE);

			await n8n.canvas.connectNodesByDrag('Set A', 'Set C');

			await expect(
				n8n.notifications.getNotificationByTitle(`'${DEFAULT_GROUP_TITLE}' extended`),
			).toBeVisible();
			await expect(n8n.canvas.connectionBetweenNodes('Set A', 'Set C')).toHaveCount(1);

			const after = await n8n.canvas.getNodeGroupBoundingBox(DEFAULT_GROUP_TITLE);
			expect(after.width).toBeGreaterThan(before.width);
		});
	},
);
