import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for N8N-9858: IF node branches are visually flipped
 *
 * Expected: The "yes" (output 0) branch should be positioned at the top,
 *           and the "no" (output 1) branch at the bottom.
 * Actual: The branches are flipped, causing connectors to cross over.
 */
test.describe(
	'N8N-9858 - IF node branch positioning',
	{
		annotation: [{ type: 'owner', description: 'Canvas' }],
	},
	() => {
		test('should position IF node yes branch above no branch', async ({ n8n, api }) => {
			const workflowName = `IF Branch Test ${nanoid()}`;

			// Workflow with IF node and two output branches
			const workflowJson = {
				name: workflowName,
				nodes: [
					{
						parameters: {
							httpMethod: 'POST',
							path: 'webhook-trigger',
							options: {},
						},
						id: '75907417-7cc8-480f-83a8-aebe48af1d40',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [-512, -48] as [number, number],
						webhookId: 'test-webhook',
					},
					{
						parameters: {
							conditions: {
								options: {
									caseSensitive: false,
									leftValue: '',
									typeValidation: 'strict',
									version: 1,
								},
								conditions: [
									{
										id: 'condition-subject',
										leftValue: '={{ $json.subject }}',
										rightValue: 'test',
										operator: {
											type: 'string',
											operation: 'contains',
										},
									},
								],
								combinator: 'and',
							},
							options: {
								ignoreCase: true,
							},
						},
						id: '8fa6bbce-5023-4233-a769-e8d1a384e632',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
						position: [-64, -48] as [number, number],
					},
					{
						parameters: {},
						id: '4125edc9-ebc7-4cfe-be0a-9c341984c416',
						name: 'Yes Branch',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [160, -144] as [number, number], // Positioned above (lower y)
					},
					{
						parameters: {},
						id: 'bc958df1-a247-4ab0-a517-168b07185e83',
						name: 'No Branch',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [160, 48] as [number, number], // Positioned below (higher y)
					},
				],
				connections: {
					Webhook: {
						main: [
							[
								{
									node: 'IF',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF: {
						main: [
							[
								// Output 0 (yes/true) should connect to top node
								{
									node: 'Yes Branch',
									type: 'main',
									index: 0,
								},
							],
							[
								// Output 1 (no/false) should connect to bottom node
								{
									node: 'No Branch',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			};

			// Create the workflow via API
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const workflow = await api.workflows.createWorkflow(workflowJson as any);

			// Navigate to the workflow
			await n8n.page.goto(`workflow/${workflow.id}`);
			await n8n.canvas.canvasPane().waitFor({ state: 'visible' });

			// Wait for the canvas to stabilize
			await n8n.canvas.clickZoomToFitButton();
			await n8n.page.waitForTimeout(500);

			// Get positions of the output nodes
			const yesBranchPosition = await n8n.canvas.getNodePosition('Yes Branch');
			const noBranchPosition = await n8n.canvas.getNodePosition('No Branch');

			// Get positions of the output handles on the IF node
			const yesOutputHandle = n8n.canvas.getNodeOutputHandle('IF', 0);
			const noOutputHandle = n8n.canvas.getNodeOutputHandle('IF', 1);

			const yesHandleBox = await yesOutputHandle.boundingBox();
			const noHandleBox = await noOutputHandle.boundingBox();

			expect(yesHandleBox).toBeTruthy();
			expect(noHandleBox).toBeTruthy();

			// The yes (output 0) handle should be positioned above the no (output 1) handle
			// This is the core issue: the handles are flipped
			expect(
				yesHandleBox!.y,
				`IF node output 0 (yes) should be above output 1 (no). Yes handle at y=${yesHandleBox!.y}, No handle at y=${noHandleBox!.y}`,
			).toBeLessThan(noHandleBox!.y);

			// Verify the connections exist
			await expect(n8n.canvas.connectionBetweenNodes('IF', 'Yes Branch')).toBeAttached();
			await expect(n8n.canvas.connectionBetweenNodes('IF', 'No Branch')).toBeAttached();

			// Additional verification: The yes branch target should be above the no branch target
			expect(
				yesBranchPosition.y,
				`Yes Branch node should be above No Branch node. Yes at y=${yesBranchPosition.y}, No at y=${noBranchPosition.y}`,
			).toBeLessThan(noBranchPosition.y);
		});

		test('should not have crossing connectors on IF node', async ({ n8n, api }) => {
			const workflowName = `IF Crossing Test ${nanoid()}`;

			// Workflow that would show crossing connectors if branches are flipped
			const workflowJson = {
				name: workflowName,
				nodes: [
					{
						parameters: {},
						id: '1',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
					},
					{
						parameters: {
							conditions: {
								options: {
									caseSensitive: false,
									typeValidation: 'strict',
									version: 1,
								},
								conditions: [
									{
										id: '1',
										leftValue: 'true',
										rightValue: 'true',
										operator: {
											type: 'string',
											operation: 'equals',
										},
									},
								],
								combinator: 'and',
							},
						},
						id: '2',
						name: 'Check Condition',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
						position: [300, 0] as [number, number],
					},
					{
						parameters: {},
						id: '3',
						name: 'True Path',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [600, -100] as [number, number],
					},
					{
						parameters: {},
						id: '4',
						name: 'False Path',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [600, 100] as [number, number],
					},
				],
				connections: {
					Manual: {
						main: [[{ node: 'Check Condition', type: 'main', index: 0 }]],
					},
					'Check Condition': {
						main: [
							[{ node: 'True Path', type: 'main', index: 0 }], // Output 0 to top
							[{ node: 'False Path', type: 'main', index: 0 }], // Output 1 to bottom
						],
					},
				},
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const workflow = await api.workflows.createWorkflow(workflowJson as any);
			await n8n.page.goto(`workflow/${workflow.id}`);
			await n8n.canvas.canvasPane().waitFor({ state: 'visible' });
			await n8n.canvas.clickZoomToFitButton();
			await n8n.page.waitForTimeout(500);

			// Get handle positions
			const output0 = n8n.canvas.getNodeOutputHandle('Check Condition', 0);
			const output1 = n8n.canvas.getNodeOutputHandle('Check Condition', 1);

			const handle0Box = await output0.boundingBox();
			const handle1Box = await output1.boundingBox();

			// Get target node positions
			const truePathPos = await n8n.canvas.getNodePosition('True Path');
			const falsePathPos = await n8n.canvas.getNodePosition('False Path');

			// The visual expectation is:
			// - Output 0 (true/yes) connects to the top node (True Path at y=-100)
			// - Output 1 (false/no) connects to the bottom node (False Path at y=100)
			//
			// If output 0's handle is BELOW output 1's handle, the connectors will cross
			// This is the bug: they should not cross

			expect(handle0Box).toBeTruthy();
			expect(handle1Box).toBeTruthy();

			// Output 0 should be above output 1 to avoid crossing
			expect(
				handle0Box!.y,
				'Output 0 (true) handle should be above output 1 (false) handle to prevent crossing connectors',
			).toBeLessThan(handle1Box!.y);

			// Verify nodes are positioned correctly for non-crossing expectation
			expect(truePathPos.y).toBeLessThan(falsePathPos.y);
		});
	},
);
