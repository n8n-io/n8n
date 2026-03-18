import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for IAM-416: Unowned HTTP Credential Exfiltration via Generic Auth
 *
 * Vulnerability:
 * The pre-execution credential permission checker in `CredentialsPermissionChecker.getActiveCredentialTypes()`
 * only validates `nodeCredentialType` but NOT `genericAuthType`. This allows an attacker to:
 * 1. Create a workflow with HTTP Request node using `authentication: "genericCredentialType"`
 * 2. Inject a victim's credential ID into the workflow payload
 * 3. Execute the workflow, causing n8n to load and use the victim's credentials
 * 4. Exfiltrate credentials by sending authenticated requests to attacker-controlled endpoints
 *
 * Root cause locations:
 * - packages/cli/src/executions/pre-execution-checks/credentials-permission-checker.ts:138-141
 *   (only checks `nodeCredentialType`, misses `genericAuthType`)
 * - packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts:168-169
 *   (uses `genericAuthType` at runtime to load credentials)
 */
test.describe(
	'Security: Credential Exfiltration via Generic Auth',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should block execution when attacker tries to use unowned credential via genericAuthType @auth:owner', async ({
			api,
		}) => {
			// Setup: Create victim user with an httpBasicAuth credential
			const victimUser = await api.users.create({
				email: `victim-${nanoid()}@test.com`,
				password: 'VictimPassword123',
				firstName: 'Victim',
				lastName: 'User',
				role: 'global:member',
			});

			// Create isolated API context for victim (to create their credential)
			const victimApi = await api.createApiForUser({
				email: victimUser.email,
				password: victimUser.password,
			});

			// Victim creates their httpBasicAuth credential
			const victimCredential = await victimApi.credentials.createCredential({
				name: `Victim Basic Auth ${nanoid()}`,
				type: 'httpBasicAuth',
				data: {
					user: 'victim-user',
					password: 'victim-secret-password',
				},
			});

			// Setup: Create attacker user
			const attackerUser = await api.users.create({
				email: `attacker-${nanoid()}@test.com`,
				password: 'AttackerPassword123',
				firstName: 'Attacker',
				lastName: 'User',
				role: 'global:member',
			});

			// Create isolated API context for attacker
			const attackerApi = await api.createApiForUser({
				email: attackerUser.email,
				password: attackerUser.password,
			});

			// Attacker creates a malicious workflow that injects victim's credential ID
			// This workflow uses genericCredentialType with the victim's credential
			const maliciousWorkflow = await attackerApi.workflows.createWorkflow({
				name: `Malicious Workflow ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.4,
						position: [200, 0] as [number, number],
						parameters: {
							method: 'GET',
							url: 'https://httpbin.org/basic-auth/victim-user/victim-secret-password',
							authentication: 'genericCredentialType',
							genericAuthType: 'httpBasicAuth',
						},
						// VULNERABILITY: Attacker injects victim's credential ID here
						credentials: {
							httpBasicAuth: {
								id: victimCredential.id,
								name: victimCredential.name,
							},
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [
							[
								{
									node: 'HTTP Request',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			});

			// Attacker tries to execute the workflow
			// EXPECTED: Execution should FAIL with permission error
			// ACTUAL (before fix): Execution SUCCEEDS, credentials are exfiltrated
			const executionResult = attackerApi.workflows.runManually(
				maliciousWorkflow.id,
				'Manual Trigger',
			);

			// This should throw an error about inaccessible credentials
			await expect(executionResult).rejects.toThrow();

			// Additional verification: If execution somehow completes, check that it failed
			const executionId = await executionResult.catch(() => null);
			if (executionId) {
				const execution = await attackerApi.workflows.getExecution(executionId.executionId);
				// @ts-expect-error - ExecutionListResponse type is incomplete
				expect(execution.status).not.toBe('success');
			}
		});

		test('should block execution when attacker uses httpBearerAuth via genericAuthType @auth:owner', async ({
			api,
		}) => {
			// Similar test but with httpBearerAuth to verify all genericAuthType variants are protected
			const victimUser = await api.users.create({
				email: `victim-${nanoid()}@test.com`,
				password: 'VictimPassword123',
				firstName: 'Victim',
				lastName: 'User',
				role: 'global:member',
			});

			const victimApi = await api.createApiForUser({
				email: victimUser.email,
				password: victimUser.password,
			});

			const victimCredential = await victimApi.credentials.createCredential({
				name: `Victim Bearer Token ${nanoid()}`,
				type: 'httpBearerAuth',
				data: {
					token: 'super-secret-bearer-token-12345',
				},
			});

			const attackerUser = await api.users.create({
				email: `attacker-${nanoid()}@test.com`,
				password: 'AttackerPassword123',
				firstName: 'Attacker',
				lastName: 'User',
				role: 'global:member',
			});

			const attackerApi = await api.createApiForUser({
				email: attackerUser.email,
				password: attackerUser.password,
			});

			const maliciousWorkflow = await attackerApi.workflows.createWorkflow({
				name: `Malicious Bearer Workflow ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.4,
						position: [200, 0] as [number, number],
						parameters: {
							method: 'GET',
							url: 'https://httpbin.org/bearer',
							authentication: 'genericCredentialType',
							genericAuthType: 'httpBearerAuth',
						},
						credentials: {
							httpBearerAuth: {
								id: victimCredential.id,
								name: victimCredential.name,
							},
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [
							[
								{
									node: 'HTTP Request',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			});

			// Execution should fail with permission error
			const executionResult = attackerApi.workflows.runManually(
				maliciousWorkflow.id,
				'Manual Trigger',
			);

			await expect(executionResult).rejects.toThrow();

			const executionId = await executionResult.catch(() => null);
			if (executionId) {
				const execution = await attackerApi.workflows.getExecution(executionId.executionId);
				// @ts-expect-error - ExecutionListResponse type is incomplete
				expect(execution.status).not.toBe('success');
			}
		});

		test('should allow execution when user owns the credential used via genericAuthType @auth:owner', async ({
			api,
		}) => {
			// Positive test: User should be able to use their own credentials via genericAuthType
			const user = await api.users.create({
				email: `user-${nanoid()}@test.com`,
				password: 'UserPassword123',
				firstName: 'Regular',
				lastName: 'User',
				role: 'global:member',
			});

			const userApi = await api.createApiForUser({
				email: user.email,
				password: user.password,
			});

			const userCredential = await userApi.credentials.createCredential({
				name: `User Own Credential ${nanoid()}`,
				type: 'httpBasicAuth',
				data: {
					user: 'test-user',
					password: 'test-password',
				},
			});

			const workflow = await userApi.workflows.createWorkflow({
				name: `Legitimate Workflow ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: nanoid(),
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.4,
						position: [200, 0] as [number, number],
						parameters: {
							method: 'GET',
							url: 'https://httpbin.org/basic-auth/test-user/test-password',
							authentication: 'genericCredentialType',
							genericAuthType: 'httpBasicAuth',
						},
						credentials: {
							httpBasicAuth: {
								id: userCredential.id,
								name: userCredential.name,
							},
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [
							[
								{
									node: 'HTTP Request',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			});

			// This should succeed - user can use their own credentials
			const { executionId } = await userApi.workflows.runManually(workflow.id, 'Manual Trigger');

			// Wait for execution to complete
			const execution = await userApi.workflows.waitForExecution(workflow.id, 10000, 'manual');

			// Execution should succeed when using own credentials
			// @ts-expect-error - ExecutionListResponse type is incomplete
			expect(execution.status).toBe('success');
		});
	},
);
