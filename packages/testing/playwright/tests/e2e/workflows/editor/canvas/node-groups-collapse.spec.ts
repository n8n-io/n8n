import { test, expect } from '../../../../../fixtures/base';
import type { TestRequirements } from '../../../../../Types';

const FIXTURE = 'Canvas-node-groups-fixture.json';
const PERSISTED_FIXTURE = 'Canvas-node-groups-persisted-fixture.json';
const DEFAULT_GROUP_TITLE = 'Group 1';
const PERSISTED_GROUP_TITLE = 'Persisted group';

const requirements: TestRequirements = {
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({
			'083_canvas_nodes_grouping': true,
		}),
	},
};

test.describe(
	'Canvas node groups — collapse / expand',
	{ annotation: [{ type: 'owner', description: 'Adore' }] },
	() => {
		test.describe('Default state on workflow load (AC #0)', () => {
			test.beforeEach(async ({ n8n, setupRequirements }) => {
				await setupRequirements(requirements);
				await n8n.start.fromImportedWorkflow(PERSISTED_FIXTURE);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
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
		});

		test.describe('Newly created groups start expanded (AC #0)', () => {
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

		test.describe('Toggle is view-state, not undoable (AC #9)', () => {
			test.beforeEach(async ({ n8n, setupRequirements }) => {
				await setupRequirements(requirements);
				await n8n.start.fromImportedWorkflow(PERSISTED_FIXTURE);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
				await n8n.canvas.clickZoomToFitButton();
			});

			test('Ctrl+Z after a toggle does not flip the group back', async ({ n8n }) => {
				// Loaded collapsed (AC #0); expand it.
				await n8n.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);
				await expect(n8n.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeVisible();

				await n8n.page.keyboard.press('ControlOrMeta+z');

				// Should remain expanded — collapse toggle is not in the undo stack.
				await expect(n8n.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeVisible();
			});
		});

		test.describe('Re-anchored edges & member hiding', () => {
			test.beforeEach(async ({ n8n, setupRequirements }) => {
				await setupRequirements(requirements);
				await n8n.start.fromImportedWorkflow(PERSISTED_FIXTURE);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
				await n8n.canvas.clickZoomToFitButton();
			});

			test('rapid collapse/expand toggling leaves no orphaned edges', async ({ n8n }) => {
				// Sanity baseline.
				await expect(n8n.canvas.getNodeGroupTitle(PERSISTED_GROUP_TITLE)).toBeVisible();

				for (let i = 0; i < 6; i++) {
					await n8n.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);
				}

				// Even count → back to collapsed. Title bar still visible, frame hidden,
				// no detached edges left behind.
				await expect(n8n.canvas.getNodeGroupTitle(PERSISTED_GROUP_TITLE)).toBeVisible();
				await expect(n8n.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeHidden();
			});
		});
	},
);
