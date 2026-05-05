import { test, expect } from '../../../fixtures/base';

// ADO-5180: Clicking create credentials on overview page redirects to personal
test.describe(
	'Overview page credential creation navigation',
	{
		annotation: [
			{ type: 'owner', description: 'Adore' },
			{ type: 'issue', description: 'ADO-5180' },
		],
	},
	() => {
		test('should stay on workflows overview when opening credential creation from universal add', async ({
			n8n,
		}) => {
			// Start from workflows overview page
			await n8n.start.fromHome();

			// Verify we're on the workflows overview page
			await expect(n8n.page).toHaveURL(/\/home\/workflows$/);

			// Click the universal add button and then "New credential"
			await n8n.sideBar.universalAdd();
			const universalAdd = n8n.page.getByTestId('universal-add');
			await universalAdd.getByText('New credential', { exact: true }).click();

			// Modal should open - wait for credential picker to be visible
			const credentialPicker = n8n.page.getByRole('combobox', { name: 'Search for app...' });
			await expect(credentialPicker).toBeVisible();

			// CRITICAL: URL should remain on /home/workflows, NOT redirect to /home/credentials
			await expect(n8n.page).toHaveURL(/\/home\/workflows$/);

			// Close the modal
			await n8n.page.keyboard.press('Escape');
			await expect(credentialPicker).toBeHidden();

			// After closing modal, should still be on /home/workflows
			await expect(n8n.page).toHaveURL(/\/home\/workflows$/);
		});
	},
);
