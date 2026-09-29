import { nanoid } from 'nanoid';

import { expect, test } from '../../../../fixtures/base';

test.use({ capability: { services: ['vault'] } });
test.setTimeout(90_000);

test.describe(
	'HashiCorp Vault @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		test('syncs secrets after batch token expiry and recovers from a failed AppRole login', async ({
			api,
			services,
		}) => {
			const { vault } = services;
			const roleName = `n8n-${nanoid()}`;
			const settings = await vault.createBatchAppRole(roleName);
			await vault.writeSecret(roleName, { initial: 'initial-value' });
			await api.enableFeature('externalSecrets');
			await api.externalSecrets.saveProviderSettings('vault', settings);
			await api.externalSecrets.connectProvider('vault');
			await expect
				.poll(async () => await api.externalSecrets.getProviderState('vault'))
				.toBe('connected');
			await api.externalSecrets.updateProvider('vault');
			expect(await api.externalSecrets.getSecrets('vault')).toContain(`secret.${roleName}.initial`);

			const tokenIssuedAfterConnect = await vault.login(settings.roleId, settings.secretId);
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

			const tokenIssuedBeforeLoginFailure = await vault.login(settings.roleId, settings.secretId);
			await vault.setRoleId(roleName, nanoid());
			await expect
				.poll(async () => await api.externalSecrets.getProviderState('vault'), { timeout: 15_000 })
				.toBe('error');
			await expect
				.poll(async () => await vault.getTokenStatus(tokenIssuedBeforeLoginFailure.client_token), {
					timeout: 15_000,
				})
				.toBe(403);

			await vault.setRoleId(roleName, settings.roleId);
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
