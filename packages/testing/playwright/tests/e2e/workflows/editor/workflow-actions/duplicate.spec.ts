import { nanoid } from 'nanoid';

import { MANUAL_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe('Workflow Duplicate @fixme', () => {
	test.fixme();

	const DUPLICATE_WORKFLOW_NAME = 'Duplicated workflow';

	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
	});

	test('should duplicate unsaved workflow', async ({ n8n }) => {
		const uniqueTag = `Duplicate-${nanoid(6)}`;
		await n8n.workflowComposer.duplicateWorkflow(DUPLICATE_WORKFLOW_NAME, uniqueTag);

		await expect(n8n.notifications.getErrorNotifications()).toHaveCount(0);
	});

	test('should duplicate saved workflow', async ({ n8n }) => {
		await n8n.canvas.saveWorkflow();
		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');

		const uniqueTag = `Duplicate-${nanoid(6)}`;
		await n8n.workflowComposer.duplicateWorkflow(DUPLICATE_WORKFLOW_NAME, uniqueTag);

		await expect(n8n.notifications.getErrorNotifications()).toHaveCount(0);
	});
});
