import type { CreateCredentialDto } from '@n8n/api-types';

import { test, expect } from '../../fixtures/base';

test.describe('Credential API Operations', () => {
	test.describe('Basic CRUD Operations', () => {
		test('should create, retrieve, update, and delete credential', async ({ api }) => {
			const credentialData: CreateCredentialDto = {
				name: 'Test HTTP Basic Auth',
				type: 'httpBasicAuth',
				data: {
					user: 'test_user',
					password: 'test_password',
				},
			};

			const { credentialId, createdCredential } =
				await api.credentialApi.createCredentialFromDefinition(credentialData);

			expect(credentialId).toBeTruthy();
			expect(createdCredential.type).toBe('httpBasicAuth');
			expect(createdCredential.name).toContain('Test HTTP Basic Auth (Test');

			const retrievedCredential = await api.credentialApi.getCredential(credentialId);
			expect(retrievedCredential.id).toBe(credentialId);
			expect(retrievedCredential.type).toBe('httpBasicAuth');
			expect(retrievedCredential.name).toBe(createdCredential.name);

			const credentialWithData = await api.credentialApi.getCredential(credentialId, {
				includeData: true,
			});
			expect(credentialWithData.data).toBeDefined();
			expect(credentialWithData.data?.user).toBe('test_user');

			const updatedName = 'Updated HTTP Basic Auth';
			const updatedCredential = await api.credentialApi.updateCredential(credentialId, {
				name: updatedName,
				data: {
					user: 'updated_user',
					password: 'updated_password',
				},
			});
			expect(updatedCredential.name).toBe(updatedName);

			const verifyUpdated = await api.credentialApi.getCredential(credentialId, {
				includeData: true,
			});
			expect(verifyUpdated.name).toBe(updatedName);
			expect(verifyUpdated.data?.user).toBe('updated_user');

			const deleteResult = await api.credentialApi.deleteCredential(credentialId);
			expect(deleteResult).toBe(true);

			await expect(api.credentialApi.getCredential(credentialId)).rejects.toThrow();
		});
	});

	test.describe('Credential Listing', () => {
		test('should list credentials with different query options', async ({ api }) => {
			const credential1 = await api.credentialApi.createCredentialFromDefinition({
				name: 'First Test Credential',
				type: 'httpBasicAuth',
				data: { user: 'user1', password: 'pass1' },
			});

			const credential2 = await api.credentialApi.createCredentialFromDefinition({
				name: 'Second Test Credential',
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: 'Bearer token' },
			});

			const allCredentials = await api.credentialApi.getCredentials();
			expect(allCredentials.length).toBeGreaterThanOrEqual(2);

			const createdIds = [credential1.credentialId, credential2.credentialId];
			const foundCredentials = allCredentials.filter((c) => createdIds.includes(c.id));
			expect(foundCredentials).toHaveLength(2);

			const credentialsWithScopes = await api.credentialApi.getCredentials({
				includeScopes: true,
			});
			expect(credentialsWithScopes[0].scopes).toBeDefined();
			expect(Array.isArray(credentialsWithScopes[0].scopes)).toBe(true);

			const credentialsWithData = await api.credentialApi.getCredentials({
				includeData: true,
			});
			const foundWithData = credentialsWithData.filter((c) => createdIds.includes(c.id));
			expect(foundWithData.some((c) => c.data)).toBe(true);
		});
	});

	test.describe('Project Integration', () => {
		test('should handle credential-project associations', async ({ api }) => {
			await api.enableFeature('projectRole:admin');
			await api.enableFeature('projectRole:editor');
			await api.setMaxTeamProjectsQuota(-1);

			const project = await api.projectApi.createProject('Test Project for Credentials');

			const credential = await api.credentialApi.createCredentialFromDefinition({
				name: 'Project Credential',
				type: 'httpBasicAuth',
				data: { user: 'user', password: 'pass' },
				projectId: project.id,
			});

			const projectCredentials = await api.credentialApi.getCredentialsForWorkflow({
				projectId: project.id,
			});

			expect(projectCredentials).toBeDefined();
			expect(Array.isArray(projectCredentials)).toBe(true);

			const foundCredential = projectCredentials.find((c) => c.id === credential.credentialId);
			expect(foundCredential).toBeDefined();
		});

		test('should transfer credential between projects', async ({ api }) => {
			await api.enableFeature('projectRole:admin');
			await api.enableFeature('projectRole:editor');
			await api.setMaxTeamProjectsQuota(-1);

			const sourceProject = await api.projectApi.createProject('Source Project');
			const destinationProject = await api.projectApi.createProject('Destination Project');

			const credential = await api.credentialApi.createCredentialFromDefinition({
				name: 'Transfer Test Credential',
				type: 'httpBasicAuth',
				data: { user: 'user', password: 'pass' },
				projectId: sourceProject.id,
			});

			const sourceCredentials = await api.credentialApi.getCredentialsForWorkflow({
				projectId: sourceProject.id,
			});
			const foundInSource = sourceCredentials.find((c) => c.id === credential.credentialId);
			expect(foundInSource).toBeDefined();

			await api.credentialApi.transferCredential(credential.credentialId, destinationProject.id);

			const destinationCredentials = await api.credentialApi.getCredentialsForWorkflow({
				projectId: destinationProject.id,
			});
			const foundInDestination = destinationCredentials.find(
				(c) => c.id === credential.credentialId,
			);
			expect(foundInDestination).toBeDefined();

			const sourceCredentialsAfter = await api.credentialApi.getCredentialsForWorkflow({
				projectId: sourceProject.id,
			});
			const stillInSource = sourceCredentialsAfter.find((c) => c.id === credential.credentialId);
			expect(stillInSource).toBeUndefined();
		});
	});

	test.describe('Data Persistence', () => {
		test('should maintain credential data across operations', async ({ api }) => {
			const originalData: CreateCredentialDto = {
				name: 'Persistence Test Credential',
				type: 'httpBasicAuth',
				data: {
					user: 'persistent_user',
					password: 'persistent_password',
				},
			};

			const { credentialId } = await api.credentialApi.createCredentialFromDefinition(originalData);

			const afterCreate = await api.credentialApi.getCredential(credentialId, {
				includeData: true,
			});
			expect(afterCreate.data?.user).toBe('persistent_user');

			await api.credentialApi.updateCredential(credentialId, {
				data: {
					user: 'updated_persistent_user',
					password: 'updated_persistent_password',
				},
			});

			const afterUpdate = await api.credentialApi.getCredential(credentialId, {
				includeData: true,
			});
			expect(afterUpdate.data?.user).toBe('updated_persistent_user');
			expect(afterUpdate.data?.password).toBeDefined();

			const allCredentials = await api.credentialApi.getCredentials();
			const foundCredential = allCredentials.find((c) => c.id === credentialId);
			expect(foundCredential).toBeDefined();
			expect(foundCredential!.type).toBe('httpBasicAuth');
		});
	});
});
