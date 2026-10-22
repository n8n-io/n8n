import { nanoid } from 'nanoid';

import { test, expect } from '../../../../../fixtures/base';

test.use({ viewport: { width: 1280, height: 800 } });

test.describe(
	'Logs panel node names',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		for (const nodeName of [
			'Code',
			'Generate Daily Summary Report',
			'Send WhatsApp Daily Summary',
		]) {
			test(`should show "${nodeName}" in full beside execution output`, async ({ n8n, api }) => {
				const workflow = await api.workflows.createWorkflow({
					name: `Logs panel layout ${nanoid()}`,
					nodes: [
						{
							id: nanoid(),
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [240, 300],
							parameters: {},
						},
						{
							id: nanoid(),
							name: nodeName,
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [480, 300],
							parameters: {},
						},
					],
					connections: {
						Start: { main: [[{ node: nodeName, type: 'main', index: 0 }]] },
					},
				});

				try {
					await n8n.start.fromExistingWorkflow(workflow.id);
					const logs = n8n.canvas.logsPanel;
					await logs.open();
					await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
					await expect(logs.getOverviewStatus()).toContainText('Success in');
					await expect(logs.getSelectedLogEntry()).toContainText(nodeName);
					await expect(logs.outputPanel.get()).toBeVisible();

					const label = logs.getNodeName(nodeName);
					await expect(label).toBeVisible();

					// LIGO-884: Check rendered text, since an ellipsis does not change textContent.
					await expect
						.poll(
							async () =>
								await label.evaluate(async (element) => {
									await element.ownerDocument.fonts.ready;
									return element.scrollWidth - element.clientWidth;
								}),
							{ message: `The default node list must show the full name "${nodeName}"` },
						)
						.toBe(0);
				} finally {
					await api.workflows.archive(workflow.id);
					await api.workflows.delete(workflow.id);
				}
			});
		}
	},
);
