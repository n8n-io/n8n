import { test, expect } from '../../../fixtures/base';

test.describe(
	'Tooltip link contrast',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		for (const colorScheme of ['light', 'dark'] as const) {
			test(`should show links in a field tooltip with WCAG AA contrast in the ${colorScheme} theme`, async ({
				n8n,
				a11y,
			}) => {
				await n8n.page.emulateMedia({ colorScheme });
				await n8n.start.fromHome();
				await n8n.navigate.toCredentials();
				await n8n.credentials.addResource.credential();
				// The description of the Airtop "API Key" field contains a link.
				await n8n.credentials.selectCredentialType('Airtop API');
				const modal = n8n.credentials.credentialModal;
				await modal.showFieldHelp('API Key');
				await expect(modal.getFieldHelpLink('Airtop')).toBeVisible();

				const ratio = await a11y.contrastRatio(
					modal.getFieldHelpLink('Airtop'),
					modal.getFieldHelpTooltip(),
				);

				expect(ratio).toBeGreaterThanOrEqual(4.5);
			});
		}
	},
);
