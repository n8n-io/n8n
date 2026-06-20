import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../../BasePage';
import { AssignmentCollection } from '../AssignmentCollection';

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export class EditFieldsNode extends BasePage {
	private readonly assignments: AssignmentCollection;

	constructor(page: Page) {
		super(page);
		this.assignments = new AssignmentCollection(page.getByTestId('ndv'));
	}

	async setFieldsValues(
		fields: Array<{
			name: string;
			type: FieldType;
			value: string | number | boolean;
		}>,
		paramName = 'assignments',
	): Promise<void> {
		for (let i = 0; i < fields.length; i++) {
			await this.assignments.ensureRow(paramName, i);
			await this.setFieldName(paramName, i, fields[i].name);
			await this.assignments.selectFieldType(paramName, i, fields[i].type);
			await this.setFieldValue(paramName, i, fields[i].type, fields[i].value);
		}
	}

	async setSingleFieldValue(
		name: string,
		type: FieldType,
		value: string | number | boolean,
		paramName = 'assignments',
	): Promise<void> {
		await this.setFieldsValues([{ name, type, value }], paramName);
	}

	private async setFieldName(paramName: string, index: number, name: string): Promise<void> {
		const nameInput = this.assignments.getNameTextbox(paramName, index);
		await nameInput.waitFor({ state: 'visible' });
		await nameInput.fill(name);
		await nameInput.blur();
	}

	private async setFieldValue(
		paramName: string,
		index: number,
		type: FieldType,
		value: string | number | boolean,
	): Promise<void> {
		const valueContainer = this.assignments.getValueAt(paramName, index);
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
