import { test, expect } from '../../fixtures/base';

const DESTINATION_NAMES = {
	FIRST: 'Destination 0',
	SECOND: 'Destination 1',
} as const;

const MODAL_MAX_WIDTH = 500;

test.describe('Log Streaming Settings', () => {
	test.describe.configure({ mode: 'serial' });
	test.describe('unlicensed', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.api.disableFeature('logStreaming');
		});

		test('should show the unlicensed view when the feature is disabled', async ({ n8n }) => {
			await n8n.navigate.toLogStreaming();
			await expect(n8n.settingsLogStreaming.getActionBoxUnlicensed()).toBeVisible();
			await expect(n8n.settingsLogStreaming.getContactUsButton()).toBeVisible();
			await expect(n8n.settingsLogStreaming.getActionBoxLicensed()).not.toBeAttached();
		});
	});

	test.describe('licensed', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.api.enableFeature('logStreaming');
			await n8n.navigate.toLogStreaming();
		});

		test('should show the licensed view when the feature is enabled', async ({ n8n }) => {
			await expect(n8n.settingsLogStreaming.getActionBoxLicensed()).toBeVisible();
			await expect(n8n.settingsLogStreaming.getAddFirstDestinationButton()).toBeVisible();
			await expect(n8n.settingsLogStreaming.getActionBoxUnlicensed()).not.toBeAttached();
		});

		test('should show the add destination modal', async ({ n8n }) => {
			await n8n.settingsLogStreaming.clickAddFirstDestination();
			await expect(n8n.settingsLogStreaming.getDestinationModal()).toBeVisible();
			await expect(n8n.settingsLogStreaming.getSelectDestinationType()).toBeVisible();
			await expect(n8n.settingsLogStreaming.getSelectDestinationButton()).toBeVisible();
			await expect(n8n.settingsLogStreaming.getSelectDestinationButton()).toBeDisabled();

			const modal = n8n.settingsLogStreaming.getDestinationModal();
			const width = await modal.evaluate((element) => {
				return parseInt(window.getComputedStyle(element).width.replace('px', ''));
			});
			expect(width).toBeLessThan(MODAL_MAX_WIDTH);

			await n8n.settingsLogStreaming.clickSelectDestinationType();
			await n8n.settingsLogStreaming.selectDestinationType(0);
			await expect(n8n.settingsLogStreaming.getSelectDestinationButton()).toBeEnabled();
			await n8n.settingsLogStreaming.closeModalByClickingOverlay();
			await expect(n8n.settingsLogStreaming.getDestinationModal()).not.toBeAttached();
		});

		test('should create a destination and delete it', async ({ n8n }) => {
			await n8n.settingsLogStreaming.createDestination(DESTINATION_NAMES.FIRST);
			await n8n.page.reload();
			await n8n.settingsLogStreaming.clickDestinationCard(0);
			await expect(n8n.settingsLogStreaming.getDestinationDeleteButton()).toBeVisible();
			await n8n.settingsLogStreaming.deleteDestination();
			await expect(n8n.settingsLogStreaming.getConfirmationDialog()).toBeVisible();
			await n8n.settingsLogStreaming.cancelDialog();
			await n8n.settingsLogStreaming.deleteDestination();
			await expect(n8n.settingsLogStreaming.getConfirmationDialog()).toBeVisible();
			await n8n.settingsLogStreaming.confirmDialog();
		});

		test('should create a destination and delete it via card actions', async ({ n8n }) => {
			await n8n.settingsLogStreaming.createDestination(DESTINATION_NAMES.SECOND);
			await n8n.page.reload();

			await n8n.settingsLogStreaming.clickDestinationCardDropdown(0);
			await n8n.settingsLogStreaming.clickDropdownMenuItem(0);
			await expect(n8n.settingsLogStreaming.getDestinationSaveButton()).not.toBeAttached();
			await n8n.settingsLogStreaming.closeModalByClickingOverlay();

			await n8n.settingsLogStreaming.clickDestinationCardDropdown(0);
			await n8n.settingsLogStreaming.clickDropdownMenuItem(1);
			await expect(n8n.settingsLogStreaming.getConfirmationDialog()).toBeVisible();
			await n8n.settingsLogStreaming.confirmDialog();
		});
	});
});
