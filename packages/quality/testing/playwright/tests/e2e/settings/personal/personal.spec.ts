import { test, expect } from '../../../../fixtures/base';

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

test.describe(
	'Personal Settings',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should allow to change first and last name', async ({ n8n }) => {
			await n8n.settingsPersonal.goto();

			// Each field saves on its own. The confirmation closes itself and has no close button,
			// so check each save's response and the confirmation once at the end.
			for (const [firstName, lastName] of VALID_NAMES) {
				expect((await n8n.settingsPersonal.saveFirstName(firstName)).ok()).toBe(true);
				expect((await n8n.settingsPersonal.saveLastName(lastName)).ok()).toBe(true);
			}
			await n8n.notifications.waitForNotification('Personal details updated');
		});

		test('should not allow malicious values for personal data', async ({ n8n }) => {
			await n8n.settingsPersonal.goto();

			for (const name of INVALID_NAMES) {
				expect((await n8n.settingsPersonal.saveFirstName(name)).ok()).toBe(false);
				await n8n.notifications.waitForNotificationAndClose('Problem updating your details');

				expect((await n8n.settingsPersonal.saveLastName(name)).ok()).toBe(false);
				await n8n.notifications.waitForNotificationAndClose('Problem updating your details');
			}
		});
	},
);
