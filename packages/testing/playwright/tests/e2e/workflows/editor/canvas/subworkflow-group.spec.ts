import { nanoid } from 'nanoid';

import { test, expect } from '../../../../../fixtures/base';
import type { TestRequirements } from '../../../../../Types';

const FIXTURE = 'subworkflow-group.json';

const requirements: TestRequirements = {
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '101_sub_workflow_groups': true }),
	},
};

test.describe(
	'Sub-workflow group',
	{ annotation: [{ type: 'owner', description: 'Adore' }] },
	() => {
		test('renders as a collapsed chip and keeps the title bar anchored on expand', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);
			await n8n.start.fromImportedWorkflow(FIXTURE);
			await n8n.canvas.clickZoomToFitButton();

			const chip = n8n.canvas.getNodeGroupByTitle('Call My Sub-workflow');
			await expect(chip).toBeVisible();
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1); // host hidden

			const before = await n8n.canvas.getNodeGroupBoundingBox('Call My Sub-workflow');

			await n8n.canvas.toggleNodeGroup('Call My Sub-workflow');
			await n8n.page.waitForTimeout(400);
			const after = await n8n.canvas.getNodeGroupBoundingBox('Call My Sub-workflow');

			// The title bar top-left must stay put when the frame grows downward on expand.
			expect(Math.abs(after.x - before.x)).toBeLessThan(2);
			expect(Math.abs(after.y - before.y)).toBeLessThan(2);
		});

		test('expanding shows the sub-workflow nodes inside the frame', async ({
			n8n,
			api,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);

			const target = await api.workflows.createWorkflow({
				name: `Sub-workflow ${nanoid()}`,
				nodes: [
					{
						parameters: {},
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						typeVersion: 1.1,
						position: [0, 0],
						id: 'cc000000-0000-0000-0000-0000000000t1',
						name: 'When Executed by Another Workflow',
					},
					{
						parameters: { assignments: { assignments: [] }, options: {} },
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [220, 0],
						id: 'cc000000-0000-0000-0000-0000000000s1',
						name: 'Sub Step A',
					},
					{
						parameters: { assignments: { assignments: [] }, options: {} },
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [440, 0],
						id: 'cc000000-0000-0000-0000-0000000000s2',
						name: 'Sub Step B',
					},
				],
				connections: {
					'When Executed by Another Workflow': {
						main: [[{ node: 'Sub Step A', type: 'main', index: 0 }]],
					},
					'Sub Step A': { main: [[{ node: 'Sub Step B', type: 'main', index: 0 }]] },
				},
			});

			const caller = await api.workflows.createWorkflow({
				name: `Caller ${nanoid()}`,
				nodes: [
					{
						parameters: {},
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						id: 'dd000000-0000-0000-0000-0000000000t1',
						name: 'When clicking ‘Execute workflow’',
					},
					{
						parameters: {
							source: 'database',
							workflowId: { __rl: true, mode: 'id', value: target.id },
							options: {},
						},
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1.2,
						position: [260, 0],
						id: 'dd000000-0000-0000-0000-0000000000w1',
						name: 'Call My Sub-workflow',
					},
				],
				connections: {
					'When clicking ‘Execute workflow’': {
						main: [[{ node: 'Call My Sub-workflow', type: 'main', index: 0 }]],
					},
				},
			});

			await n8n.navigate.toWorkflow(caller.id);
			await n8n.canvas.clickZoomToFitButton();
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1); // host hidden

			await n8n.canvas.toggleNodeGroup('Call My Sub-workflow');
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1 + 3); // trigger + 3 interior nodes
		});

		test('pushes a downstream node aside when the group expands', async ({
			n8n,
			api,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);

			const target = await api.workflows.createWorkflow({
				name: `Sub-workflow ${nanoid()}`,
				nodes: [
					{
						parameters: {},
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						typeVersion: 1.1,
						position: [0, 0],
						id: 'ee000000-0000-0000-0000-0000000000t1',
						name: 'When Executed by Another Workflow',
					},
					{
						parameters: { assignments: { assignments: [] }, options: {} },
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [220, 0],
						id: 'ee000000-0000-0000-0000-0000000000s1',
						name: 'Sub Step A',
					},
				],
				connections: {
					'When Executed by Another Workflow': {
						main: [[{ node: 'Sub Step A', type: 'main', index: 0 }]],
					},
				},
			});

			const caller = await api.workflows.createWorkflow({
				name: `Caller ${nanoid()}`,
				nodes: [
					{
						parameters: {},
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						id: 'ff000000-0000-0000-0000-0000000000t1',
						name: 'When clicking ‘Execute workflow’',
					},
					{
						parameters: {
							source: 'database',
							workflowId: { __rl: true, mode: 'id', value: target.id },
							options: {},
						},
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1.2,
						position: [260, 0],
						id: 'ff000000-0000-0000-0000-0000000000w1',
						name: 'Call My Sub-workflow',
					},
					{
						parameters: { assignments: { assignments: [] }, options: {} },
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [280, 220],
						id: 'ff000000-0000-0000-0000-0000000000d1',
						name: 'Downstream',
					},
				],
				connections: {
					'When clicking ‘Execute workflow’': {
						main: [[{ node: 'Call My Sub-workflow', type: 'main', index: 0 }]],
					},
					'Call My Sub-workflow': {
						main: [[{ node: 'Downstream', type: 'main', index: 0 }]],
					},
				},
			});

			await n8n.navigate.toWorkflow(caller.id);
			await n8n.canvas.clickZoomToFitButton();

			const before = await n8n.canvas.nodeByName('Downstream').boundingBox();
			await n8n.canvas.toggleNodeGroup('Call My Sub-workflow');
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1 + 1 + 2); // trigger + downstream + 2 interior nodes
			await n8n.page.waitForTimeout(500);
			const after = await n8n.canvas.nodeByName('Downstream').boundingBox();

			// Expanding the group's frame downward must push the node below it down.
			expect(after!.y).toBeGreaterThan(before!.y + 20);
		});
	},
);
