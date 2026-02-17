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
test.describe('PAY-4367: Node shifting in cyclic workflows', {
	annotation: [
		{ type: 'owner', description: 'Adore' },
	],
}, () => {
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

	test('should stretch sticky note when inserting node in front of it', async ({ n8n }) => {
		// Workflow with a pink sticky note ("Sticky Note14") between Edit Fields and A node
		// The sticky should stretch to encompass the new node when inserted close to it
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.importWorkflow('Bug_node_insertions_sticky.json', 'Sticky Insert Test');

		const pinkSticky = n8n.canvas.sticky.getStickies().filter({ hasText: 'Insert here' });
		await expect(pinkSticky).toBeVisible();

		const stickyBefore = await pinkSticky.boundingBox();

		// ACT: Insert node between Edit Fields and A (in front of the pink sticky)
		await n8n.canvas.addNodeBetweenNodes('Edit Fields', 'A', 'HTTP Request');

		const stickyAfter = await pinkSticky.boundingBox();

		// ASSERT: Sticky should have stretched (width increased) to encompass the new node
		await expect(n8n.canvas.nodeByName('HTTP Request')).toBeVisible();
		expect(stickyAfter?.width).toBeGreaterThan(stickyBefore?.width ?? 0);

		const newNode = await n8n.canvas.nodeByName('HTTP Request').boundingBox();

		// The new node should be horizontally between the sticky's left and right edges
		// (with some tolerance for padding/stretching)
		expect(newNode?.x).toBeGreaterThanOrEqual((stickyAfter?.x ?? 0) - 50);
		expect((newNode?.x ?? 0) + (newNode?.width ?? 0)).toBeLessThanOrEqual(
			(stickyAfter?.x ?? 0) + (stickyAfter?.width ?? 0) + 50,
		);
	});

	test('should not associate node with stickies when inserting between two separate sticky notes', async ({
		n8n,
	}) => {
		// Workflow with two sticky notes: "Sticky Note20" (pink) and "Note for A5" (yellow)
		// Inserting a node between "Get a post3" and "A5" should place it in the gap between stickies
		// The node should NOT be associated with either sticky (no stretching)
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.importWorkflow(
			'Bug_node_insertions_between_stickies.json',
			'Between Stickies Test',
		);

		const pinkSticky = n8n.canvas.sticky.getStickies().filter({ hasText: 'Insert here' });
		const yellowSticky = n8n.canvas.sticky.getStickies().filter({ hasText: 'Note for A' });

		await expect(pinkSticky).toBeVisible();
		await expect(yellowSticky).toBeVisible();

		const pinkStickyBefore = await pinkSticky.boundingBox();
		const yellowStickyBefore = await yellowSticky.boundingBox();

		// ACT: Insert node between "Get a post3" and "A5" (in the gap between the two stickies)
		await n8n.canvas.addNodeBetweenNodes('Get a post3', 'A5', 'HTTP Request');
		await expect(n8n.canvas.nodeByName('HTTP Request')).toBeVisible();

		const pinkStickyAfter = await pinkSticky.boundingBox();
		const yellowStickyAfter = await yellowSticky.boundingBox();

		//Stickies should both maintain their width (not stretch to include the new node)
		expect(pinkStickyAfter?.width).toBe(pinkStickyBefore?.width);
		expect(yellowStickyAfter?.width).toBe(yellowStickyBefore?.width);

		const newNode = await n8n.canvas.nodeByName('HTTP Request').boundingBox();

		// The new node should be between the pink and yellow stickies
		expect(newNode?.x).toBeGreaterThan((pinkStickyAfter?.x ?? 0) + (pinkStickyAfter?.width ?? 0));
		expect((newNode?.x ?? 0) + (newNode?.width ?? 0)).toBeLessThan(yellowStickyAfter?.x ?? 0);
	});
});
