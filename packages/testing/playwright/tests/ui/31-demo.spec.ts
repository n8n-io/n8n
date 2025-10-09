import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';
import simpleWorkflow from '../../workflows/Manual_wait_set.json';
import workflowWithPinned from '../../workflows/Webhook_set_pinned.json';

const requirements: TestRequirements = {
	config: {
		settings: {
			previewMode: true,
		},
	},
};

test.describe('Demo', () => {
	test.beforeEach(async ({ setupRequirements }) => {
		await setupRequirements(requirements);
	});

	test('can import template', async ({ n8n }) => {
		await n8n.demo.visitDemoPage();
		expect(await n8n.notifications.getAllNotificationTexts()).toHaveLength(0);
		await n8n.demo.importWorkflow(simpleWorkflow);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
	});

	test('can import workflow with pin data', async ({ n8n }) => {
		await n8n.demo.visitDemoPage();
		await n8n.demo.importWorkflow(workflowWithPinned);
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		await n8n.canvas.openNode('Webhook');
		await expect(n8n.ndv.outputPanel.getTableHeaders().first()).toContainText('headers');
		await expect(n8n.ndv.outputPanel.getTbodyCell(0, 3)).toContainText('dragons');
	});

	test('can override theme to dark', async ({ n8n }) => {
		await n8n.demo.visitDemoPage('dark');
		await expect(n8n.demo.getBody()).toHaveAttribute('data-theme', 'dark');
		expect(await n8n.notifications.getAllNotificationTexts()).toHaveLength(0);
	});

	test('can override theme to light', async ({ n8n }) => {
		await n8n.demo.visitDemoPage('light');
		await expect(n8n.demo.getBody()).toHaveAttribute('data-theme', 'light');
		expect(await n8n.notifications.getAllNotificationTexts()).toHaveLength(0);
	});
});
