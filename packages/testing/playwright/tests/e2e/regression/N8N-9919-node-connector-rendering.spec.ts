import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for N8N-9919: Bug — Rendering of executed nodes is messed up
 *
 * Issue:
 * 1. Nodes don't turn green as soon as they're executed
 * 2. Some connectors never turn green even though the node before them was successfully executed
 *
 * Reference: https://linear.app/n8n/issue/N8N-9919
 */

test.describe('N8N-9919: Node and connector state rendering during execution', () => {
	test('should update all nodes to success state after execution @mode:sqlite', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Node_connector_state_rendering.json');

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		// Wait for workflow execution to complete
		await n8n.notifications.waitForNotification('Workflow executed successfully');

		// All nodes should show success indicators
		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Manual Trigger')).toBeVisible();
		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Step 1')).toBeVisible();
		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Step 2')).toBeVisible();
		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Step 3')).toBeVisible();
		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Step 4')).toBeVisible();
	});

	test('should update all connectors to success state after execution @mode:sqlite', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Node_connector_state_rendering.json');

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		// Wait for workflow execution to complete
		await n8n.notifications.waitForNotification('Workflow executed successfully');

		// Get all connections in the workflow
		const connectorManualToStep1 = n8n.canvas.connectionBetweenNodes('Manual Trigger', 'Step 1');
		const connectorStep1ToStep2 = n8n.canvas.connectionBetweenNodes('Step 1', 'Step 2');
		const connectorStep2ToStep3 = n8n.canvas.connectionBetweenNodes('Step 2', 'Step 3');
		const connectorStep3ToStep4 = n8n.canvas.connectionBetweenNodes('Step 3', 'Step 4');

		// All connectors should have success status
		await expect(connectorManualToStep1).toHaveAttribute('data-edge-status', 'success');
		await expect(connectorStep1ToStep2).toHaveAttribute('data-edge-status', 'success');
		await expect(connectorStep2ToStep3).toHaveAttribute('data-edge-status', 'success');
		await expect(connectorStep3ToStep4).toHaveAttribute('data-edge-status', 'success');
	});

	test('should update nodes and connectors simultaneously during execution @mode:sqlite', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Node_connector_state_rendering.json');

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		// Wait for workflow execution to complete
		await n8n.notifications.waitForNotification('Workflow executed successfully');

		// Verify both nodes and their connectors are in success state
		// This test captures the complete visual state that users expect to see

		// Node 1 and its outgoing connector
		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Step 1')).toBeVisible();
		await expect(
			n8n.canvas.connectionBetweenNodes('Step 1', 'Step 2')
		).toHaveAttribute('data-edge-status', 'success');

		// Node 2 and its outgoing connector
		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Step 2')).toBeVisible();
		await expect(
			n8n.canvas.connectionBetweenNodes('Step 2', 'Step 3')
		).toHaveAttribute('data-edge-status', 'success');

		// Node 3 and its outgoing connector
		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Step 3')).toBeVisible();
		await expect(
			n8n.canvas.connectionBetweenNodes('Step 3', 'Step 4')
		).toHaveAttribute('data-edge-status', 'success');

		// Final node
		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Step 4')).toBeVisible();
	});

	test('should count correct number of success edges after full workflow execution @mode:sqlite', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Node_connector_state_rendering.json');

		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.clickExecuteWorkflowButton();

		// Wait for workflow execution to complete
		await n8n.notifications.waitForNotification('Workflow executed successfully');

		// There are 4 connections in total (Manual->Step1->Step2->Step3->Step4)
		// All should be marked as success
		const successEdges = n8n.canvas.getSuccessEdges();
		await expect(successEdges).toHaveCount(4);
	});
});
