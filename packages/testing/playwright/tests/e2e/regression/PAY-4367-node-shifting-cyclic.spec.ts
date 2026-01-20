import { test, expect } from '../../../fixtures/base';

/**
 * PAY-4367: Node shifting in cyclic workflows
 *
 * Bug: When inserting a node, ALL downstream nodes were shifted right,
 * including nodes to the LEFT of the insertion point (reachable via cycle).
 *
 * Workflow structure:
 *   Trigger(-220) → Start(0) → Middle(220) → End(440)
 *                      ↑___________________________|  (cycle)
 *
 * When inserting between Start and Middle:
 * - insertX ≈ 158 (midpoint between Start's right edge at 96 and Middle at 220)
 * - Start is "downstream" via cycle: Middle → End → Start
 * - But Start (x=0, rightEdge=96) is LEFT of insertX
 *
 * Fix filters downstream nodes by position:
 *   overlapsOrIsToTheRight = (rightEdge > insertX) || (position >= insertX)
 *
 * Expected behavior:
 * - Start: should NOT shift (rightEdge 96 < insertX ~158)
 * - Middle, End: should shift right (position >= insertX)
 */
test.describe('PAY-4367: Node shifting in cyclic workflows', () => {
	test('should not shift nodes to the left of insertion point in cyclic workflow', async ({
		n8n,
	}) => {
		// Workflow: Trigger → Start(x=0) → Middle(x=220) → End(x=440) → Start (cycle)
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.importWorkflow('Cyclic_workflow_for_insertion_test.json', 'Cyclic Test');

		// Record positions BEFORE insertion
		const posStartBefore = await n8n.canvas.getNodePosition('Start');
		const posMiddleBefore = await n8n.canvas.getNodePosition('Middle');
		const posEndBefore = await n8n.canvas.getNodePosition('End');

		// ACT: Insert node between Start and Middle
		await n8n.canvas.addNodeBetweenNodes('Start', 'Middle', 'HTTP Request');

		// Record positions AFTER insertion
		const posStartAfter = await n8n.canvas.getNodePosition('Start');
		const posMiddleAfter = await n8n.canvas.getNodePosition('Middle');
		const posEndAfter = await n8n.canvas.getNodePosition('End');

		// ASSERT: Start should NOT have shifted (it's to the left of insertion)
		// This was the bug - Start would shift because it's "downstream" via the cycle
		expect(posStartAfter.x).toBe(posStartBefore.x);

		// ASSERT: Middle and End should have shifted right
		expect(posMiddleAfter.x).toBeGreaterThan(posMiddleBefore.x);
		expect(posEndAfter.x).toBeGreaterThan(posEndBefore.x);

		// Verify the new node was added (Trigger + Start + Middle + End + HTTP Request = 5)
		await expect(n8n.canvas.nodeByName('HTTP Request')).toBeVisible();
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);
	});
});
