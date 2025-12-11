import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe('Node Creator Vector Stores', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addNode('Manual Trigger');
	});

	test('should show vector stores actions', async ({ n8n }) => {
		const expectedActions = [
			'Get ranked documents from vector store',
			'Add documents to vector store',
			'Retrieve documents for Chain/Tool as Vector Store',
			'Retrieve documents for AI Agent as Tool',
		];

		await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		await n8n.canvas.nodeCreator.searchFor('Vector Store');

		await expect(n8n.canvas.nodeCreator.getNodeItems().first()).toBeVisible();

		await n8n.canvas.nodeCreator.getItem('Simple Vector Store').click();

		for (const action of expectedActions) {
			await expect(n8n.canvas.nodeCreator.getItem(action)).toBeVisible();
		}

		await n8n.canvas.nodeCreator.goBackFromSubcategory();
		await expect(n8n.canvas.nodeCreator.getNodeItems().first()).toBeVisible();
	});

	test('should find vector store nodes in creator', async ({ n8n }) => {
		await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		await n8n.canvas.nodeCreator.searchFor('Vector Store');

		await expect(n8n.canvas.nodeCreator.getNodeItems().first()).toBeVisible();
	});

	test('should search for specific vector store nodes', async ({ n8n }) => {
		await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		await n8n.canvas.nodeCreator.searchFor('Simple Vector Store');

		await expect(n8n.canvas.nodeCreator.getItem('Simple Vector Store')).toBeVisible();
	});
});
