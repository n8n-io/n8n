import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class CommunityNodesPage extends BasePage {
	// Element getters
	getCommunityCards(): Locator {
		return this.page.getByTestId('community-package-card');
	}

	getActionBox(): Locator {
		return this.page.getByTestId('action-box');
	}

	getInstallButton(): Locator {
		// Try action box first (empty state), fallback to header install button
		const actionBoxButton = this.getActionBox().locator('button');
		const headerInstallButton = this.page.getByRole('button', { name: 'Install' });

		return actionBoxButton.or(headerInstallButton);
	}

	getInstallModal(): Locator {
		return this.page.getByTestId('communityPackageInstall-modal');
	}

	getConfirmModal(): Locator {
		return this.page.getByTestId('communityPackageManageConfirm-modal');
	}

	getPackageNameInput(): Locator {
		return this.getInstallModal().locator('input').first();
	}

	getUserAgreementCheckbox(): Locator {
		return this.page.getByTestId('user-agreement-checkbox');
	}

	getInstallPackageButton(): Locator {
		return this.page.getByTestId('install-community-package-button');
	}

	getActionToggle(): Locator {
		return this.page.getByTestId('action-toggle');
	}

	getUninstallAction(): Locator {
		return this.page.getByTestId('action-uninstall');
	}

	getUpdateButton(): Locator {
		return this.getCommunityCards().first().locator('button');
	}

	getConfirmUpdateButton(): Locator {
		return this.getConfirmModal().getByRole('button', { name: 'Confirm update' });
	}

	getConfirmUninstallButton(): Locator {
		return this.getConfirmModal().getByRole('button', { name: 'Confirm uninstall' });
	}

	// Simple actions
	async clickInstallButton(): Promise<void> {
		await this.getInstallButton().click();
	}

	async fillPackageName(packageName: string): Promise<void> {
		await this.getPackageNameInput().fill(packageName);
	}

	async clickUserAgreementCheckbox(): Promise<void> {
		await this.getUserAgreementCheckbox().click();
	}

	async clickInstallPackageButton(): Promise<void> {
		await this.getInstallPackageButton().click();
	}

	async clickActionToggle(): Promise<void> {
		await this.getActionToggle().click();
	}

	async clickUninstallAction(): Promise<void> {
		await this.getUninstallAction().click();
	}

	async clickUpdateButton(): Promise<void> {
		await this.getUpdateButton().click();
	}

	async clickConfirmUpdate(): Promise<void> {
		await this.getConfirmUpdateButton().click();
	}

	async clickConfirmUninstall(): Promise<void> {
		await this.getConfirmUninstallButton().click();
	}

	// Helper methods for common workflows
	async installPackage(packageName: string): Promise<void> {
		await this.clickInstallButton();
		await this.fillPackageName(packageName);
		await this.clickUserAgreementCheckbox();
		await this.clickInstallPackageButton();

		// Wait for install modal to close
		await this.getInstallModal().waitFor({ state: 'hidden' });
	}

	async updatePackage(): Promise<void> {
		await this.clickUpdateButton();
		await this.clickConfirmUpdate();
	}

	async uninstallPackage(): Promise<void> {
		await this.clickActionToggle();
		await this.clickUninstallAction();
		await this.clickConfirmUninstall();
	}
}
