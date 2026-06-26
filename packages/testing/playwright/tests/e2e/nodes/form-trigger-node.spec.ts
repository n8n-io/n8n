import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';
import { PublicFormPage } from '../../../pages/PublicFormPage';

test.describe(
	'Form Trigger',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
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
			const formUrl = await n8n.canvas.getTestFormUrl();

			// Open form URL in a new browser tab
			const formPage = await PublicFormPage.fromNewTab(n8n.page.context(), formUrl);

			// Fill first page with a random first name
			const firstName = `John${Date.now()}`;
			await formPage.fillField('What is your first name?', firstName);
			await formPage.submit();

			// Fill second page with a random last name
			const lastName = `Doe${Date.now()}`;
			await formPage.fillField('What is your last name?', lastName);
			await formPage.submit();

			// Verify the form was submitted successfully
			await formPage.expectText('Your response has been recorded');

			// Close the form page
			await formPage.close();
		});

		test.describe('form execution with basic auth', () => {
			const password = new Date().toDateString();

			test.use({
				httpCredentials: {
					username: 'test',
					password,
				},
			});

			test('form submission works with basic auth', async ({ api, n8n }) => {
				const { id, name } = await api.credentials.createCredential({
					name: 'Basic Auth test:test',
					type: 'httpBasicAuth',
					data: {
						user: 'test',
						password,
					},
				});

				const workflow: Partial<IWorkflowBase> = {
					nodes: [
						{
							parameters: {
								authentication: 'basicAuth',
								formTitle: 'Test',
								options: {
									respondWithOptions: {
										values: {
											formSubmittedText: 'This worked',
										},
									},
								},
							},
							type: 'n8n-nodes-base.formTrigger',
							typeVersion: 2.5,
							position: [0, 0],
							id: '49b31a69-3fc9-43d0-944e-990783330e7a',
							name: 'On form submission',
							webhookId: '17eae80c-039e-4779-be68-08cd5afc5f65',
							credentials: {
								httpBasicAuth: {
									id,
									name,
								},
							},
						},
					],
					connections: {},
					pinData: {},
					meta: {
						instanceId: 'acd7615bcc3af421bbd7517e305cc16505176a6a47045dbe39e25d904c940573',
					},
				};

				const { workflowId } = await api.workflows.createWorkflowFromDefinition(workflow, {
					makeUnique: true,
				});

				await n8n.start.fromExistingWorkflow(workflowId);

				// Start the workflow execution so it's waiting for form submissions
				await n8n.canvas.clickExecuteWorkflowButton();
				await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

				// Get the form test URL from the NDV
				await n8n.canvas.openNode('On form submission');
				const formUrl = await n8n.canvas.getTestFormUrl();

				// Open form URL in a new browser tab
				const formPage = await PublicFormPage.fromNewTab(n8n.page.context(), formUrl);

				// Submit the form
				await formPage.submit();
				await formPage.expectText('This worked');
			});

			test('multi-step form submission works with basic auth', async ({ api, n8n }) => {
				const { id, name } = await api.credentials.createCredential({
					name: 'Basic Auth test:test',
					type: 'httpBasicAuth',
					data: {
						user: 'test',
						password,
					},
				});

				const workflow: Partial<IWorkflowBase> = {
					nodes: [
						{
							parameters: {
								authentication: 'basicAuth',
								formTitle: 'Test',
							},
							type: 'n8n-nodes-base.formTrigger',
							typeVersion: 2.5,
							position: [0, 0],
							id: '49b31a69-3fc9-43d0-944e-990783330e7a',
							name: 'On form submission',
							webhookId: '17eae80c-039e-4779-be68-08cd5afc5f64',
							credentials: {
								httpBasicAuth: {
									id,
									name,
								},
							},
						},
						{
							parameters: {
								options: {
									formDescription: 'Step 2',
								},
							},
							type: 'n8n-nodes-base.form',
							typeVersion: 2.5,
							position: [208, 0],
							id: 'e748b959-faeb-4476-aa30-1c7a6434843a',
							name: 'Form',
							webhookId: '1e1a6d32-d3a4-4150-886b-2119cc4072bc',
						},
						{
							parameters: {
								operation: 'completion',
								completionTitle: 'Success',
								completionMessage: 'This worked',
								options: {},
							},
							type: 'n8n-nodes-base.form',
							typeVersion: 2.5,
							position: [416, 0],
							id: '2e52c834-e08a-4848-bd86-be1f7909a956',
							name: 'Form1',
							webhookId: '1839391a-f07d-4bee-858f-678c1b45252b',
						},
					],
					connections: {
						'On form submission': {
							main: [
								[
									{
										node: 'Form',
										type: 'main',
										index: 0,
									},
								],
							],
						},
						Form: {
							main: [
								[
									{
										node: 'Form1',
										type: 'main',
										index: 0,
									},
								],
							],
						},
					},
					pinData: {},
					meta: {
						templateCredsSetupCompleted: true,
						instanceId: 'acd7615bcc3af421bbd7517e305cc16505176a6a47045dbe39e25d904c940573',
					},
				};

				const { workflowId } = await api.workflows.createWorkflowFromDefinition(workflow, {
					makeUnique: true,
				});

				await n8n.start.fromExistingWorkflow(workflowId);

				// Start the workflow execution so it's waiting for form submissions
				await n8n.canvas.clickExecuteWorkflowButton();
				await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

				// Get the form test URL from the NDV
				await n8n.canvas.openNode('On form submission');
				const formUrl = await n8n.canvas.getTestFormUrl();

				// Open form URL in a new browser tab
				const formPage = await PublicFormPage.fromNewTab(n8n.page.context(), formUrl);

				// Submit first page
				await formPage.submit();
				await formPage.expectText('Step 2');

				// submit second page
				await formPage.submit();
				await formPage.expectText('This worked');
			});
		});
	},
);
