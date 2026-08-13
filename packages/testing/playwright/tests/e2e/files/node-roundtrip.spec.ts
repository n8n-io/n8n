import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Files node',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should download a stored project file into execution binary data', async ({
			n8n,
			api,
		}) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const fileName = `pricing-${nanoid(8)}.csv`;
			await api.files.uploadFile(project.id, fileName, 'sku,price\nWIDGET,10\n', {
				mimeType: 'text/csv',
			});

			// By-name reference: the headline Files-node use case (survives replaces)
			const workflow = await api.workflows.createWorkflow(
				{
					name: `Files roundtrip ${nanoid(8)}`,
					nodes: [
						{
							id: nanoid(),
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: nanoid(),
							name: 'Files',
							type: 'n8n-nodes-base.files',
							typeVersion: 1,
							position: [220, 0],
							parameters: {
								resource: 'file',
								operation: 'download',
								fileId: { __rl: true, mode: 'name', value: fileName },
								binaryPropertyOutput: 'data',
							},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Files', type: 'main', index: 0 }]],
						},
					},
				},
				project.id,
			);

			await n8n.start.fromExistingWorkflow(workflow.id);
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
				{ timeout: 10_000 },
			);

			await n8n.canvas.openNode('Files');
			await n8n.ndv.outputPanel.switchDisplayMode('binary');
			await expect(n8n.ndv.outputPanel.getBinaryDataEntry(0)).toBeVisible();
			await expect(n8n.ndv.outputPanel.getBinaryDataEntry(0)).toContainText(fileName);
			await expect(n8n.ndv.outputPanel.getBinaryDataEntry(0)).toContainText('text/csv');
		});
	},
);
