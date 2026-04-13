import { test, expect } from '../../fixtures/base';

/**
 * Regression test for DS-518: Sidebar collapse breaks with fixed width override on Chat Hub
 *
 * The ChatSidebar component applies an inline width style that overrides the collapsed
 * state CSS, causing the sidebar to remain at its expanded width even when collapsed.
 *
 * Related files:
 * - packages/frontend/editor-ui/src/features/ai/chatHub/components/ChatSidebar.vue (line 69)
 * - packages/frontend/editor-ui/src/app/components/MainSidebar.vue (line 343) - correct implementation
 */
test.describe('Chat Hub sidebar collapse', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.navigate.toChatHub();
	});

	test('should collapse sidebar to correct width when clicking collapse button', async ({
		page,
	}) => {
		const sidebar = page.locator('#side-menu');
		const COLLAPSED_WIDTH = 42; // $sidebar-width from SCSS
		const TOLERANCE = 5; // Allow small variance

		// Verify sidebar is initially expanded (default state)
		const initialBox = await sidebar.boundingBox();
		expect(initialBox).not.toBeNull();
		expect(initialBox!.width).toBeGreaterThan(COLLAPSED_WIDTH + TOLERANCE);

		// Click the collapse button
		const collapseButton = page.getByTestId('main-sidebar-collapse');
		await collapseButton.click();

		// Wait for collapse animation/transition
		await page.waitForTimeout(500);

		// Verify sidebar width matches collapsed state
		const collapsedBox = await sidebar.boundingBox();
		expect(collapsedBox).not.toBeNull();

		// FAILING: The sidebar should be ~65px wide when collapsed, but due to the bug
		// it remains at the expanded width (e.g., 240px) because the inline style
		// `width: ${sidebarWidth}px` overrides the CSS class `.sideMenuCollapsed`
		expect(collapsedBox!.width).toBeLessThanOrEqual(COLLAPSED_WIDTH + TOLERANCE);
		expect(collapsedBox!.width).toBeGreaterThanOrEqual(COLLAPSED_WIDTH - TOLERANCE);
	});

	test('should expand sidebar back to original width when clicking expand button', async ({
		page,
	}) => {
		const sidebar = page.locator('#side-menu');
		const COLLAPSED_WIDTH = 42;

		// Collapse sidebar first
		const collapseButton = page.getByTestId('main-sidebar-collapse');
		await collapseButton.click();
		await page.waitForTimeout(500);

		// Get the width before expanding (should be collapsed width, but due to bug it's not)
		const collapsedBox = await sidebar.boundingBox();

		// Expand sidebar
		const expandButton = page.getByTestId('main-sidebar-collapse');
		await expandButton.click();
		await page.waitForTimeout(500);

		// Verify sidebar width is greater than collapsed width
		const expandedBox = await sidebar.boundingBox();
		expect(expandedBox).not.toBeNull();
		expect(expandedBox!.width).toBeGreaterThan(COLLAPSED_WIDTH + 50);
	});

	test('should not have inline width style when collapsed', async ({ page }) => {
		const sidebar = page.locator('#side-menu');

		// Collapse sidebar
		const collapseButton = page.getByTestId('main-sidebar-collapse');
		await collapseButton.click();
		await page.waitForTimeout(500);

		// FAILING: Check that inline style does not override collapsed width
		// The sidebar should either have no inline width style, or the inline width
		// should match the collapsed width (~65px), not the expanded width
		const style = await sidebar.getAttribute('style');

		// This will fail because ChatSidebar.vue always applies `width: ${sidebarWidth}px`
		// regardless of collapse state
		if (style && style.includes('width:')) {
			const widthMatch = style.match(/width:\s*(\d+)px/);
			if (widthMatch) {
				const inlineWidth = parseInt(widthMatch[1], 10);
				// Inline width should be collapsed width (~42px), not expanded width (>200px)
				expect(inlineWidth).toBeLessThan(100);
			}
		}
	});

	test('should apply sideMenuCollapsed CSS class when collapsed', async ({ page }) => {
		const sidebar = page.locator('#side-menu');

		// Verify sidebar does not have collapsed class initially
		await expect(sidebar).not.toHaveClass(/sideMenuCollapsed/);

		// Collapse sidebar
		const collapseButton = page.getByTestId('main-sidebar-collapse');
		await collapseButton.click();
		await page.waitForTimeout(500);

		// Verify collapsed class is applied
		// NOTE: This test should pass - the class is correctly applied,
		// but it's being overridden by the inline style
		await expect(sidebar).toHaveClass(/sideMenuCollapsed/);
	});
});
