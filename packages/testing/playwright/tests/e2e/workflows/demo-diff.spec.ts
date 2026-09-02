import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	config: {
		settings: {
			previewMode: true,
		},
	},
};

// Simple workflow structures for testing
const oldWorkflow = {
	id: 'old-workflow-id',
	name: 'Test Workflow - Before',
	nodes: [
		{
			parameters: {},
			id: '1',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
		},
		{
			parameters: {},
			id: '2',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [450, 300],
		},
	],
	connections: {
		'Manual Trigger': {
			main: [
				[
					{
						node: 'Set',
						type: 'main',
						index: 0,
					},
				],
			],
		},
	},
};

const newWorkflow = {
	id: 'new-workflow-id',
	name: 'Test Workflow - After',
	nodes: [
		{
			parameters: {},
			id: '1',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
		},
		{
			parameters: {
				options: {
					keepOnlySet: true,
				},
			},
			id: '2',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [450, 300],
		},
		{
			parameters: {},
			id: '3',
			name: 'Code',
			type: 'n8n-nodes-base.code',
			typeVersion: 1,
			position: [650, 300],
		},
	],
	connections: {
		'Manual Trigger': {
			main: [
				[
					{
						node: 'Set',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		Set: {
			main: [
				[
					{
						node: 'Code',
						type: 'main',
						index: 0,
					},
				],
			],
		},
	},
};

test.describe(
	'Workflow Diff Demo',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(requirements);
		});

		test('shows waiting state initially', async ({ n8n }) => {
			await n8n.demo.gotoDiff();
			// Verify the waiting state message is shown
			await expect(n8n.demo.getWaitingMessage()).toBeVisible();
		});

		test('renders diff view when receiving workflow data via postMessage', async ({ n8n }) => {
			await n8n.demo.gotoDiff();

			// Verify the waiting state is initially shown
			await expect(n8n.demo.getWaitingMessage()).toBeVisible();

			// Send postMessage with workflow data
			await n8n.demo.openDiff({ oldWorkflow, newWorkflow });

			// Wait for the diff view to appear - the waiting message should disappear
			await expect(n8n.demo.getWaitingMessage()).toBeHidden();

			// The workflow name should appear in the header
			await expect(n8n.demo.getDiffHeading()).toBeVisible();

			// The Changes button should be visible (part of the diff view header)
			await expect(n8n.demo.getChangesButton()).toBeVisible();
		});

		test('renders diff view with only new workflow (creation scenario)', async ({ n8n }) => {
			await n8n.demo.gotoDiff();

			// Wait for the page to be ready (component mounted with event listener active)
			await expect(n8n.demo.getWaitingMessage()).toBeVisible();

			// Send postMessage with only newWorkflow (simulating workflow creation)
			await n8n.demo.openDiff({ newWorkflow });

			// Wait for the diff view to appear
			await expect(n8n.demo.getWaitingMessage()).toBeHidden();

			// The workflow name from newWorkflow should appear
			await expect(n8n.demo.getDiffHeading('Test Workflow - After')).toBeVisible();
		});

		test('renders diff view with only old workflow (deletion scenario)', async ({ n8n }) => {
			await n8n.demo.gotoDiff();

			// Wait for the page to be ready (component mounted with event listener active)
			await expect(n8n.demo.getWaitingMessage()).toBeVisible();

			// Send postMessage with only oldWorkflow (simulating workflow deletion)
			await n8n.demo.openDiff({ oldWorkflow });

			// Wait for the diff view to appear
			await expect(n8n.demo.getWaitingMessage()).toBeHidden();

			// The workflow name from oldWorkflow should appear
			await expect(n8n.demo.getDiffHeading('Test Workflow - Before')).toBeVisible();
		});

		test('applies tidy up when tidyUp option is true', async ({ n8n }) => {
			await n8n.demo.gotoDiff();

			// Wait for the page to be ready (component mounted with event listener active)
			await expect(n8n.demo.getWaitingMessage()).toBeVisible();

			// Send postMessage with tidyUp: true
			await n8n.demo.openDiff({ oldWorkflow, newWorkflow, tidyUp: true });

			// Wait for the diff view to appear
			await expect(n8n.demo.getWaitingMessage()).toBeHidden();

			// The diff view should render (tidyUp affects node positioning but view should still render)
			await expect(n8n.demo.getDiffHeading()).toBeVisible();

			// The Changes button should be visible (part of the diff view header)
			await expect(n8n.demo.getChangesButton()).toBeVisible();
		});

		test('ignores malformed postMessage data', async ({ n8n }) => {
			await n8n.demo.gotoDiff();

			// Verify initial waiting state
			await expect(n8n.demo.getWaitingMessage()).toBeVisible();

			// Send malformed message
			await n8n.demo.postRawMessage('not valid json {{{');

			// Waiting state should still be shown
			await expect(n8n.demo.getWaitingMessage()).toBeVisible();
		});

		test('ignores non-openDiff commands', async ({ n8n }) => {
			await n8n.demo.gotoDiff();

			// Verify initial waiting state
			await expect(n8n.demo.getWaitingMessage()).toBeVisible();

			// Send a different command
			await n8n.demo.postRawMessage(JSON.stringify({ command: 'someOtherCommand', data: {} }));

			// Waiting state should still be shown
			await expect(n8n.demo.getWaitingMessage()).toBeVisible();
		});

		test('can override theme to dark', async ({ n8n }) => {
			await n8n.demo.gotoDiff({ theme: 'dark' });
			await expect(n8n.demo.getBody()).toHaveAttribute('data-theme', 'dark');
		});

		test('can override theme to light', async ({ n8n }) => {
			await n8n.demo.gotoDiff({ theme: 'light' });
			await expect(n8n.demo.getBody()).toHaveAttribute('data-theme', 'light');
		});
	},
);
