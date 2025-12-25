import { test, expect } from '../../../fixtures/base';

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

		await expect(n8n.canvas.nodeByName('On form submission')).toBeVisible();
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
		await n8n.ndv.addFixedCollectionProperty('Custom Field Name', 0);
		await n8n.ndv.fillParameterInputByName('fieldName', 'testField1');
		await n8n.ndv.addFixedCollectionProperty('Required Field', 0);
		await n8n.ndv.setParameterSwitch('requiredField', true);

		// Add second field - Text type
		await n8n.ndv.addFixedCollectionItem();
		await n8n.ndv.fillParameterInputByName('fieldLabel', 'Test Field 2', 1);
		await n8n.ndv.addFixedCollectionProperty('Custom Field Name', 1);
		await n8n.ndv.fillParameterInputByName('fieldName', 'testField2', 1);

		// Add third field - Date type
		await n8n.ndv.addFixedCollectionItem();
		await n8n.ndv.fillParameterInputByName('fieldLabel', 'Test Field 3', 2);
		await n8n.ndv.selectOptionInParameterDropdown('fieldType', 'Date', 2);
		await n8n.ndv.addFixedCollectionProperty('Custom Field Name', 2);
		await n8n.ndv.fillParameterInputByName('fieldName', 'testField3', 2);

		// Add fourth field - Dropdown type with options
		await n8n.ndv.addFixedCollectionItem();
		await n8n.ndv.fillParameterInputByName('fieldLabel', 'Test Field 4', 3);
		await n8n.ndv.selectOptionInParameterDropdown('fieldType', 'Dropdown', 3);
		await n8n.ndv.addFixedCollectionProperty('Custom Field Name', 3);
		await n8n.ndv.fillParameterInputByName('fieldName', 'testField4', 3);

		// Configure dropdown field options
		await n8n.page.getByRole('button', { name: 'Add Field Option' }).click();
		await n8n.ndv.fillParameterInputByName('option', 'Option 1');
		await n8n.ndv.fillParameterInputByName('option', 'Option 2', 1);

		// Add optional submitted message
		await n8n.ndv.addParameterOptionByName('Form Response');
		await n8n.ndv.fillParameterInput('Text to Show', 'Your test form was successfully submitted');

		await n8n.ndv.clickBackToCanvasButton();
		await expect(n8n.canvas.nodeByName('On form submission')).toBeVisible();
		await expect(n8n.canvas.nodeIssuesBadge('On form submission')).toBeHidden();
	});

	test('should create and submit a multi-page form', async ({ n8n }) => {
		// Add Form Trigger node with first name field
		await n8n.canvas.clickNodeCreatorPlusButton();
		await n8n.canvas.nodeCreatorItemByName('On form submission').click();

		await n8n.ndv.fillParameterInput('Form Title', 'Multi-Page Form');
		await n8n.ndv.fillParameterInput('Form Description', 'A form with multiple pages');

		// Add a single field to the Form Trigger node
		await n8n.ndv.addFixedCollectionItem();
		await n8n.ndv.fillParameterInputByName('fieldLabel', 'What is your first name?');

		await n8n.ndv.clickBackToCanvasButton();

		// Add Form node (next page) by selecting the "Next Form Page" action
		await n8n.canvas.addNode('n8n Form', { closeNDV: false, action: 'Next Form Page' });

		// Add a single field to the Form node
		await n8n.ndv.addFixedCollectionItem();
		await n8n.ndv.fillParameterInputByName('fieldLabel', 'What is your last name?');

		await n8n.ndv.clickBackToCanvasButton();

		// Start the workflow execution so it's waiting for form submissions
		// This allows the multi-page form flow to work (continuing to Form node after trigger)
		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

		// Get the form test URL from the NDV
		await n8n.canvas.openNode('On form submission');
		const formUrlLocator = n8n.page.locator('text=/form-test\\/[a-f0-9-]+/');
		const formUrl = await formUrlLocator.textContent();

		// Open form URL in a new browser tab
		const formPage = await n8n.page.context().newPage();
		await formPage.goto(formUrl!);

		// Fill first page with a random first name
		const firstName = `John${Date.now()}`;
		await formPage.getByLabel('What is your first name?').fill(firstName);
		await formPage.getByRole('button', { name: 'Submit' }).click();

		// Fill second page with a random last name
		const lastName = `Doe${Date.now()}`;
		await formPage.getByLabel('What is your last name?').fill(lastName);
		await formPage.getByRole('button', { name: 'Submit' }).click();

		// Verify the form was submitted successfully
		await expect(formPage.getByText('Your response has been recorded')).toBeVisible();

		// Close the form page
		await formPage.close();
	});
});
