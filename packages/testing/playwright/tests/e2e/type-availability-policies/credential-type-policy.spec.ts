import type { CreateCredentialDto } from '@n8n/api-types';
import type { IWorkflowBase } from 'n8n-workflow';

import {
	availabilityInProjects,
	findAvailability,
	manualRunOutcome,
	publishOutcome,
	saveMovedNodes,
	headerAuthCredential,
	loadPostgresColumns,
	POSTGRES_CREDENTIAL,
	postgresCredential,
	postgresWorkflow,
	violationsOf,
} from './policy-helpers';
import { expect, test } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';
import type { TypePolicyApiHelper } from '../../../services/type-policy-api-helper';
import { policyRule as rule } from '../../../services/type-policy-api-helper';

// An instance policy applies to every credential on the instance, so the spec needs its own.
test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'credential-type-policies',
			N8N_ENABLED_MODULES: 'type-availability-policies',
		},
	},
});

async function findType(api: ApiHelpers, projectId: string, credentialType: string) {
	return await findAvailability(
		async (id) => await api.credentialTypePolicies.getAvailability(id),
		projectId,
		credentialType,
	);
}

const BLOCKED_POSTGRES = {
	kind: 'credential-type-unavailable',
	subject: POSTGRES_CREDENTIAL,
	scope: 'instance',
} as const;

/** The editor route replaces the whole credential, so the payload carries no project. */
function asUpdate({ name, type, data }: CreateCredentialDto): CreateCredentialDto {
	return { name, type, data };
}

