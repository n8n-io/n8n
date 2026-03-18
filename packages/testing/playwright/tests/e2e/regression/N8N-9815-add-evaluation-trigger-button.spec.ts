import { test, expect } from '../../../fixtures/base';

test.describe(
	'N8N-9815 Add Evaluation Trigger button does not add node',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test('should add evaluation trigger node to canvas when clicking Add Evaluation Trigger button', async ({
			n8n,
			api,
		}) => {
			// Create a workflow via API
			const workflow = await api.workflows.createWorkflow({
				name: 'Test Workflow',
				nodes: [],
			});

			// Navigate to the evaluations tab with the addEvaluationTrigger action
			await n8n.page.goto(`/workflow/${workflow.id}/evaluation?action=addEvaluationTrigger`);

			// The node creator should open
			await expect(n8n.canvas.nodeCreator.getRoot()).toBeVisible();

			// The evaluation trigger node should be added to the canvas
			// This is the failing assertion - the node is NOT added
			const evaluationTriggerNode = n8n.canvas.getCanvasNodes().filter({
				has: n8n.page.getByText('Evaluation Trigger'),
			});

			await expect(evaluationTriggerNode).toHaveCount(1);
		});

		test('should navigate to the evaluation trigger node when clicking Add Evaluation Trigger button', async ({
			n8n,
			api,
		}) => {
			// Create a workflow via API
			const workflow = await api.workflows.createWorkflow({
				name: 'Test Workflow',
				nodes: [],
			});

			// Navigate to the evaluations tab with the addEvaluationTrigger action
			await n8n.page.goto(`/workflow/${workflow.id}/evaluation?action=addEvaluationTrigger`);

			// The node creator should open
			await expect(n8n.canvas.nodeCreator.getRoot()).toBeVisible();

			// The evaluation trigger node should be visible on the canvas
			// and should be selected/highlighted
			const evaluationTriggerNode = n8n.canvas.nodeByName('Evaluation Trigger');

			await expect(evaluationTriggerNode).toBeVisible();
		});
	},
);
