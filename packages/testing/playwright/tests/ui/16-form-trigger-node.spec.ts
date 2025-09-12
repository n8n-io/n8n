import { test, expect } from '../../fixtures/base';

test.describe('Form Trigger', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test("add node by clicking on 'On form submission'", async ({ n8n }) => {
		await n8n.canvas.clickNodeCreatorPlusButton();
		await n8n.canvas.nodeCreatorItemByName('On form submission').click();

		await n8n.ndv.fillParameterInput('Form Title', 'Test Form');
		await n8n.ndv.fillParameterInput('Form Description', 'Test Form Description');
		await n8n.ndv.clickBackToCanvasButton();

		await expect(n8n.canvas.nodeIssuesBadge('On form submission')).toBeHidden();
	});

	test('should fill up form fields', async ({ n8n }) => {
		await n8n.canvas.clickNodeCreatorPlusButton();
		await n8n.canvas.nodeCreatorItemByName('On form submission').click();

		await n8n.ndv.fillParameterInput('Form Title', 'Test Form');
		await n8n.ndv.fillParameterInput('Form Description', 'Test Form Description');

		// Add first field - Number type with required flag
		await n8n.ndv.addFixedCollectionItem();
		await n8n.ndv.fillParameterInputByName('fieldLabel', 'Test Field 1');
		await n8n.ndv.selectOptionInParameterDropdown('fieldType', 'Number');
		await n8n.ndv.setParameterSwitch('requiredField', true);

		// Add second field - Text type
		await n8n.ndv.addFixedCollectionItem();
		await n8n.ndv.getParameterInputField('fieldLabel').nth(1).fill('Test Field 2');

		// Add third field - Date type
		await n8n.ndv.addFixedCollectionItem();
		await n8n.ndv.getParameterInputField('fieldLabel').nth(2).fill('Test Field 3');
		await n8n.ndv.getParameterInput('fieldType').nth(2).click();
		await n8n.ndv.selectFromVisibleDropdown('Date');

		// Add fourth field - Dropdown type with options
		await n8n.ndv.addFixedCollectionItem();
		await n8n.ndv.getParameterInputField('fieldLabel').nth(3).fill('Test Field 4');
		await n8n.ndv.getParameterInput('fieldType').nth(3).click();
		await n8n.ndv.selectFromVisibleDropdown('Dropdown');

		// Configure dropdown field options
		await n8n.page.getByRole('button', { name: 'Add Field Option' }).click();
		await n8n.ndv.getParameterInputField('option').first().fill('Option 1');
		await n8n.ndv.getParameterInputField('option').nth(1).fill('Option 2');

		// Add optional submitted message
		await n8n.ndv.clickParameterOptions();
		await n8n.ndv.selectFromVisibleDropdown('Form Response');
		await n8n.ndv.fillParameterInput('Text to Show', 'Your test form was successfully submitted');

		await n8n.ndv.clickBackToCanvasButton();
		await expect(n8n.canvas.nodeByName('On form submission')).toBeVisible();
		await expect(n8n.canvas.nodeIssuesBadge('On form submission')).toBeHidden();
	});
});
