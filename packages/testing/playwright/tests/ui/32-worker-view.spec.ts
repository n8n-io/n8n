import { test, expect } from '../../fixtures/base';

test.describe
	.serial('Worker View', () => {
		test.describe('unlicensed', () => {
			test.beforeEach(async ({ api }) => {
				await api.disableFeature('workerView');
				await api.setQueueMode(false);
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
			test.beforeEach(async ({ api }) => {
				await api.enableFeature('workerView');
				await api.setQueueMode(true);
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
