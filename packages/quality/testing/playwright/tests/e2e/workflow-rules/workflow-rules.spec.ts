import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

// The instance rule set applies to every workflow on the instance, so the spec needs its own.
test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'workflow-rules',
			N8N_ENABLED_MODULES: 'workflow-rules',
		},
	},
});

const CREDENTIAL_RULE = 'http-request-credential';

function unauthenticatedHttpWorkflow(): Partial<IWorkflowBase> {
	return {
		name: `Workflow rules ${nanoid(8)}`,
		nodes: [
			{
				id: 'trigger',
				name: 'Schedule',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.2,
				position: [0, 0],
				parameters: { rule: { interval: [{ field: 'hours' }] } },
			},
			{
				id: 'http',
				name: 'Call API',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [220, 0],
				parameters: { url: 'https://api.example.com/orders' },
			},
		],
		connections: { Schedule: { main: [[{ node: 'Call API', type: 'main', index: 0 }]] } },
		settings: {},
	};
}

test.describe(
	'Workflow Rules',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		// The instance rule set is shared state: run one test at a time.
		test.describe.configure({ mode: 'default' });

		test.beforeEach(async ({ api }) => {
			await api.workflowRules.reset();
		});

		test('should refuse to publish until the blocking finding is exempted', async ({ api }) => {
			await api.workflowRules.setInstanceRules({
				rules: [{ ruleId: CREDENTIAL_RULE, severity: 'block' }],
			});
			const workflow = await api.workflows.createWorkflow(unauthenticatedHttpWorkflow());

			const refused = await api.workflows.activateRaw(workflow.id, workflow.versionId);
			expect(refused.status()).toBe(403);
			const body = await refused.json();
			expect(body.meta.violations).toEqual([
				expect.objectContaining({
					kind: 'workflow-rule',
					matchedRuleId: CREDENTIAL_RULE,
					subject: 'Call API',
					scope: 'instance',
				}),
			]);

			await api.workflowRules.exempt(workflow.id, CREDENTIAL_RULE);
			const published = await api.workflows.activateRaw(workflow.id, workflow.versionId);
			expect(published.ok()).toBe(true);
		});

		test('should not refuse a publish for a warning', async ({ api }) => {
			await api.workflowRules.setInstanceRules({
				rules: [{ ruleId: CREDENTIAL_RULE, severity: 'warn' }],
			});
			const workflow = await api.workflows.createWorkflow(unauthenticatedHttpWorkflow());

			const published = await api.workflows.activateRaw(workflow.id, workflow.versionId);
			expect(published.ok()).toBe(true);
		});

		test('should show a blocking finding on the node, in the header and in the Rules panel', async ({
			api,
			n8n,
		}) => {
			await api.workflowRules.setInstanceRules({
				rules: [{ ruleId: CREDENTIAL_RULE, severity: 'block' }],
			});
			const workflow = await api.workflows.createWorkflow(unauthenticatedHttpWorkflow());

			await n8n.start.fromExistingWorkflow(workflow.id);

			await expect(n8n.workflowRules.getStatusButton()).toHaveText('1 blocking');
			await expect(n8n.workflowRules.getNodeBadges()).toHaveCount(1);

			await n8n.workflowRules.getStatusButton().click();
			await expect(n8n.workflowRules.getPanel()).toBeVisible();
			await expect(n8n.workflowRules.getPanelFindings()).toHaveCount(1);
			await expect(n8n.workflowRules.getPanelFindings().first()).toContainText('Call API');
		});

		test('should let an admin turn on a rule after previewing its impact', async ({ api, n8n }) => {
			await n8n.workflowRules.goto();

			await n8n.workflowRules.getSeverityOption('no-disabled-nodes', 'Block').click();
			await n8n.workflowRules.save();
			await expect(n8n.workflowRules.getImpactDialog()).toBeVisible();
			await n8n.workflowRules.getImpactConfirmButton().click();

			await expect
				.poll(async () => (await api.workflowRules.getInstanceRules()).ruleSet.rules)
				.toContainEqual(
					expect.objectContaining({ ruleId: 'no-disabled-nodes', severity: 'block' }),
				);
		});
	},
);
