import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe('Node Creator Categories', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should have "Actions" section collapsed when opening actions view from Trigger root view', async ({
		n8n,
	}) => {
		await n8n.canvas.nodeCreator.open();
		await n8n.canvas.nodeCreator.searchFor('ActiveCampaign');
		await n8n.canvas.nodeCreator.selectItem('ActiveCampaign');

		await expect(n8n.canvas.nodeCreator.getCategoryItem('Actions')).toBeVisible();
		await expect(n8n.canvas.nodeCreator.getCategoryItem('Triggers')).toBeVisible();

		await expect(n8n.canvas.nodeCreator.getCategoryItem('Triggers').locator('..')).toHaveAttribute(
			'data-category-collapsed',
			'false',
		);

		await expect(n8n.canvas.nodeCreator.getCategoryItem('Actions').locator('..')).toHaveAttribute(
			'data-category-collapsed',
			'true',
		);

		await n8n.canvas.nodeCreator.selectCategoryItem('Actions');
		await expect(n8n.canvas.nodeCreator.getCategoryItem('Actions').locator('..')).toHaveAttribute(
			'data-category-collapsed',
			'false',
		);
	});

	test('should have "Triggers" section collapsed when opening actions view from Regular root view', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode('Manual Trigger');

		await n8n.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		await n8n.canvas.nodeCreator.searchFor('n8n');
		await n8n.canvas.nodeCreator.getNodeItems().filter({ hasText: 'n8n' }).first().click();

		await expect(n8n.canvas.nodeCreator.getCategoryItem('Actions').locator('..')).toHaveAttribute(
			'data-category-collapsed',
			'false',
		);

		await n8n.canvas.nodeCreator.selectCategoryItem('Actions');
		await expect(n8n.canvas.nodeCreator.getCategoryItem('Actions').locator('..')).toHaveAttribute(
			'data-category-collapsed',
			'true',
		);

		await expect(n8n.canvas.nodeCreator.getCategoryItem('Triggers').locator('..')).toHaveAttribute(
			'data-category-collapsed',
			'true',
		);

		await n8n.canvas.nodeCreator.selectCategoryItem('Triggers');
		await expect(n8n.canvas.nodeCreator.getCategoryItem('Triggers').locator('..')).toHaveAttribute(
			'data-category-collapsed',
			'false',
		);
	});

	test('should show callout and two suggested nodes if node has no trigger actions', async ({
		n8n,
	}) => {
		await n8n.canvas.nodeCreator.open();
		await n8n.canvas.nodeCreator.searchFor('Customer Datastore (n8n training)');
		await n8n.canvas.nodeCreator.selectItem('Customer Datastore (n8n training)');

		await expect(n8n.page.getByTestId('actions-panel-no-triggers-callout')).toBeVisible();
		await expect(n8n.canvas.nodeCreator.getItem('On a Schedule')).toBeVisible();
		await expect(n8n.canvas.nodeCreator.getItem('On a Webhook call')).toBeVisible();
	});

	test('should show intro callout if user has not made a production execution', async ({ n8n }) => {
		await n8n.canvas.nodeCreator.open();
		await n8n.canvas.nodeCreator.searchFor('Customer Datastore (n8n training)');
		await n8n.canvas.nodeCreator.selectItem('Customer Datastore (n8n training)');

		await expect(n8n.page.getByTestId('actions-panel-activation-callout')).toBeVisible();
	});

	test('should show Trigger and Actions sections during search', async ({ n8n }) => {
		await n8n.canvas.nodeCreator.open();
		await n8n.canvas.nodeCreator.searchFor('Customer Datastore (n8n training)');
		await n8n.canvas.nodeCreator.selectItem('Customer Datastore (n8n training)');

		await n8n.canvas.nodeCreator.searchFor('Non existent action name');

		await expect(n8n.canvas.nodeCreator.getCategoryItem('Triggers')).toBeVisible();
		await expect(n8n.canvas.nodeCreator.getCategoryItem('Actions')).toBeVisible();
		await expect(n8n.page.getByTestId('actions-panel-no-triggers-callout')).toBeVisible();
		await expect(n8n.canvas.nodeCreator.getItem('On a Schedule')).toBeVisible();
		await expect(n8n.canvas.nodeCreator.getItem('On a Webhook call')).toBeVisible();
	});
});
