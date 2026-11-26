import type { Locator, Page } from '@playwright/test';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

async function focusWithKeyboard(page: Page, target: Locator) {
	for (let step = 0; step < 10; step++) {
		if (await target.evaluate((element) => element === document.activeElement)) break;
		await page.keyboard.press('Tab');
	}
	await expect(target).toBeFocused();
}

/**
 * Asserts that the focus outline, including its width and offset, fits horizontally
 * inside the scroll viewport of the filter popover.
 */
async function expectFocusOutlineInsideViewport(outlined: Locator, viewport: Locator) {
	await expect(outlined).toHaveCSS('outline-style', 'solid');
	const extent = await outlined.evaluate((element) => {
		const style = getComputedStyle(element);
		return parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
	});
	expect(extent).toBeGreaterThan(0);

	// Poll because the popover can still be in its open animation.
	await expect
		.poll(async () => {
			const control = await outlined.boundingBox();
			const view = await viewport.boundingBox();
			if (!control || !view) return 'Control or viewport has no bounds';

			const outlineLeft = control.x - extent;
			const outlineRight = control.x + control.width + extent;
			return {
				left: Math.max(0, Math.round(view.x - outlineLeft)),
				right: Math.max(0, Math.round(outlineRight - (view.x + view.width))),
			};
		})
		.toEqual({ left: 0, right: 0 });
}

test.describe(
	'KNO-271: Filter popover focus outline',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test('keeps the focus outline of the Credentials type filter inside the popover', async ({
			n8n,
			api,
		}) => {
			const personalProject = await api.projects.getMyPersonalProject();
			await api.credentials.createCredentialFromDefinition({
				name: `Header Auth ${nanoid(6)}`,
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: 'Bearer test-token' },
			});

			await n8n.navigate.toCredentials(personalProject.id);
			await n8n.credentials.getFiltersTrigger().click();
			await expect(n8n.credentials.getFiltersDropdown()).toBeVisible();
			await focusWithKeyboard(n8n.page, n8n.credentials.getTypeFilterCombobox());

			await expectFocusOutlineInsideViewport(
				n8n.credentials.getTypeFilterInput(),
				n8n.credentials.getScrollAreaViewport(n8n.credentials.getFiltersDropdown()),
			);
		});

		test('keeps the focus outline of the Executions status filter inside the popover', async ({
			n8n,
			api,
		}) => {
			const personalProject = await api.projects.getMyPersonalProject();
			// The executions list shows its filter only when the project has a workflow.
			await api.workflows.createWorkflow({
				name: `Executions filter ${nanoid(6)}`,
				nodes: [],
				connections: {},
			});

			await n8n.navigate.toProjectExecutions(personalProject.id);
			await n8n.executions.openFilter();
			await expect(n8n.executions.getFilterForm()).toBeVisible();
			await focusWithKeyboard(n8n.page, n8n.executions.getStatusSelectCombobox());

			await expectFocusOutlineInsideViewport(
				n8n.executions.getStatusSelectCombobox(),
				n8n.executions.getScrollAreaViewport(n8n.executions.getFilterForm()),
			);
		});
	},
);
