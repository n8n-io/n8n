import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { ActionToggle } from './components/ActionToggle';

export class CommunityNodesPage extends BasePage {
	readonly actionToggle = new ActionToggle(this.page);

	async goto(): Promise<void> {
		await this.page.goto('/settings/community-nodes');
	}

	// Element getters
	getCommunityCards(): Locator {
		return this.page.getByTestId('community-package-card');
	}

	getEmptyState(): Locator {
		return this.page.getByTestId('empty-state');
	}

	getCommunityCard(packageName: string): Locator {
		return this.getCommunityCards().filter({ hasText: packageName });
	}

	getInstallModalError(text: string | RegExp): Locator {
		return this.getInstallModal().getByText(text);
	}

	getFailedToLoadIcon(packageName: string): Locator {
		return this.getCommunityCard(packageName).locator('[data-icon="triangle-alert"]');
	}

	getInstallButton(): Locator {
		// Try the empty state first, fallback to header install button
		const emptyStateButton = this.getEmptyState().locator('button');
		const headerInstallButton = this.page.getByRole('button', { name: 'Install' });

		return emptyStateButton.or(headerInstallButton);
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
		return this.actionToggle.getAction('uninstall');
	}

	getUpdateButton(packageName?: string): Locator {
		const card = packageName
			? this.getCommunityCard(packageName)
			: this.getCommunityCards().first();
		return card.getByRole('button', { name: 'Update' });
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

	async clickUpdateButton(packageName?: string): Promise<void> {
		await this.getUpdateButton(packageName).click();
	}

	async clickConfirmUpdate(): Promise<void> {
		await this.getConfirmUpdateButton().click();
	}

	async clickConfirmUninstall(): Promise<void> {
		await this.getConfirmUninstallButton().click();
	}

	// Helper methods for common workflows
	/** Fills and submits the install dialog without waiting for the result. */
	async submitInstall(packageName: string): Promise<void> {
		await this.clickInstallButton();
		await this.fillPackageName(packageName);
		await this.clickUserAgreementCheckbox();
		await this.clickInstallPackageButton();
	}

	async installPackage(packageName: string): Promise<void> {
		await this.submitInstall(packageName);

		// Wait for install modal to close
		await this.getInstallModal().waitFor({ state: 'hidden' });
	}

	async updatePackage(packageName?: string): Promise<void> {
		await this.clickUpdateButton(packageName);
		await this.clickConfirmUpdate();
	}

	async uninstallPackage(): Promise<void> {
		await this.clickActionToggle();
		await this.clickUninstallAction();
		await this.clickConfirmUninstall();
	}
}
