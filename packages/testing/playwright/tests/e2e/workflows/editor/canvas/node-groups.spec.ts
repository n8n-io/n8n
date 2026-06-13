import { nanoid } from 'nanoid';

import { test, expect } from '../../../../../fixtures/base';
import type { TestRequirements } from '../../../../../Types';

const FIXTURE = 'Canvas-node-groups-fixture.json';
const IF_FIXTURE = 'Canvas-node-groups-if-fixture.json';
const PERSISTED_FIXTURE = 'Canvas-node-groups-persisted-fixture.json';
const TRIGGER = 'When clicking ‘Execute workflow’';
const DEFAULT_GROUP_TITLE = 'Group 1';
const PERSISTED_GROUP_TITLE = 'Persisted group';
const SET_A_NODE_ID = 'b2e0f1a8-5b8f-4b2b-a0c2-9b3e2d2a0002';
const SET_B_NODE_ID = 'c3f1a2b8-6c9f-4c2c-b0d2-aa4f3e3b0003';
const AUTOSAVE_TIMEOUT = 5_000;

// PERSISTED_FIXTURE has 4 workflow nodes but one group containing 2 of them.
// Groups load collapsed by default, so only 2 canvas nodes render (trigger + Set C).
const VISIBLE_NODES_AFTER_COLLAPSED_LOAD = 2;

const requirements: TestRequirements = {
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({
			'083_canvas_nodes_grouping': true,
		}),
	},
};

test.describe(
	'Canvas node groups',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		let workflowId: string;

		test.beforeEach(async ({ n8n, setupRequirements }) => {
			await setupRequirements(requirements);
			const importResult = await n8n.start.fromImportedWorkflow(FIXTURE);
			workflowId = importResult.workflowId;
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

		test('keeps a single-node group when one of two members is deleted', async ({ n8n }) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B']);
			await n8n.canvas.selectionToolbar.groupButton().click();
			await n8n.canvas.deselectAll();
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);

			await n8n.canvas.deleteNodeFromContextMenu('Set B');
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);
			await expect(n8n.canvas.getNodeGroupTitle(DEFAULT_GROUP_TITLE)).toBeVisible();
		});

		test('removes the group when the last member is deleted', async ({ n8n }) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B']);
			await n8n.canvas.selectionToolbar.groupButton().click();
			await n8n.canvas.deselectAll();
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);

			await n8n.canvas.deleteNodeFromContextMenu('Set B');
			await n8n.canvas.deleteNodeFromContextMenu('Set A');
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

		test('includes nodeGroups in the autosave PATCH payload', async ({ n8n }) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B']);

			const saveResponsePromise = n8n.canvas.waitForSaveWorkflowCompleted({
				timeout: AUTOSAVE_TIMEOUT,
			});
			await n8n.canvas.selectionToolbar.groupButton().click();
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);

			const saveResponse = await saveResponsePromise;
			expect(saveResponse.request().method()).toBe('PATCH');

			const requestBody = saveResponse.request().postDataJSON() as {
				nodeGroups?: Array<{ id: string; name: string; nodeIds: string[] }>;
			};

			expect(requestBody.nodeGroups).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: DEFAULT_GROUP_TITLE,
						nodeIds: [SET_A_NODE_ID, SET_B_NODE_ID],
					}),
				]),
			);
		});

		test('persists groups after autosave and reload', async ({ n8n }) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B']);

			const saveResponsePromise = n8n.canvas.waitForSaveWorkflowCompleted({
				timeout: AUTOSAVE_TIMEOUT,
			});
			await n8n.canvas.selectionToolbar.groupButton().click();
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);

			await saveResponsePromise;

			const persisted = await n8n.api.workflows.getWorkflow(workflowId);
			expect(persisted.nodeGroups).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: DEFAULT_GROUP_TITLE,
						nodeIds: [SET_A_NODE_ID, SET_B_NODE_ID],
					}),
				]),
			);

			await n8n.page.reload();
			// Creating a group persists its expand state, so it reloads expanded with all nodes visible.
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);
			await expect(n8n.canvas.getNodeGroupTitle(DEFAULT_GROUP_TITLE)).toBeVisible();
			await expect(n8n.canvas.getNodeGroupFrame(DEFAULT_GROUP_TITLE)).toBeVisible();
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

test.describe(
	'Canvas node groups with multi-output boundary',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n, setupRequirements }) => {
			await setupRequirements(requirements);
			await n8n.start.fromImportedWorkflow(IF_FIXTURE);
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();
		});

		test('allows grouping but not extraction when the selection ends in an IF node with both branches connected', async ({
			n8n,
		}) => {
			await n8n.canvas.selectNodes(['Set A', 'If']);

			await expect(n8n.canvas.connectionBetweenNodes('If', 'Set B')).toHaveCount(1);
			await expect(n8n.canvas.connectionBetweenNodes('If', 'Set C')).toHaveCount(1);
			await expect(n8n.canvas.selectionToolbar.groupButton()).toBeVisible();
			await expect(n8n.canvas.selectionToolbar.extractSubWorkflowButton()).toBeHidden();
			await n8n.canvas.selectionToolbar.groupButton().click();

			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);
			await expect(n8n.canvas.getNodeGroupTitle(DEFAULT_GROUP_TITLE)).toBeVisible();
		});
	},
);

