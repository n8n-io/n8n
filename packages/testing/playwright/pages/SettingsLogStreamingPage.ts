import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class SettingsLogStreamingPage extends BasePage {
	getActionBoxUnlicensed(): Locator {
		return this.page.getByTestId('action-box-unlicensed');
	}

	getActionBoxLicensed(): Locator {
		return this.page.getByTestId('action-box-licensed');
	}

	getContactUsButton(): Locator {
		return this.getActionBoxUnlicensed().locator('button');
	}

	getAddFirstDestinationButton(): Locator {
		return this.getActionBoxLicensed().locator('button');
	}

	getDestinationModal(): Locator {
		return this.page.getByTestId('destination-modal');
	}

	getSelectDestinationType(): Locator {
		return this.page.getByTestId('select-destination-type');
	}

	getSelectDestinationTypeItems(): Locator {
		return this.page.locator('.el-select-dropdown__item');
	}

	getSelectDestinationButton(): Locator {
		return this.page.getByTestId('select-destination-button');
	}

	getDestinationNameInput(): Locator {
		return this.page.getByTestId('subtitle-showing-type');
	}

	getDestinationSaveButton(): Locator {
		return this.page.getByTestId('destination-save-button').locator('button');
	}

	getDestinationDeleteButton(): Locator {
		return this.page.getByTestId('destination-delete-button');
	}

	getDestinationCards(): Locator {
		return this.page.getByTestId('destination-card');
	}

	getInlineEditPreview(): Locator {
		return this.page.getByTestId('inline-edit-preview');
	}

	getInlineEditInput(): Locator {
		return this.page.getByTestId('inline-edit-input');
	}

	getModalOverlay(): Locator {
		return this.page.locator('.el-overlay');
	}

	getDropdownMenu(): Locator {
		return this.page.locator('.el-dropdown-menu');
	}

	getDropdownMenuItem(index: number): Locator {
		return this.page.locator('.el-dropdown-menu__item').nth(index);
	}

	getConfirmationDialog(): Locator {
		return this.page.locator('.el-message-box');
	}

	getCancelButton(): Locator {
		return this.page.locator('.btn--cancel');
	}

	getConfirmButton(): Locator {
		return this.page.locator('.btn--confirm');
	}

	async clickAddFirstDestination(): Promise<void> {
		await this.getAddFirstDestinationButton().click();
	}

	async clickSelectDestinationType(): Promise<void> {
		await this.clickByTestId('select-destination-type');
	}

	async selectDestinationType(index: number): Promise<void> {
		await this.getSelectDestinationTypeItems().nth(index).click();
	}

	async clickSelectDestinationButton(): Promise<void> {
		await this.clickByTestId('select-destination-button');
	}

	async clickDestinationNameInput(): Promise<void> {
		await this.clickByTestId('subtitle-showing-type');
	}

	async writeUrlToDestinationUrlInput(url: string): Promise<void> {
		await this.page.getByTestId('parameter-input-field').fill(url);
	}

	async clickInlineEditPreview(): Promise<void> {
		// First click on the destination name input to activate it
		await this.getDestinationNameInput().click();
		const inlineEditPreview = this.getDestinationNameInput().locator(
			'span[data-test-id="inline-edit-preview"]',
		);
		// eslint-disable-next-line playwright/no-force-option
		await inlineEditPreview.click({ force: true });
	}

	async typeDestinationName(name: string): Promise<void> {
		await this.fillByTestId('inline-edit-input', name);
	}

	async saveDestination(): Promise<void> {
		await this.getDestinationSaveButton().click();
	}

	async deleteDestination(): Promise<void> {
		await this.clickByTestId('destination-delete-button');
	}

	async clickDestinationCard(index: number): Promise<void> {
		await this.getDestinationCards().nth(index).click();
	}

	async clickDestinationCardDropdown(index: number): Promise<void> {
		await this.getDestinationCards().nth(index).locator('.el-dropdown').click();
	}

	async clickDropdownMenuItem(index: number): Promise<void> {
		await this.getDropdownMenuItem(index).click();
	}

	async closeModalByClickingOverlay(): Promise<void> {
		await this.page
			.locator('.el-overlay')
			.filter({ has: this.getDestinationModal() })
			.click({ position: { x: 1, y: 1 } });
	}

	async confirmDialog(): Promise<void> {
		await this.getConfirmButton().click();
	}

	async cancelDialog(): Promise<void> {
		await this.getCancelButton().click();
	}

	/**
	 * Creates a new webhook log streaming destination with the specified name.
	 * Handles the full flow: modal opening, type selection, naming, and saving.
	 * @param destinationName - The name to give the new destination
	 */
	async createDestination(destinationName: string): Promise<void> {
		await this.clickAddFirstDestination();
		await this.getDestinationModal().waitFor({ state: 'visible' });
		await this.clickSelectDestinationType();
		await this.selectDestinationType(0); // Webhook
		await this.clickSelectDestinationButton();
		await this.clickDestinationNameInput();
		await this.clickInlineEditPreview();
		await this.typeDestinationName(destinationName);
		await this.writeUrlToDestinationUrlInput('https://www.example.com');
		await this.saveDestination();
		await this.closeModalByClickingOverlay();
	}

	/**
	 * Creates a new syslog log streaming destination.
	 * @param config - Syslog configuration
	 */
	async createSyslogDestination(config: {
		name: string;
		host: string;
		port: number;
	}): Promise<void> {
		await this.clickAddFirstDestination();
		await this.getDestinationModal().waitFor({ state: 'visible' });
		await this.clickSelectDestinationType();
		await this.selectDestinationType(2); // Syslog (0=Webhook, 1=Sentry, 2=Syslog)
		await this.clickSelectDestinationButton();

		// Set destination name
		await this.clickDestinationNameInput();
		await this.clickInlineEditPreview();
		await this.typeDestinationName(config.name);

		// Fill syslog config - host and port fields
		const hostInput = this.page.getByTestId('parameter-input-host').locator('input');
		const portInput = this.page.getByTestId('parameter-input-port').locator('input');

		await hostInput.clear();
		await hostInput.fill(config.host);
		await this.page.waitForTimeout(200);
		await portInput.clear();
		await portInput.fill(config.port.toString());

		await this.page.waitForTimeout(150);
		await this.saveDestination();
	}

	/**
	 * Gets the send test event button
	 */
	getSendTestEventButton(): Locator {
		return this.page.getByTestId('destination-test-button');
	}

	/**
	 * Sends a test event to the destination.
	 * Must be called while the destination modal is open and the destination has been saved.
	 */
	async sendTestEvent(): Promise<void> {
		await this.getSendTestEventButton().click();
	}
}
