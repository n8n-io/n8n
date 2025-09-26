import { test, expect } from '../../fixtures/base';

const INVALID_NAMES = [
	'https://n8n.io',
	'http://n8n.io',
	'www.n8n.io',
	'n8n.io',
	'n8n.бг',
	'n8n.io/home',
	'n8n.io/home?send=true',
	'<a href="#">Jack</a>',
	'<script>alert("Hello")</script>',
];

const VALID_NAMES = [
	['a', 'a'],
	['alice', 'alice'],
	['Robert', 'Downey Jr.'],
	['Mia', 'Mia-Downey'],
	['Mark', "O'neil"],
	['Thomas', 'Müler'],
	['ßáçøñ', 'ßáçøñ'],
	['أحمد', 'فلسطين'],
	['Милорад', 'Филиповић'],
];

test.describe('Personal Settings', () => {
	test('should allow to change first and last name', async ({ n8n }) => {
		await n8n.settings.goToPersonalSettings();

		for (const name of VALID_NAMES) {
			await n8n.settings.fillPersonalData(name[0], name[1]);
			await n8n.settings.saveSettings();

			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Personal details updated'),
			).toBeVisible();
			await n8n.notifications.closeNotificationByText('Personal details updated');
		}
	});

	test('should not allow malicious values for personal data', async ({ n8n }) => {
		await n8n.settings.goToPersonalSettings();

		for (const name of INVALID_NAMES) {
			await n8n.settings.fillPersonalData(name, name);
			await n8n.settings.saveSettings();

			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Problem updating your details'),
			).toBeVisible();
			await n8n.notifications.closeNotificationByText('Problem updating your details');
		}
	});
});
