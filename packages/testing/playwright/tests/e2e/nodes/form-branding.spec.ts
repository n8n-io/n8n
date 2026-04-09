import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Form Branding Bug - GHC-7593',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('branding link should have properly quoted href attribute in form trigger', async ({
			api,
			n8n,
		}) => {
			// Create a simple form trigger workflow with branding enabled
			const workflow: Partial<IWorkflowBase> = {
				nodes: [
					{
						parameters: {
							formTitle: 'Test Form with Branding',
							formDescription: 'Testing branding link',
							formFields: {
								values: [
									{
										fieldLabel: 'Name',
										fieldType: 'text',
										requiredField: false,
									},
								],
							},
							options: {
								// Explicitly enable branding (though it's default true)
								appendAttribution: true,
								respondWithOptions: {
									values: {
										respondWith: 'text',
										formSubmittedText: 'Thank you for your submission!',
									},
								},
							},
						},
						type: 'n8n-nodes-base.formTrigger',
						typeVersion: 2.5,
						position: [0, 0],
						id: nanoid(),
						name: 'On form submission',
						webhookId: nanoid(),
					},
				],
				connections: {},
				meta: {
					instanceId: nanoid(),
				},
			};

			const { workflowId } = await api.workflows.createWorkflowFromDefinition(workflow, {
				makeUnique: true,
			});

			await n8n.page.goto(`/workflow/${workflowId}`);

			// Start the workflow execution
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

			// Get the form test URL
			await n8n.canvas.openNode('On form submission');
			const formUrlLocator = n8n.page.locator('text=/form-test\\/[a-f0-9-]+/');
			const formUrl = await formUrlLocator.textContent();

			// Open form in a new page
			const formPage = await n8n.page.context().newPage();
			await formPage.goto(formUrl!);

			// Check that the branding link exists
			const brandingLink = formPage.locator('.n8n-link a');
			await expect(brandingLink).toBeVisible();

			// Get the HTML of the link to inspect the href attribute
			const linkHtml = await brandingLink.evaluate((el) => el.outerHTML);

			// FAILING TEST: This will fail because href is not quoted in the template
			// The href should be quoted like: href="https://n8n.io/..."
			// But currently it's: href=https://n8n.io/...
			expect(linkHtml).toMatch(/href="https:\/\/n8n\.io\/\?utm_source=n8n-internal/);

			// Verify the href attribute value is a valid URL
			const hrefValue = await brandingLink.getAttribute('href');
			expect(hrefValue).toMatch(/^https:\/\/n8n\.io\/\?/);
			expect(hrefValue).toContain('utm_source=n8n-internal');
			expect(hrefValue).toContain('utm_medium=form-trigger');

			// Verify clicking the link doesn't cause errors
			// We'll monitor network responses to check for 500 errors
			const responsePromise = formPage.waitForResponse(
				(response) => response.status() === 500,
				{ timeout: 1000 },
			);

			// Click the branding link - it should open in a new tab
			// We don't actually want to navigate, so we'll prevent default
			await formPage.evaluate(() => {
				const link = document.querySelector('.n8n-link a') as HTMLAnchorElement;
				if (link) {
					// Just verify the link is clickable and has valid href
					link.addEventListener('click', (e) => e.preventDefault());
					link.click();
				}
			});

			// No 500 error should occur
			await expect(responsePromise).rejects.toThrow();

			await formPage.close();
		});

		test('branding link should have properly quoted href attribute in form completion page', async ({
			api,
			n8n,
		}) => {
			// Create a form trigger workflow with completion page
			const workflow: Partial<IWorkflowBase> = {
				nodes: [
					{
						parameters: {
							formTitle: 'Test Form',
							options: {
								appendAttribution: true,
							},
						},
						type: 'n8n-nodes-base.formTrigger',
						typeVersion: 2.5,
						position: [0, 0],
						id: nanoid(),
						name: 'On form submission',
						webhookId: nanoid(),
					},
					{
						parameters: {
							operation: 'completion',
							completionTitle: 'Success',
							completionMessage: 'Your form has been submitted successfully!',
							options: {
								appendAttribution: true,
							},
						},
						type: 'n8n-nodes-base.form',
						typeVersion: 2.5,
						position: [208, 0],
						id: nanoid(),
						name: 'Form Completion',
						webhookId: nanoid(),
					},
				],
				connections: {
					'On form submission': {
						main: [
							[
								{
									node: 'Form Completion',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
				meta: {
					instanceId: nanoid(),
				},
			};

			const { workflowId } = await api.workflows.createWorkflowFromDefinition(workflow, {
				makeUnique: true,
			});

			await n8n.page.goto(`/workflow/${workflowId}`);

			// Start the workflow execution
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

			// Get the form test URL
			await n8n.canvas.openNode('On form submission');
			const formUrlLocator = n8n.page.locator('text=/form-test\\/[a-f0-9-]+/');
			const formUrl = await formUrlLocator.textContent();

			// Open form in a new page
			const formPage = await n8n.page.context().newPage();
			await formPage.goto(formUrl!);

			// Submit the form to reach completion page
			await formPage.getByRole('button', { name: 'Submit' }).click();

			// Wait for completion page
			await expect(formPage.getByText('Your form has been submitted successfully!')).toBeVisible();

			// Check that the branding link exists on completion page
			const brandingLink = formPage.locator('.n8n-link a');
			await expect(brandingLink).toBeVisible();

			// Get the HTML of the link to inspect the href attribute
			const linkHtml = await brandingLink.evaluate((el) => el.outerHTML);

			// FAILING TEST: This will fail because href is not quoted in the completion template
			expect(linkHtml).toMatch(/href="https:\/\/n8n\.io\/\?utm_source=n8n-internal/);

			// Verify the href attribute value is a valid URL
			const hrefValue = await brandingLink.getAttribute('href');
			expect(hrefValue).toMatch(/^https:\/\/n8n\.io\/\?/);
			expect(hrefValue).toContain('utm_source=n8n-internal');
			expect(hrefValue).toContain('utm_medium=form-trigger');

			await formPage.close();
		});

		test('form without branding should not show the attribution link', async ({ api, n8n }) => {
			// Create a form with branding explicitly disabled
			const workflow: Partial<IWorkflowBase> = {
				nodes: [
					{
						parameters: {
							formTitle: 'Test Form No Branding',
							options: {
								appendAttribution: false,
							},
						},
						type: 'n8n-nodes-base.formTrigger',
						typeVersion: 2.5,
						position: [0, 0],
						id: nanoid(),
						name: 'On form submission',
						webhookId: nanoid(),
					},
				],
				connections: {},
				meta: {
					instanceId: nanoid(),
				},
			};

			const { workflowId } = await api.workflows.createWorkflowFromDefinition(workflow, {
				makeUnique: true,
			});

			await n8n.page.goto(`/workflow/${workflowId}`);

			// Start the workflow execution
			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

			// Get the form test URL
			await n8n.canvas.openNode('On form submission');
			const formUrlLocator = n8n.page.locator('text=/form-test\\/[a-f0-9-]+/');
			const formUrl = await formUrlLocator.textContent();

			// Open form in a new page
			const formPage = await n8n.page.context().newPage();
			await formPage.goto(formUrl!);

			// Branding link should NOT be visible
			const brandingLink = formPage.locator('.n8n-link a');
			await expect(brandingLink).toBeHidden();

			await formPage.close();
		});
	},
);
