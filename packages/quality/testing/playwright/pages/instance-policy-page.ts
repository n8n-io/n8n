import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

type TypeKind = 'node' | 'credential';
type AccessLabel = 'Allowed' | 'Restricted';

export class InstancePolicyPage extends BasePage {
	async goto(tab: TypeKind) {
		await this.page.goto(`/settings/security/node-and-credential-policies/instance?tab=${tab}`);
	}

	/** The table lists every type, so a row past the first page needs a search. */
	async search(text: string) {
		await this.fillByTestId('instance-policy-search', text);
	}

	getAccessFilter(): Locator {
		return this.page.getByRole('combobox', { name: 'Filter by access' });
	}

	/** `name` is the start of the option label, which ends with a count, as in `Restricted (1)`. */
	async filterByAccess(name: AccessLabel) {
		await this.getAccessFilter().click();
		await this.page.getByRole('option', { name: new RegExp(`^${name} \\(`) }).click();
	}

	/** The name button of a row, which opens the access dialog of the type. */
	getRowButton(typeName: string): Locator {
		return this.page.getByTestId(`instance-policy-open-${typeName}`);
	}

	/** Sets the access of a type from the Access menu of its row, found by its display name. */
	async setRowAccess(displayName: string, access: AccessLabel) {
		await this.page.getByRole('button', { name: `Access of ${displayName}` }).click();
		await this.page
			.getByRole('menuitemcheckbox', { name: access, exact: true })
			.or(this.page.getByRole('menuitem', { name: access, exact: true }))
			.click();
	}

	/** Opens the access dialog of a type from the keyboard, so the dialog has a trigger to return to. */
	async openDialogFromRow(typeName: string) {
		await this.getRowButton(typeName).focus();
		await this.page.keyboard.press('Enter');
	}

	getDialog(kind: TypeKind): Locator {
		return this.page.getByTestId(`${kind}-type-access-dialog`);
	}

	/** Sets the access of the type that the dialog is about. */
	async setDialogAccess(kind: TypeKind, access: AccessLabel) {
		await this.getDialog(kind)
			.getByTestId(`${kind}-type-access-${kind}`)
			.getByTestId('type-access-select')
			.click();
		await this.page.getByRole('option', { name: access, exact: true }).click();
	}

	/** Holds the saves of the instance policy until `release` runs, so the dialog can close first. */
	async holdPolicySaves(kind: TypeKind): Promise<() => void> {
		let release = () => {};
		const released = new Promise<void>((resolve) => (release = resolve));
		await this.page.route(`**/rest/${kind}-type-policies/instance`, async (route) => {
			if (route.request().method() === 'PUT') await released;
			await route.fallback();
		});
		return release;
	}

	getDoneButton(kind: TypeKind): Locator {
		return this.page.getByTestId(`${kind}-type-access-done`);
	}
}
