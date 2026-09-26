import {
	executionErrorOf,
	POSTGRES_CREDENTIAL,
	postgresCredential,
	webhookToPostgresWorkflow,
} from './policy-helpers';
import { expect, test } from '../../../fixtures/base';
import { policyRule as rule } from '../../../services/type-policy-api-helper';

// Every process reads its own module list, so the workers need the module too.
test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'credential-type-policies-queue',
			N8N_ENABLED_MODULES: 'type-availability-policies',
		},
	},
});

test.describe(
	'Credential type policies on a worker @mode:queue @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		test('should fail a production run on the worker when its credential type is blocked', async ({
			api,
		}) => {
			expect(
				await api.getActiveModules(),
				'the type-availability-policies module is not active: the instance needs a license granting feat:typeAvailabilityPolicies at startup',
			).toContain('type-availability-policies');
			await api.enableFeature('typeAvailabilityPolicies');
			await api.enableProjectFeatures();
			await api.setMaxTeamProjectsQuota(-1);
			await api.nodeTypePolicies.resetInstancePolicy();
			await api.credentialTypePolicies.resetInstancePolicy();

			const { id: projectId } = await api.projects.createProject();
			const created = await api.credentials.createCredential(postgresCredential(projectId));
			const { workflowId, webhookPath, createdWorkflow } =
				await api.workflows.createWorkflowFromDefinition(
					webhookToPostgresWorkflow({ id: created.id, name: created.name }),
					{ projectId },
				);

			// Published before the block: a publish after it is refused on main.
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);
			await api.credentialTypePolicies.setInstancePolicy({
				rules: [rule('deny', POSTGRES_CREDENTIAL)],
				defaultAction: 'allow',
			});

			await api.webhooks.trigger(`/webhook/${webhookPath}`, { maxNotFoundRetries: 5 });
			const summary = await api.workflows.waitForExecution(workflowId, 15_000, 'webhook');
			const execution = await api.workflows.getExecution(summary.id);

			expect(execution.status).toBe('error');
			expect(executionErrorOf(execution).violations).toEqual([
				expect.objectContaining({
					kind: 'credential-type-unavailable',
					subject: POSTGRES_CREDENTIAL,
					scope: 'instance',
				}),
			]);
		});
	},
);
