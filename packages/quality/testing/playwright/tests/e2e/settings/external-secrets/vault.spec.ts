import { nanoid } from 'nanoid';

import { expect, test } from '../../../../fixtures/base';

test.use({ capability: { services: ['vault'] } });
test.setTimeout(90_000);

test.describe(
	'HashiCorp Vault @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		let roleName: string;
		let roleId: string;
		let secretId: string;

		test.beforeEach(async ({ api, services }) => {
			await api.enableFeature('externalSecrets');
			const { vault } = services;
			roleName = `n8n-${nanoid()}`;
			const settings = await vault.createBatchAppRole(roleName);
			roleId = settings.roleId;
			secretId = settings.secretId;
			await vault.writeSecret(roleName, { initial: 'initial-value' });
			await api.externalSecrets.saveProviderSettings('vault', settings);
			await api.externalSecrets.connectProvider('vault');
			await expect
				.poll(async () => await api.externalSecrets.getProviderState('vault'))
				.toBe('connected');
			await api.externalSecrets.updateProvider('vault');
			expect(await api.externalSecrets.getSecrets('vault')).toContain(`secret.${roleName}.initial`);
		});

		test.afterEach(async ({ api }) => {
			await api.externalSecrets.disconnectProvider('vault');
		});

		test('syncs secrets after batch token expiry', async ({ api, services }) => {
			const { vault } = services;
			const tokenIssuedAfterConnect = await vault.login(roleId, secretId);
			expect(tokenIssuedAfterConnect.token_type).toBe('batch');
			expect(tokenIssuedAfterConnect.renewable).toBe(false);
			await expect
				.poll(async () => await vault.getTokenStatus(tokenIssuedAfterConnect.client_token), {
					timeout: 15_000,
				})
				.toBe(403);

			await vault.writeSecret(roleName, { afterExpiry: 'fresh-value' });
			await api.externalSecrets.updateProvider('vault');
			expect(await api.externalSecrets.getSecrets('vault')).toContain(
				`secret.${roleName}.afterExpiry`,
			);
		});

		test('recovers from a failed AppRole login without losing cached secrets', async ({
			api,
			services,
		}) => {
			const { vault } = services;
			const tokenIssuedBeforeLoginFailure = await vault.login(roleId, secretId);
			await vault.setRoleId(roleName, nanoid());
			await expect
				.poll(async () => await api.externalSecrets.getProviderState('vault'), { timeout: 15_000 })
				.toBe('error');
			expect(await api.externalSecrets.getSecrets('vault')).toContain(`secret.${roleName}.initial`);
			await expect
				.poll(async () => await vault.getTokenStatus(tokenIssuedBeforeLoginFailure.client_token), {
					timeout: 15_000,
				})
				.toBe(403);

			await vault.setRoleId(roleName, roleId);
			await expect
				.poll(async () => await api.externalSecrets.getProviderState('vault'), { timeout: 35_000 })
				.toBe('connected');
			await vault.writeSecret(roleName, { afterRecovery: 'recovered-value' });
			await api.externalSecrets.updateProvider('vault');
			expect(await api.externalSecrets.getSecrets('vault')).toContain(
				`secret.${roleName}.afterRecovery`,
			);
		});
	},
);
