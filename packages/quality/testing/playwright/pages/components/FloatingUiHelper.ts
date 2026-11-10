import type { Locator, Page } from '@playwright/test';

type GetByRoleName = NonNullable<Parameters<Locator['getByRole']>[1]>['name'];
type GetByRoleOptionsWithoutName = Omit<Parameters<Locator['getByRole']>[1], 'name'>;

export class FloatingUiHelper {
	constructor(protected readonly page: Page) {}

	getVisiblePoppers() {
		// Match Reka UI popovers (data-side is unique to Reka UI positioned content)
		return this.page.locator('[data-state="open"][data-side]');
	}

	getVisiblePopper() {
		// Match both Element+ poppers (.el-popper:visible) and Reka UI poppers ([data-state="open"])
		return this.page.locator(
			'.el-popper:visible, [data-state="open"][role="dialog"], [data-state="open"][role="menu"], [data-state="open"][role="listbox"]',
		);
	}

	/** Tooltip content is teleported out of its trigger, so scope it to the page. */
	getTooltip() {
		return this.page.getByTestId('tooltip-content').filter({ visible: true });
	}

	getVisiblePopoverMenuItem(name?: GetByRoleName, options: GetByRoleOptionsWithoutName = {}) {
		return this.visiblePopoverRole('menuitem', name, options);
	}

	getVisiblePopoverOption(name?: GetByRoleName, options: GetByRoleOptionsWithoutName = {}) {
		return this.visiblePopoverRole('option', name, options);
	}

	/**
	 * A dialog marks a teleported Element Plus menu as hidden from assistive tech.
	 * The menu stays on screen. includeHidden keeps that menu, and the visible
	 * filter drops menus that are not shown.
	 */
	private visiblePopoverRole(
		role: 'menuitem' | 'option',
		name: GetByRoleName | undefined,
		options: GetByRoleOptionsWithoutName,
	) {
		return this.getVisiblePopper()
			.getByRole(role, { name, ...options, includeHidden: true })
			.filter({ visible: true });
	}
}