test.describe(
	'Credential type policies @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		// The instance policy is shared state: run one test at a time.
		test.describe.configure({ mode: 'default' });

		let policies: TypePolicyApiHelper<'credential'>;

		test.beforeEach(async ({ api }) => {
			expect(
				await api.getActiveModules(),
				'the type-availability-policies module is not active: the instance needs a license granting feat:typeAvailabilityPolicies at startup',
			).toContain('type-availability-policies');

			// The check reads the license on every decision, not only at startup.
			await api.enableFeature('typeAvailabilityPolicies');
			await api.enableProjectFeatures();
			await api.setMaxTeamProjectsQuota(-1);

			const { rawApiKey } = await api.publicApi.createApiKey(undefined, [
				'credentialTypePolicy:manage',
			]);
			policies = api.credentialTypePolicies.viaPublicApi(rawApiKey);
			await policies.resetInstancePolicy();
			// Specs share one instance in a local run, so clear the other kind as well.
			await api.nodeTypePolicies.resetInstancePolicy();
		});

		test.describe('saving a credential of a blocked type', () => {
			let projectId: string;

			test.beforeEach(async ({ api }) => {
				({ id: projectId } = await api.projects.createProject());
				await policies.setInstancePolicy({
					rules: [rule('deny', POSTGRES_CREDENTIAL)],
					defaultAction: 'allow',
				});
			});

			test('should refuse creating the credential and write nothing', async ({ api }) => {
				const response = await api.credentials.createCredentialRaw(postgresCredential(projectId));

				expect(response.status()).toBe(403);
				expect(await violationsOf(response)).toEqual([
					expect.objectContaining({
						kind: 'credential-type-unavailable',
						subject: POSTGRES_CREDENTIAL,
						scope: 'instance',
					}),
				]);

				const stored = await api.credentials.getCredentialsByProject(projectId);
				expect(stored.map((credential) => credential.type)).not.toContain(POSTGRES_CREDENTIAL);
			});

			test('should refuse switching an existing credential onto the blocked type', async ({
				api,
			}) => {
				const existing = await api.credentials.createCredential(headerAuthCredential(projectId));

				const response = await api.credentials.updateCredentialRaw(existing.id, {
					...asUpdate(postgresCredential(projectId)),
					name: existing.name,
				});

				expect(response.status()).toBe(403);
				expect(await violationsOf(response)).toEqual([
					expect.objectContaining({ subject: POSTGRES_CREDENTIAL, scope: 'instance' }),
				]);

				const stored = await api.credentials.getCredential(existing.id);
				expect(stored.type).toBe(existing.type);
			});
		});

		test.describe('a credential type blocked after it was used', () => {
			let projectId: string;
			let credential: CreateCredentialDto & { id: string };
			let workflow: IWorkflowBase;

			test.beforeEach(async ({ api }) => {
				({ id: projectId } = await api.projects.createProject());

				const payload = postgresCredential(projectId);
				const created = await api.credentials.createCredential(payload);
				credential = { ...payload, id: created.id };
				workflow = await api.workflows.createWorkflow(
					postgresWorkflow({ id: created.id, name: created.name }),
					projectId,
				);

				await policies.setInstancePolicy({
					rules: [rule('deny', POSTGRES_CREDENTIAL)],
					defaultAction: 'allow',
				});
			});

			test('should still save the credential', async ({ api }) => {
				const response = await api.credentials.updateCredentialRaw(credential.id, {
					...asUpdate(credential),
					name: `${credential.name} renamed`,
				});

				expect(response.status()).toBe(200);
			});

			test('should still save the workflow that uses it', async ({ api }) => {
				expect(await saveMovedNodes(api, workflow)).toBe(200);
			});

			test('should refuse to publish the workflow', async ({ api }) => {
				expect(await publishOutcome(api, workflow)).toEqual({
					status: 403,
					violations: [expect.objectContaining(BLOCKED_POSTGRES)],
				});
			});

			test('should fail a run of the workflow with the violation on the execution', async ({
				api,
			}) => {
				expect(await manualRunOutcome(api, workflow)).toEqual({
					status: 'error',
					violations: [expect.objectContaining(BLOCKED_POSTGRES)],
				});
			});

			test('should refuse to decrypt the credential for a node type that is allowed', async ({
				api,
			}) => {
				const response = await loadPostgresColumns(api, credential, projectId);

				expect(response.ok()).toBe(false);
				expect((await response.json()).message).toBe(
					`Credential type "${POSTGRES_CREDENTIAL}" is blocked by an instance policy`,
				);
			});
		});

		test.describe('a project that narrows the instance policy', () => {
			let narrowedProjectId: string;
			let otherProjectId: string;

			test.beforeEach(async ({ api }) => {
				({ id: narrowedProjectId } = await api.projects.createProject());
				({ id: otherProjectId } = await api.projects.createProject());

				await policies.setProjectPolicy(narrowedProjectId, {
					rules: [rule('deny', POSTGRES_CREDENTIAL)],
					defaultAction: 'allow',
				});
			});

			test('should report the type unavailable in that project only', async ({ api }) => {
				expect(
					await availabilityInProjects(
						async (projectId) => await api.credentialTypePolicies.getAvailability(projectId),
						POSTGRES_CREDENTIAL,
						{ narrowedProjectId, otherProjectId },
					),
				).toEqual({
					narrowed: expect.objectContaining({ available: false, scope: 'project' }),
					other: expect.objectContaining({ available: true }),
				});
			});

			test('should refuse the credential in that project only', async ({ api }) => {
				const refused = await api.credentials.createCredentialRaw(
					postgresCredential(narrowedProjectId),
				);

				expect(refused.status()).toBe(403);
				expect(await violationsOf(refused)).toEqual([
					expect.objectContaining({ subject: POSTGRES_CREDENTIAL, scope: 'project' }),
				]);

				const accepted = await api.credentials.createCredentialRaw(
					postgresCredential(otherProjectId),
				);
				expect(accepted.status()).toBe(200);
			});

			test('should refuse moving a workflow that uses the type into that project', async ({
				api,
			}) => {
				const created = await api.credentials.createCredential(postgresCredential(otherProjectId));
				const workflow = await api.workflows.createWorkflow(
					postgresWorkflow({ id: created.id, name: created.name }),
					otherProjectId,
				);

				const response = await api.workflows.transferRaw(workflow.id, narrowedProjectId);

				expect(response.status()).toBe(403);
				expect(await violationsOf(response)).toEqual([
					expect.objectContaining({ subject: POSTGRES_CREDENTIAL, scope: 'project' }),
				]);

				const stored = (await api.workflows.getWorkflow(workflow.id)) as IWorkflowBase & {
					homeProject?: { id: string };
				};
				expect(stored.homeProject?.id).toBe(otherProjectId);
			});
		});

		test.describe('a type the instance delegates to projects', () => {
			test('should make the type available only in a project that allows it', async ({ api }) => {
				await policies.setInstancePolicy({
					rules: [rule('delegate', POSTGRES_CREDENTIAL)],
					defaultAction: 'allow',
				});
				const { id: optedInProjectId } = await api.projects.createProject();
				const { id: otherProjectId } = await api.projects.createProject();

				await policies.setProjectPolicy(optedInProjectId, {
					rules: [rule('allow', POSTGRES_CREDENTIAL)],
					defaultAction: 'allow',
				});

				expect(await findType(api, optedInProjectId, POSTGRES_CREDENTIAL)).toMatchObject({
					available: true,
				});
				expect(await findType(api, otherProjectId, POSTGRES_CREDENTIAL)).toMatchObject({
					available: false,
					optInAvailable: true,
				});

				const accepted = await api.credentials.createCredentialRaw(
					postgresCredential(optedInProjectId),
				);
				expect(accepted.status()).toBe(200);

				const refused = await api.credentials.createCredentialRaw(
					postgresCredential(otherProjectId),
				);
				expect(refused.status()).toBe(403);
			});
		});
	},
);
