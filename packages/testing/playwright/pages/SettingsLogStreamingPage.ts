import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { ActionToggle } from './components/ActionToggle';
import { MessageBox } from './components/messageBoxLocators';

export class SettingsLogStreamingPage extends BasePage {
	readonly actionToggle = new ActionToggle(this.page);

	async goto(): Promise<void> {
		await this.page.goto('/settings/log-streaming');
	}

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

	getAddNewDestinationButton(): Locator {
		return this.page.getByRole('button', { name: 'Add new destination' });
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

	getDropdownMenuItem(index: number): Locator {
		return this.actionToggle.getMenuItem(index);
	}

	getConfirmationDialog(): Locator {
		return new MessageBox(this.page).root;
	}

	getCancelButton(): Locator {
		return new MessageBox(this.page).cancelButton;
	}

	getConfirmButton(): Locator {
		return new MessageBox(this.page).confirmButton;
	}

	async addDestination(): Promise<void> {
		const addFirstButton = this.getAddFirstDestinationButton();
		const addNewButton = this.getAddNewDestinationButton();
		await addFirstButton.or(addNewButton).click();
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
		const responsePromise = this.page.waitForResponse(
			(res) => res.url().includes('/eventbus/destination') && res.request().method() === 'POST',
		);
		await this.getDestinationSaveButton().click();
		await responsePromise;
	}

	async deleteDestination(): Promise<void> {
		await this.clickByTestId('destination-delete-button');
	}

	async clickDestinationCard(index: number): Promise<void> {
		await this.getDestinationCards().nth(index).click();
	}

	async clickDestinationCardDropdown(index: number): Promise<void> {
		await this.actionToggle.open(this.getDestinationCards().nth(index));
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
		await this.addDestination();
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
		await this.addDestination();
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
		await this.page.waitForTimeout(300);
		await portInput.clear();
		await portInput.fill(config.port.toString());

		// Wait for debounced input update (200ms debounce in ParameterInput.vue)
		await this.page.waitForTimeout(200);
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
		const testButton = this.getSendTestEventButton();
		await testButton.waitFor({ state: 'visible' });
		await testButton.click();
	}

	// ===== Destination type-specific helpers =====

	/**
	 * Opens the add-destination modal and selects a type by its index in the
	 * type dropdown (0 = Webhook, 1 = Sentry, 2 = Syslog), then confirms the
	 * selection so the parameter form is shown.
	 */
	async openDestinationModalForType(typeIndex: number): Promise<void> {
		await this.addDestination();
		await this.getDestinationModal().waitFor({ state: 'visible' });
		await this.clickSelectDestinationType();
		await this.selectDestinationType(typeIndex);
		await this.clickSelectDestinationButton();
	}

	/** Sets the destination name via the inline-edit title field. */
	async setDestinationName(name: string): Promise<void> {
		await this.clickDestinationNameInput();
		await this.clickInlineEditPreview();
		await this.typeDestinationName(name);
	}

	getDsnInput(): Locator {
		return this.getDestinationModal().getByTestId('parameter-input-dsn').locator('input');
	}

	async fillDsn(value: string): Promise<void> {
		await this.getDsnInput().fill(value);
	}

	async getDsnValue(): Promise<string> {
		return await this.getDsnInput().inputValue();
	}

	getMethodInput(): Locator {
		return this.getDestinationModal().getByTestId('parameter-input-method').locator('input');
	}

	/** Selects an HTTP method (GET/POST/PUT) from the method options dropdown. */
	async selectMethod(method: string): Promise<void> {
		await this.getDestinationModal().getByTestId('parameter-input-method').click();
		await this.getVisiblePopoverOption(method).click();
	}

	async getMethodValue(): Promise<string> {
		return await this.getMethodInput().inputValue();
	}

	/** Toggles the "Add Headers" switch to reveal the header parameter rows. */
	async toggleSendHeaders(): Promise<void> {
		await this.getDestinationModal()
			.getByTestId('parameter-input-sendHeaders')
			.locator('.el-switch')
			.click();
	}

	/**
	 * Selects how headers are specified. The schema default isn't applied in this
	 * modal, so the option must be picked explicitly before the header inputs render.
	 */
	async selectSpecifyHeaders(optionText: string): Promise<void> {
		await this.getDestinationModal().getByTestId('parameter-input-specifyHeaders').click();
		await this.getVisiblePopoverOption(optionText).click();
	}

	/**
	 * Fills the JSON headers editor. Requires headers enabled via
	 * {@link toggleSendHeaders} and {@link selectSpecifyHeaders} set to "Using JSON".
	 */
	async fillJsonHeaders(json: string): Promise<void> {
		const editor = this.getDestinationModal()
			.getByTestId('parameter-input-jsonHeaders')
			.locator('.cm-content');
		await editor.click();
		await editor.fill(json);
		// ParameterInput.vue debounces updates by 200ms before they reach the model.
		await this.page.waitForTimeout(200);
	}

	getCardToggle(index: number): Locator {
		return this.getDestinationCards().nth(index).getByTestId('workflow-activate-switch');
	}

	async clickCardToggle(index: number): Promise<void> {
		// Toggling the switch saves the destination via POST /eventbus/destination;
		// await it so the enabled/disabled state is committed server-side before
		// the test proceeds.
		const responsePromise = this.page.waitForResponse(
			(res) => res.url().includes('/eventbus/destination') && res.request().method() === 'POST',
		);
		await this.getCardToggle(index).click();
		await responsePromise;
	}
}
