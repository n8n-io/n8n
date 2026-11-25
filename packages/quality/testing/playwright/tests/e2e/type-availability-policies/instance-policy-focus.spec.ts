import { NO_OP, prepareTypePolicyInstance, SLACK_CREDENTIAL } from './policy-helpers';
import { expect, test } from '../../../fixtures/base';
import { policyRule as rule } from '../../../services/type-policy-api-helper';

// An instance policy applies to every workflow on the instance, so the spec needs its own.
test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'instance-policy-focus',
			N8N_ENABLED_MODULES: 'type-availability-policies',
			N8N_ENV_FEAT_NODE_AND_CREDENTIAL_POLICIES_SETTINGS: 'true',
		},
	},
});

test.describe(
	'Instance policy table: focus when a row leaves @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		// The instance policy is shared state: run one test at a time.
		test.describe.configure({ mode: 'default' });

		test.beforeEach(async ({ api }) => {
			await prepareTypePolicyInstance(api);
			await Promise.all([
				api.nodeTypePolicies.setInstancePolicy({
					rules: [rule('deny', NO_OP.type)],
					defaultAction: 'allow',
				}),
				api.credentialTypePolicies.setInstancePolicy({
					rules: [rule('deny', SLACK_CREDENTIAL.type)],
					defaultAction: 'allow',
				}),
			]);
		});

		test('should return the focus to the node row when the row stays in the table', async ({
			n8n,
		}) => {
			const page = n8n.instancePolicy;
			await page.goto('node');
			await page.search(NO_OP.type);
			await page.openDialogFromRow(NO_OP.type);

			await page.setDialogAccess('node', 'Allowed');
			await page.getDoneButton('node').click();

			await expect(page.getDialog('node')).toBeHidden();
			await expect(page.getRowButton(NO_OP.type)).toBeFocused();
		});

		test('should return the focus to the credential row when the row stays in the table', async ({
			n8n,
		}) => {
			const page = n8n.instancePolicy;
			await page.goto('credential');
			await page.search(SLACK_CREDENTIAL.type);
			await page.openDialogFromRow(SLACK_CREDENTIAL.type);

			await page.setDialogAccess('credential', 'Allowed');
			await n8n.page.keyboard.press('Escape');

			await expect(page.getDialog('credential')).toBeHidden();
			await expect(page.getRowButton(SLACK_CREDENTIAL.type)).toBeFocused();
		});

		test('should focus the access filter when the row leaves after Done closed the dialog', async ({
			n8n,
		}) => {
			const page = n8n.instancePolicy;
			await page.goto('node');
			await page.filterByAccess('Restricted');
			await page.openDialogFromRow(NO_OP.type);
			const releaseSave = await page.holdPolicySaves('node');

			await page.setDialogAccess('node', 'Allowed');
			await page.getDoneButton('node').click();
			await expect(page.getDialog('node')).toBeHidden();
			await expect(page.getRowButton(NO_OP.type)).toBeFocused();
			releaseSave();

			await expect(page.getRowButton(NO_OP.type)).toBeHidden();
			await expect(page.getAccessFilter()).toBeFocused();
		});

		test('should focus the access filter when Done closes the dialog after the row left', async ({
			n8n,
		}) => {
			const page = n8n.instancePolicy;
			await page.goto('node');
			await page.filterByAccess('Restricted');
			await page.openDialogFromRow(NO_OP.type);

			await page.setDialogAccess('node', 'Allowed');
			await expect(page.getRowButton(NO_OP.type)).toBeHidden();
			await page.getDoneButton('node').click();

			await expect(page.getDialog('node')).toBeHidden();
			await expect(page.getAccessFilter()).toBeFocused();
		});

		test('should focus the access filter when Escape closes the dialog after the row left', async ({
			n8n,
		}) => {
			const page = n8n.instancePolicy;
			await page.goto('node');
			await page.filterByAccess('Restricted');
			await page.openDialogFromRow(NO_OP.type);

			await page.setDialogAccess('node', 'Allowed');
			await expect(page.getRowButton(NO_OP.type)).toBeHidden();
			await n8n.page.keyboard.press('Escape');

			await expect(page.getDialog('node')).toBeHidden();
			await expect(page.getAccessFilter()).toBeFocused();
		});

		test('should focus the access filter when the credential row leaves the table', async ({
			n8n,
		}) => {
			const page = n8n.instancePolicy;
			await page.goto('credential');
			await page.filterByAccess('Restricted');
			await page.openDialogFromRow(SLACK_CREDENTIAL.type);

			await page.setDialogAccess('credential', 'Allowed');
			await expect(page.getRowButton(SLACK_CREDENTIAL.type)).toBeHidden();
			await page.getDoneButton('credential').click();

			await expect(page.getDialog('credential')).toBeHidden();
			await expect(page.getAccessFilter()).toBeFocused();
		});

		test('should focus the access filter when the Access menu of a row moves it out of the filter', async ({
			n8n,
		}) => {
			const page = n8n.instancePolicy;
			await page.goto('node');
			await page.filterByAccess('Restricted');

			await page.setRowAccess(NO_OP.name, 'Allowed');

			await expect(page.getRowButton(NO_OP.type)).toBeHidden();
			await expect(page.getAccessFilter()).toBeFocused();
		});
	},
);
