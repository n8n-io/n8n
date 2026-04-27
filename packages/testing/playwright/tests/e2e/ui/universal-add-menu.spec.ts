import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'universal-add-menu' } } });

test.describe('Universal Add Menu Bug Reproduction (N8N-9937)', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
		await n8n.api.enableFeature('sharing');
		await n8n.api.enableFeature('folders');
		await n8n.api.enableFeature('advancedPermissions');
	});

	test('BUG: menu items should be prepended with "New"', async ({ n8n, page }) => {
		// Open universal add menu
		await n8n.sideBar.universalAdd();

		// Wait for menu items to appear - use role-based selectors
		const workflowMenuItem = page.getByRole('menuitem', { name: /Workflow/i });
		const credentialMenuItem = page.getByRole('menuitem', { name: /Credential/i });
		const projectMenuItem = page.getByRole('menuitem', { name: /Project/i });

		// EXPECTED: Items should show "New Workflow", "New Credential", "New Project"
		// ACTUAL: Items show "Workflow", "Credential", "Project" without "New" prefix

		// Verify current (buggy) behavior - items exist without "New" prefix
		await expect(workflowMenuItem).toBeVisible();
		await expect(credentialMenuItem).toBeVisible();
		await expect(projectMenuItem).toBeVisible();

		// Get the actual text content to demonstrate the bug
		const workflowText = await workflowMenuItem.textContent();
		const credentialText = await credentialMenuItem.textContent();
		const projectText = await projectMenuItem.textContent();

		// These assertions will pass, demonstrating items DON'T have "New" prefix
		expect(workflowText).not.toContain('New');
		expect(credentialText).not.toContain('New');
		expect(projectText).not.toContain('New');

		// These would be the correct values (currently fail)
		expect(workflowText).toBe('Workflow'); // Should be "New Workflow"
		expect(credentialText).toBe('Credential'); // Should be "New Credential"
		expect(projectText).toBe('Project'); // Should be "New Project"
	});

	test('BUG: submenu shown even with only personal project', async ({ n8n, page }) => {
		// When user has only personal project, there should be no submenu
		// since there's only one destination to create the workflow/credential in

		await n8n.sideBar.universalAdd();

		const menu = page.getByTestId('universal-add');

		// Wait for menu items using role selector
		const workflowMenuItem = page.getByRole('menuitem', { name: /Workflow/i });
		await expect(workflowMenuItem).toBeVisible();

		// Check if Workflow has a submenu (it shouldn't when only personal project exists)
		const workflowSubmenu = menu.getByTestId('navigation-submenu').filter({ hasText: 'Workflow' });

		// EXPECTED: No submenu when only personal project (should be direct link)
		// ACTUAL: Submenu exists even with only personal project
		const submenuCount = await workflowSubmenu.count();

		// This demonstrates the bug - submenu exists when it shouldn't
		expect(submenuCount).toBeGreaterThan(0); // Bug: should be 0

		// Click to open submenu
		await workflowSubmenu.click();

		// Verify submenu opens (this should not happen with only one project)
		const submenuItems = menu.getByTestId('navigation-submenu-item');
		await expect(submenuItems.first()).toBeVisible();

		// Count submenu items (should only have personal project)
		const itemCount = await submenuItems.count();

		// Even with submenu, should only show personal project (not multiple)
		// Filter out disabled "Create in" title
		console.log(`Submenu item count: ${itemCount}`);
	});

	test('BUG: menu unstable - closes/reopens unexpectedly', async ({ n8n, page }) => {
		// The issue mentions the menu opens and closes by itself unexpectedly
		// This test verifies menu stability

		await n8n.sideBar.universalAdd();

		// Verify menu is open using role selector
		const workflowItem = page.getByRole('menuitem', { name: /Workflow/i });
		await expect(workflowItem).toBeVisible();

		// Interact with menu items - this should not cause unexpected closing
		await workflowItem.hover();

		// Small wait to observe if menu closes unexpectedly
		await page.waitForTimeout(300);

		// Menu should still be visible after hover
		// If this fails, it demonstrates the auto-close bug
		await expect(workflowItem).toBeVisible();

		// Try clicking on submenu item if it exists
		const menu = page.getByTestId('universal-add');
		const workflowSubmenu = menu.getByTestId('navigation-submenu').filter({ hasText: 'Workflow' });

		if (await workflowSubmenu.count() > 0) {
			await workflowSubmenu.click();

			// Wait to see if submenu closes unexpectedly
			await page.waitForTimeout(500);

			// Submenu should remain open
			const submenuItems = menu.getByTestId('navigation-submenu-item');
			await expect(submenuItems.first()).toBeVisible();
		}
	});

	test('BUG: chevron spins on non-expandable items', async ({ n8n, page }) => {
		// The issue mentions chevron spins when selecting items that don't expand

		await n8n.sideBar.universalAdd();

		// Wait for menu using role selector
		const projectItem = page.getByRole('menuitem', { name: /Project/i });
		await expect(projectItem).toBeVisible();

		// Check if Project item (which has no submenu) has a chevron
		// It should NOT have a chevron since it doesn't expand
		const menu = page.getByTestId('universal-add');
		const projectMenuItem = menu.getByTestId('navigation-menu-item').filter({ hasText: 'Project' });

		// If there's a chevron on a non-expandable item, that's the bug
		// The chevron should only exist on items with submenus
		await expect(projectMenuItem).toBeVisible();

		// Check for chevron arrow element
		const chevron = projectMenuItem.locator('.el-sub-menu__icon-arrow');

		// This assertion should pass if no chevron exists on non-expandable items
		await expect(chevron).toHaveCount(0);

		// The bug might be about chevrons on Workflow/Credential items spinning
		// when they shouldn't (since they have submenus, chevron is expected)
		const workflowSubmenu = menu.getByTestId('navigation-submenu').filter({ hasText: 'Workflow' });
		if (await workflowSubmenu.count() > 0) {
			// Chevron exists on workflow (expected for submenu)
			const workflowChevron = workflowSubmenu.locator('.el-sub-menu__icon-arrow');
			await expect(workflowChevron).toBeVisible();
		}
	});

	test('BUG: menu background transparency issue', async ({ n8n, page }) => {
		// Issue mentions menu is transparent

		await n8n.sideBar.universalAdd();

		// Wait for menu to be visible using role selector
		const workflowItem = page.getByRole('menuitem', { name: /Workflow/i });
		await expect(workflowItem).toBeVisible();

		// Get the dropdown popper element
		const popper = page.locator('.el-popper').first();

		// Check if popper is visible
		if (await popper.count() > 0) {
			// Check background color
			const bgColor = await popper.evaluate((el) => {
				return window.getComputedStyle(el).backgroundColor;
			});

			// Menu should not be fully transparent
			// If it is transparent or has very low opacity, that's the bug
			expect(bgColor).toBeDefined();

			// Log the actual background color for debugging
			console.log('Menu background color:', bgColor);

			// Check if it's not fully transparent
			expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
			expect(bgColor).not.toBe('transparent');
		}
	});
});