test.describe(
	'Canvas node groups loaded from API',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n, setupRequirements }) => {
			await setupRequirements(requirements);
			await n8n.start.fromImportedWorkflow(PERSISTED_FIXTURE);
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(VISIBLE_NODES_AFTER_COLLAPSED_LOAD);
			await n8n.canvas.clickZoomToFitButton();
		});

		test('renders groups from nodeGroups without creating them in the UI', async ({ n8n }) => {
			await expect(n8n.canvas.getNodeGroups()).toHaveCount(1);
			await expect(n8n.canvas.getNodeGroupTitle(PERSISTED_GROUP_TITLE)).toBeVisible();
		});
	},
);

test.describe(
	'Canvas node groups — collapse / expand',
	{ annotation: [{ type: 'owner', description: 'Adore' }] },
	() => {
		test.describe('Default state on workflow load', () => {
			test.beforeEach(async ({ n8n, setupRequirements }) => {
				await setupRequirements(requirements);
				await n8n.start.fromImportedWorkflow(PERSISTED_FIXTURE);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(VISIBLE_NODES_AFTER_COLLAPSED_LOAD);
				await n8n.canvas.clickZoomToFitButton();
			});

			test('groups load collapsed: frame is hidden, chevron shows expand caption', async ({
				n8n,
			}) => {
				await expect(n8n.canvas.getNodeGroupTitle(PERSISTED_GROUP_TITLE)).toBeVisible();
				await expect(n8n.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeHidden();
				await expect(n8n.canvas.groupToggleButton(PERSISTED_GROUP_TITLE)).toHaveAttribute(
					'aria-label',
					'Expand',
				);
			});

			test('clicking the chevron expands the group: frame and chevron caption flip', async ({
				n8n,
			}) => {
				await n8n.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);

				await expect(n8n.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeVisible();
				await expect(n8n.canvas.groupToggleButton(PERSISTED_GROUP_TITLE)).toHaveAttribute(
					'aria-label',
					'Collapse',
				);
			});

			test('clicking the chevron again collapses back', async ({ n8n }) => {
				await n8n.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);
				await expect(n8n.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeVisible();

				await n8n.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);
				await expect(n8n.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeHidden();
			});

			test('deleting a remapped collapsed-group connection clears it from workflow data', async ({
				n8n,
			}) => {
				await n8n.canvas.deleteConnectionBetweenNodes('Set B', 'Set C');
				await expect(n8n.canvas.connectionBetweenNodes('Set B', 'Set C')).toBeHidden();

				await n8n.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);
				await expect(n8n.canvas.nodeByName('Set B')).toBeVisible();
				await expect(n8n.canvas.connectionBetweenNodes('Set B', 'Set C')).toBeHidden();
			});
		});

		test.describe('Newly created groups start expanded', () => {
			test.beforeEach(async ({ n8n, setupRequirements }) => {
				await setupRequirements(requirements);
				await n8n.start.fromImportedWorkflow(FIXTURE);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
				await n8n.canvas.clickZoomToFitButton();
				await n8n.canvas.deselectAll();
			});

			test('a freshly created group is expanded; its frame is visible immediately', async ({
				n8n,
			}) => {
				await n8n.canvas.selectNodes(['Set A', 'Set B']);
				await n8n.canvas.selectionToolbar.groupButton().click();

				await expect(n8n.canvas.getNodeGroupFrame(DEFAULT_GROUP_TITLE)).toBeVisible();
				await expect(n8n.canvas.groupToggleButton(DEFAULT_GROUP_TITLE)).toHaveAttribute(
					'aria-label',
					'Collapse',
				);
			});
		});

		test.describe('Expand state persists across reload', () => {
			test.beforeEach(async ({ n8n, setupRequirements }) => {
				await setupRequirements(requirements);
				await n8n.start.fromImportedWorkflow(PERSISTED_FIXTURE);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(VISIBLE_NODES_AFTER_COLLAPSED_LOAD);
				await n8n.canvas.clickZoomToFitButton();
			});

			test('a group expanded by the user reloads expanded', async ({ n8n }) => {
				// The group loads collapsed by default; expand it deliberately.
				await expect(n8n.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeHidden();
				await n8n.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);
				await expect(n8n.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeVisible();

				await n8n.page.reload();

				await expect(n8n.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeVisible();
				await expect(n8n.canvas.groupToggleButton(PERSISTED_GROUP_TITLE)).toHaveAttribute(
					'aria-label',
					'Collapse',
				);
			});
		});
	},
);
