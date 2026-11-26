import { NO_OP, prepareTypePolicyInstance, scheduleToNoOpWorkflow, SET } from './policy-helpers';
import { expect, test } from '../../../fixtures/base';
import type { InstancePolicyPage } from '../../../pages/instance-policy-page';
import type { n8nPage } from '../../../pages/n8nPage';
import { policyRule as rule } from '../../../services/type-policy-api-helper';

// An instance policy applies to every workflow on the instance, so the spec needs its own.
test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'instance-policy-bulk',
			N8N_ENABLED_MODULES: 'type-availability-policies',
			N8N_ENV_FEAT_NODE_AND_CREDENTIAL_POLICIES_SETTINGS: 'true',
		},
	},
});

/** Selects the rows of the types. A search shows each row, and the selection survives it. */
async function selectRows(page: InstancePolicyPage, types: Array<{ type: string; name: string }>) {
	for (const { type, name } of types) {
		await page.search(type);
		await page.getRowCheckbox(name).check();
	}
	await page.search('');
}

/** Reloads the page and checks the saved access of each type. */
async function expectAccessAfterReload(
	n8n: n8nPage,
	types: Array<{ type: string; name: string }>,
	access: 'Allowed' | 'Restricted',
) {
	await n8n.page.reload();
	// Each search shows one row. A wider search lists the rows on several pages.
	for (const { type, name } of types) {
		await n8n.instancePolicy.search(type);
		await expect(n8n.instancePolicy.getRowAccess(name)).toContainText(access);
	}
}

test.describe(
	'Instance policy table: bulk restrict and allow @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		// The instance policy is shared state: run one test at a time.
		test.describe.configure({ mode: 'default' });

		test.beforeEach(async ({ api }) => {
			await prepareTypePolicyInstance(api);
		});

		test('should allow the selected node types at once, with no review', async ({ n8n, api }) => {
			await api.nodeTypePolicies.setInstancePolicy({
				rules: [rule('deny', NO_OP.type), rule('deny', SET.type)],
				defaultAction: 'allow',
			});
			const page = n8n.instancePolicy;
			await page.goto('node');

			await selectRows(page, [NO_OP, SET]);
			await expect(page.getSelectionBar()).toContainText('2 rows selected');
			await expect(page.getSelectionStatus()).toHaveText('2 rows selected');

			await page.getBulkButton('Allowed').click();

			await expect(page.getSelectionBar()).toBeHidden();
			await expect(page.getRestrictReview()).toBeHidden();

			await expectAccessAfterReload(n8n, [NO_OP, SET], 'Allowed');
		});

		test('should select the rows of one page from the page checkbox and restrict them', async ({
			n8n,
			api,
		}) => {
			// A workflow uses No Operation, so the restriction always opens the review.
			const { id: projectId } = await api.projects.createProject();
			await api.workflows.createWorkflow(scheduleToNoOpWorkflow(), projectId);
			const page = n8n.instancePolicy;
			await page.goto('node');

			// One page shows 25 rows. The node catalog fills several pages, and only this page is selected.
			await page.getSelectAllCheckbox().check();
			const selected = Number(
				/(\d+) rows? selected/.exec(await page.getSelectionBar().innerText())?.[1],
			);
			expect(selected).toBeGreaterThan(0);
			expect(selected).toBeLessThanOrEqual(25);
			await page.getSelectAllCheckbox().uncheck();
			await expect(page.getSelectionBar()).toBeHidden();

			await page.search(NO_OP.type);
			await page.getSelectAllCheckbox().check();
			await expect(page.getSelectionBar()).toContainText('1 row selected');
			await page.getBulkButton('Restricted').click();
			await page.getRestrictReviewButton('Restrict 1').click();

			await expect(page.getSelectionBar()).toBeHidden();
			await expectAccessAfterReload(n8n, [NO_OP], 'Restricted');
		});

		test('should ask once before it restricts the selected node types that workflows use', async ({
			n8n,
			api,
		}) => {
			const { id: projectId } = await api.projects.createProject();
			await api.workflows.createWorkflow(scheduleToNoOpWorkflow(), projectId);
			const page = n8n.instancePolicy;
			await page.goto('node');
			await selectRows(page, [NO_OP, SET]);

			await page.getBulkButton('Restricted').click();
			const review = page.getRestrictReview();
			await expect(review).toContainText('Restrict 2 nodes?');
			await expect(review).toContainText(NO_OP.name);
			await expect(review).not.toContainText(SET.name);

			// A cancel changes nothing and keeps the selection.
			await page.getRestrictReviewButton('Cancel').click();
			await expect(review).toBeHidden();
			await expect(page.getSelectionBar()).toContainText('2 rows selected');
			await page.search(NO_OP.type);
			await expect(page.getRowAccess(NO_OP.name)).toContainText('Allowed');

			await page.getBulkButton('Restricted').click();
			await page.getRestrictReviewButton('Restrict 2').click();
			await expect(page.getSelectionBar()).toBeHidden();

			await expectAccessAfterReload(n8n, [NO_OP, SET], 'Restricted');
		});

		test('should change nothing when the policy changed after the page loaded', async ({
			n8n,
			api,
		}) => {
			await api.nodeTypePolicies.setInstancePolicy({
				rules: [rule('deny', NO_OP.type)],
				defaultAction: 'allow',
			});
			const page = n8n.instancePolicy;
			await page.goto('node');
			await selectRows(page, [NO_OP]);

			// Another admin changes the policy.
			await api.nodeTypePolicies.setInstancePolicy({
				rules: [rule('deny', NO_OP.type), rule('deny', SET.type)],
				defaultAction: 'allow',
			});
			await page.getBulkButton('Allowed').click();

			await expect(n8n.notifications.getNotificationByTitle('The policy changed')).toBeVisible();
			await expect(page.getSelectionBar()).toContainText('1 row selected');

			await expectAccessAfterReload(n8n, [NO_OP], 'Restricted');
		});

		test('should select a row and apply an action from the keyboard', async ({ n8n, api }) => {
			await api.nodeTypePolicies.setInstancePolicy({
				rules: [rule('deny', NO_OP.type)],
				defaultAction: 'allow',
			});
			const page = n8n.instancePolicy;
			await page.goto('node');
			await page.search(NO_OP.type);

			await page.getRowCheckbox(NO_OP.name).focus();
			await n8n.page.keyboard.press('Space');
			await expect(page.getSelectionStatus()).toHaveText('1 row selected');

			await page.getBulkButton('Allowed').focus();
			await n8n.page.keyboard.press('Enter');

			await expect(page.getSelectionBar()).toBeHidden();
			await expect(page.getSelectionStatus()).toHaveText('Selection cleared');
			await expect(page.getRowAccess(NO_OP.name)).toContainText('Allowed');
		});
	},
);
