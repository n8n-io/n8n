import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../../BasePage';
import { AssignmentCollection } from '../AssignmentCollection';

export class EditFieldsNode extends BasePage {
	private readonly assignmentCollection: AssignmentCollection;

	constructor(page: Page) {
		super(page);
		this.assignmentCollection = new AssignmentCollection(page.locator(':root'));
	}

	async setFieldsValues(
		fields: Array<{
			name: string;
			type: 'string' | 'number' | 'boolean' | 'array' | 'object';
			value: string | number | boolean;
		}>,
		paramName = 'assignments',
	): Promise<void> {
		for (let i = 0; i < fields.length; i++) {
			await this.ensureFieldExists(paramName, i);

			await this.setFieldName(paramName, i, fields[i].name);
			await this.setFieldType(paramName, i, fields[i].type);
			await this.setFieldValue(paramName, i, fields[i].type, fields[i].value);
		}
	}

	async setSingleFieldValue(
		name: string,
		type: 'string' | 'number' | 'boolean' | 'array' | 'object',
		value: string | number | boolean,
		paramName = 'assignments',
	): Promise<void> {
		await this.setFieldsValues([{ name, type, value }], paramName);
	}

	private async ensureFieldExists(paramName: string, index: number): Promise<void> {
		const assignments = this.assignmentCollection.getAssignments(paramName);
		if (index > 0) {
			await this.assignmentCollection.clickDropArea(paramName);
			await assignments.nth(index).waitFor({ state: 'visible' });
		} else {
			const existingFields = await assignments.count();
			if (existingFields === 0) {
				await this.assignmentCollection.clickDropArea(paramName);
				await assignments.first().waitFor({ state: 'visible' });
			}
		}
	}

	private async setFieldName(paramName: string, index: number, name: string): Promise<void> {
		const nameInput = this.assignmentCollection.getAssignmentNameTextbox(paramName, index);
		await nameInput.waitFor({ state: 'visible' });
		await nameInput.fill(name);
		await nameInput.blur();
	}

	private async setFieldType(paramName: string, index: number, type: string): Promise<void> {
		const typeSelect = this.assignmentCollection.getAssignmentTypeSelectAt(paramName, index);
		await typeSelect.waitFor({ state: 'visible' });
		await typeSelect.getByRole('button').click();

		const option = this.page
			.getByTestId('assignment-type-select-dropdown')
			.filter({ visible: true })
			.getByTestId(`action-${type}`);
		await option.waitFor({ state: 'visible' });
		await option.click();
	}

	private async setFieldValue(
		paramName: string,
		index: number,
		type: string,
		value: string | number | boolean,
	): Promise<void> {
		const valueContainer = this.assignmentCollection.getAssignmentValueAt(paramName, index);
		await valueContainer.waitFor({ state: 'visible' });

		if (type === 'boolean') {
			await this.setBooleanValue(valueContainer, value as boolean);
		} else {
			await this.setTextValue(valueContainer, String(value));
		}
	}

	private async setTextValue(valueContainer: Locator, value: string): Promise<void> {
		const input = valueContainer
			.getByRole('textbox')
			.or(valueContainer.locator('input, textarea, [contenteditable]').first());
		await input.waitFor({ state: 'visible' });
		await input.fill(value);
	}

	private async setBooleanValue(valueContainer: Locator, value: boolean): Promise<void> {
		await valueContainer.click();
		const booleanValue = value ? 'True' : 'False';
		const option = this.getVisiblePopoverOption(booleanValue);
		await option.waitFor({ state: 'visible' });
		await option.click();
	}
}
