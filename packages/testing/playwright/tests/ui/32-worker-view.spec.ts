import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

test.describe('Worker View (unlicensed)', () => {
	const unlicensedRequirements: TestRequirements = {
		config: {
			features: {
				workerView: false,
			},
		},
	};

	test.beforeEach(async ({ setupRequirements }) => {
		await setupRequirements(unlicensedRequirements);
	});

	test('should not show up in the menu sidebar', async ({ n8n }) => {
		await n8n.workerView.visitWorkerView();
		await n8n.page.pause();
		await expect(n8n.workerView.getWorkerMenuItem()).toBeHidden();
	});

	test('should show action box', async ({ n8n }) => {
		await n8n.workerView.visitWorkerView();
		await expect(n8n.workerView.getWorkerViewUnlicensed()).toBeVisible();
	});
});

test.describe('Worker View (licensed)', () => {
	const licensedRequirements: TestRequirements = {
		config: {
			features: {
				workerView: true,
			},
		},
	};

	test.beforeEach(async ({ setupRequirements }) => {
		// await setupRequirements(licensedRequirements);
	});

	test('should show up in the menu sidebar', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workerView.visitWorkerView();
		await expect(n8n.workerView.getWorkerMenuItem()).toBeVisible({ timeout: 20000 });
	});

	test('should show worker list view', async ({ n8n }) => {
		await n8n.workerView.visitWorkerView();
		await expect(n8n.workerView.getWorkerViewLicensed()).toBeVisible();
	});
});
