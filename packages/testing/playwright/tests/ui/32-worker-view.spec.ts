import { test, expect } from '../../fixtures/base';

test.describe
	.serial('Worker View', () => {
		test.describe('unlicensed', () => {
			test.beforeEach(async ({ n8n }) => {
				await n8n.api.disableFeature('workerView');
				await n8n.api.disableFeature('workerView');
				await n8n.api.setQueueMode(false);
			});

			test('should not show up in the menu sidebar', async ({ n8n }) => {
				await n8n.workerView.visitWorkerView();
				await expect(n8n.workerView.getWorkerMenuItem()).toBeHidden();
			});

			test('should show action box', async ({ n8n }) => {
				await n8n.workerView.visitWorkerView();
				await expect(n8n.workerView.getWorkerViewUnlicensed()).toBeVisible();
			});
		});

		test.describe('licensed', () => {
			test.beforeEach(async ({ n8n }) => {
				await n8n.api.enableFeature('workerView');
				await n8n.api.setQueueMode(true);
			});

			test('should show up in the menu sidebar', async ({ n8n }) => {
				await n8n.goHome();
				await n8n.workerView.visitWorkerView();
				await expect(n8n.workerView.getWorkerMenuItem()).toBeVisible();
			});

			test('should show worker list view', async ({ n8n }) => {
				await n8n.workerView.visitWorkerView();
				await expect(n8n.workerView.getWorkerViewLicensed()).toBeVisible();
			});
		});
	});
