import fs from 'fs';

import { CODE_NODE_NAME, SCHEDULE_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import { resolveFromRoot } from '../../../../../utils/path-helper';

test.describe('Workflow Copy Paste @fixme', {
	annotation: [
		{ type: 'owner', description: 'Adore' },
	],
}, () => {
	test.fixme();

	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should copy nodes', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

		await expect(n8n.canvas.nodeCreator.getRoot()).not.toBeAttached();

		await n8n.clipboard.grant();

		await n8n.canvas.selectAll();
		await n8n.canvas.copyNodes();

		await n8n.notifications.waitForNotificationAndClose('Copied to clipboard');
		const clipboardText = await n8n.clipboard.readText();
		const copiedWorkflow = JSON.parse(clipboardText);

		expect(copiedWorkflow.nodes).toHaveLength(2);
	});

	test('should paste nodes (both current and old node versions)', async ({ n8n }) => {
		const workflowJson = fs.readFileSync(
			resolveFromRoot('workflows', 'Test_workflow-actions_paste-data.json'),
			'utf-8',
		);

		await n8n.canvas.canvasPane().click();
		await n8n.clipboard.paste(workflowJson);
		await n8n.canvas.clickZoomToFitButton();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(5);
	});

	test('should allow importing nodes without names', async ({ n8n }) => {
		const workflowJson = fs.readFileSync(
			resolveFromRoot('workflows', 'Test_workflow-actions_import_nodes_empty_name.json'),
			'utf-8',
		);

		await n8n.canvas.canvasPane().click();
		await n8n.clipboard.paste(workflowJson);
		await n8n.canvas.clickZoomToFitButton();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(2);

		const nodes = n8n.canvas.getCanvasNodes();
		const count = await nodes.count();
		for (let i = 0; i < count; i++) {
			await expect(nodes.nth(i)).toHaveAttribute('data-node-name');
		}
	});
});
