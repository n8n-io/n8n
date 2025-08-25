import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../BasePage';

export class EditFieldsNode extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async setFieldsValues(
		fields: Array<{
			name: string;
			type: 'string' | 'number' | 'boolean' | 'array' | 'object';
			value: string | number | boolean;
		}>,
		paramName = 'assignments',
	): Promise<void> {
		const container = this.page.getByTestId(`assignment-collection-${paramName}`);

		for (let i = 0; i < fields.length; i++) {
			await this.ensureFieldExists(container, i);
			const assignment = container.getByTestId('assignment').nth(i);

			await this.setFieldName(assignment, fields[i].name);
			await this.setFieldType(assignment, fields[i].type);
			await this.setFieldValue(assignment, fields[i].type, fields[i].value);
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

	private async ensureFieldExists(container: Locator, index: number): Promise<void> {
		if (index > 0) {
			await container.getByTestId('assignment-collection-drop-area').click();
			await container.getByTestId('assignment').nth(index).waitFor({ state: 'visible' });
		} else {
			const existingFields = await container.getByTestId('assignment').count();
			if (existingFields === 0) {
				await container.getByTestId('assignment-collection-drop-area').click();
				await container.getByTestId('assignment').first().waitFor({ state: 'visible' });
			}
		}
	}

	private async setFieldName(assignment: Locator, name: string): Promise<void> {
		const nameInput = assignment.getByTestId('assignment-name').getByRole('textbox');
		await nameInput.waitFor({ state: 'visible' });
		await nameInput.fill(name);
		await nameInput.blur();
	}

	private async setFieldType(assignment: Locator, type: string): Promise<void> {
		const typeSelect = assignment.getByTestId('assignment-type-select');
		await typeSelect.waitFor({ state: 'visible' });
		await typeSelect.click();

		const typeOptionText = this.getTypeOptionText(type);
		const option = this.page.getByRole('option', { name: typeOptionText });
		await option.waitFor({ state: 'visible' });
		await option.click();
	}

	private async setFieldValue(
		assignment: Locator,
		type: string,
		value: string | number | boolean,
	): Promise<void> {
		const valueContainer = assignment.getByTestId('assignment-value');
		await valueContainer.waitFor({ state: 'visible' });

		if (type === 'boolean') {
			await this.setBooleanValue(valueContainer, value as boolean);
		} else {
			await this.setTextValue(valueContainer, String(value));
		}
	}

	private getTypeOptionText(type: string): string {
		const typeMap = new Map([
			['string', 'String'],
			['number', 'Number'],
			['boolean', 'Boolean'],
			['array', 'Array'],
			['object', 'Object'],
		]);
		return typeMap.get(type) ?? 'String';
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
		const option = this.page.getByRole('option', { name: booleanValue });
		await option.waitFor({ state: 'visible' });
		await option.click();
	}
}
