import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

// NODE-5991: Numbered recovery steps must stay inside the parameter error tooltip.
test.describe(
	'If node error tooltip lists',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n, api }) => {
			const { workflowId } = await api.workflows.createWorkflowFromDefinition({
				name: `Tooltip list ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'If',
						type: 'n8n-nodes-base.if',
						typeVersion: 2.2,
						position: [0, 0],
						parameters: {
							conditions: {
								options: {
									caseSensitive: true,
									leftValue: '',
									typeValidation: 'strict',
									version: 2,
								},
								conditions: [
									{
										id: nanoid(),
										leftValue: '={{ 123 }}',
										rightValue: '123',
										operator: { type: 'string', operation: 'equals' },
									},
								],
								combinator: 'and',
							},
							options: {},
						},
					},
				],
				connections: {},
			});
			await n8n.start.fromExistingWorkflow(workflowId);
			await n8n.canvas.openNode('If');
			await expect(n8n.ndv.getParameterInputIssues()).toBeVisible();
			await n8n.ndv.getParameterInputIssues().hover();
			await expect(n8n.ndv.getTooltip()).toContainText("Wrong type: '123' is a number");
			await expect(n8n.ndv.getTooltipOrderedList()).toBeVisible();
		});

		test('should show numbered recovery steps for a condition type mismatch', async ({ n8n }) => {
			await expect(n8n.ndv.getTooltipOrderedList()).toHaveText([
				"Enabling 'Convert types where required' Converting the first field to a string by adding .toString()",
			]);
			await expect(n8n.ndv.getTooltipOrderedList()).toHaveCSS('list-style-type', 'decimal');
			expect(await n8n.ndv.getTooltipOrderedListMarkerBounds()).toHaveLength(2);
		});

		test('should keep numbered recovery steps inside the error tooltip frame', async ({ n8n }) => {
			const tooltip = (await n8n.ndv.getTooltip().boundingBox())!;
			expect(tooltip).not.toBeNull();

			const markers = await n8n.ndv.getTooltipOrderedListMarkerBounds();
			expect(markers).toHaveLength(2);
			for (const [index, marker] of markers.entries()) {
				expect(
					marker.left,
					`Recovery step ${index + 1} extends left of the tooltip`,
				).toBeGreaterThanOrEqual(tooltip.x);
				expect(marker.right).toBeLessThanOrEqual(tooltip.x + tooltip.width);
				expect(marker.top).toBeGreaterThanOrEqual(tooltip.y);
				expect(marker.bottom).toBeLessThanOrEqual(tooltip.y + tooltip.height);
			}
		});
	},
);
