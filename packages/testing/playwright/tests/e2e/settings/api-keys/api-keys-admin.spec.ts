import { nanoid } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';

test.describe(
	'API keys settings — admin cross-user behavior',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('admin sees the member’s key under the All tab and can revoke it', async ({
			n8n,
			api,
		}) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

			const memberApi = await api.createApiForUser(member);
			const memberKey = await memberApi.publicApi.createApiKey(`member-key-${nanoid()}`);

			await n8n.navigate.toApiSettings();

			// Mine/All tab strip is visible to owners and admins.
			const tabs = n8n.page.getByTestId('api-keys-tabs');
			await expect(tabs).toBeVisible();

			// On the default Mine tab, the member's key is not shown.
			await expect(
				n8n.page.locator(`[data-test-id="api-key-row"][data-key-id="${memberKey.id}"]`),
			).toBeHidden();

			// Switch to All — the member's key is now listed.
			await tabs.getByText(/^All/).click();
			const memberRow = n8n.page.locator(
				`[data-test-id="api-key-row"][data-key-id="${memberKey.id}"]`,
			);
			await expect(memberRow).toBeVisible();
			await expect(memberRow).toContainText(memberKey.label);

			// Revoke the member's key. Admin path uses the "owner-name" confirm copy.
			await memberRow.getByTestId('api-key-revoke-action').click();
			const confirmDialog = n8n.page.getByRole('dialog');
			await expect(confirmDialog).toBeVisible();
			await expect(confirmDialog).toContainText('Test Member');
			await confirmDialog.getByRole('button', { name: 'Revoke' }).click();

			// Row is gone from the table after the revoke.
			await expect(memberRow).toBeHidden();

			// Member's key is invalidated — a subsequent public-API call returns 401.
			const probe = await api.request.get('/api/v1/workflows', {
				headers: { 'X-N8N-API-KEY': memberKey.rawApiKey },
			});
			expect(probe.status()).toBe(401);
		});

		test('member does not see the Mine/All tabs on /settings/api', async ({ n8n, api }) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Other',
				lastName: 'Member',
			});

			const memberN8n = await n8n.start.withUser(member);
			await memberN8n.navigate.toApiSettings();

			await expect(memberN8n.page.getByTestId('api-keys-tabs')).toBeHidden();
		});
	},
);
