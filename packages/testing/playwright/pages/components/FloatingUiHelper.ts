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

	getVisiblePopoverMenuItem(name?: GetByRoleName, options: GetByRoleOptionsWithoutName = {}) {
		return this.getVisiblePopper()
			.getByRole('menuitem', { name, ...options })
			.filter({ visible: true });
	}

	getVisiblePopoverOption(name?: GetByRoleName, options: GetByRoleOptionsWithoutName = {}) {
		return this.getVisiblePopper()
			.getByRole('option', { name, ...options })
			.filter({ visible: true });
	}
}
