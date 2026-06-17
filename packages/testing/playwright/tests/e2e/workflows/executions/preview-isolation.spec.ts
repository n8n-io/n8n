import { test, expect } from '../../../../fixtures/base';

test.describe('Execution preview isolation', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');
	});

	test('should preserve unsaved editor changes while previewing an execution', async ({ n8n }) => {
		await n8n.executionsComposer.createExecutions(1);

		// Make an unsaved editor change: enable the (initially disabled) Error node
		await n8n.canvas.toggleNodeEnabled('Error');
		await expect(n8n.canvas.disabledNodes()).toHaveCount(0);

		await n8n.canvas.clickExecutionsTab();
		await expect(n8n.executions.getExecutionItems().first()).toBeVisible();
		await n8n.executions.clickLastExecutionItem();

		// The preview renders natively with the executed workflow snapshot
		await expect(n8n.executions.getPreview()).toBeVisible();
		await expect(n8n.executions.getPreviewCanvasNodes().first()).toBeVisible();

		// The snapshot still has the Error node disabled — the editor's unsaved
		// change must not leak into the preview
		await expect(n8n.canvas.disabledNodes()).toHaveCount(1);

		// The logs panel renders natively inside the preview
		await n8n.executions.logsPanel.open();
		await expect(n8n.executions.logsPanel.getOverviewStatus()).toBeVisible();

		// A node can be inspected in the read-only NDV
		await n8n.canvas.openNode('Code');
		await expect(n8n.ndv.container).toBeVisible();
		await expect(n8n.ndv.getOutputPanel()).toBeVisible();
		await n8n.ndv.clickBackToCanvasButton();

		// Back in the editor, the unsaved change (and the workflow itself) is intact
		await n8n.canvas.clickEditorTab();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.canvas.disabledNodes()).toHaveCount(0);
	});

	test('should keep the preview working when switching between executions', async ({ n8n }) => {
		await n8n.executionsComposer.createExecutions(3);

		await n8n.canvas.clickExecutionsTab();
		await expect(n8n.executions.getExecutionItems().first()).toBeVisible();

		await n8n.executions.getExecutionItems().nth(0).click();
		await expect(n8n.executions.getPreviewCanvasNodes().first()).toBeVisible();

		await n8n.executions.getExecutionItems().nth(1).click();
		await expect(n8n.executions.getPreviewCanvasNodes().first()).toBeVisible();

		// Switching back re-renders instantly from the already-loaded execution
		await n8n.executions.getExecutionItems().nth(0).click();
		await expect(n8n.executions.getPreviewCanvasNodes().first()).toBeVisible();
	});
});
