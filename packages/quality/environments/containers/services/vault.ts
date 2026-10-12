import { randomUUID } from 'node:crypto';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

const PORT = 8200;
const HOSTNAME = 'vault';

type VaultResult = ServiceResult<{ apiUrl: string; rootToken: string }>;

export const vault: Service<VaultResult> = {
	description: 'HashiCorp Vault',
	async start(network, projectName, _options, ctx) {
		const rootToken = randomUUID();
		const container = await new GenericContainer(TEST_CONTAINER_IMAGES.vault)
			.withNetwork(network)
			.withNetworkAliases(HOSTNAME)
			.withExposedPorts(PORT)
			.withEnvironment({
				VAULT_DEV_ROOT_TOKEN_ID: rootToken,
				VAULT_DEV_LISTEN_ADDRESS: `0.0.0.0:${PORT}`,
			})
			.withWaitStrategy(Wait.forHttp('/v1/sys/health', PORT).forStatusCode(200))
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': HOSTNAME,
			})
			.withName(`${projectName}-${HOSTNAME}`)
			.start();
		ctx?.registerContainer?.(container);

		const apiUrl = `http://${container.getHost()}:${container.getMappedPort(PORT)}/v1/`;
		const response = await fetch(`${apiUrl}sys/auth/approle`, {
			method: 'POST',
			headers: { 'X-Vault-Token': rootToken, 'Content-Type': 'application/json' },
			body: JSON.stringify({ type: 'approle' }),
		});
		if (!response.ok) throw new Error(`Vault AppRole setup failed: ${response.status}`);

		return {
			container,
			meta: {
				apiUrl,
				rootToken,
			},
		};
	},
};

export class VaultHelper {
	readonly url = `http://${HOSTNAME}:${PORT}/v1/`;

	constructor(
		private readonly apiUrl: string,
		private readonly rootToken: string,
	) {}

	async createBatchAppRole(roleName: string) {
		await this.request(`sys/policies/acl/${roleName}`, {
			policy: 'path "secret/*" { capabilities = ["read", "list"] }',
		});
		await this.request(`auth/approle/role/${roleName}`, {
			token_type: 'batch',
			token_ttl: '10s',
			token_max_ttl: '10s',
			token_policies: [roleName],
		});
		const roleResponse = await this.request(`auth/approle/role/${roleName}/role-id`);
		const { data: role } = (await roleResponse.json()) as { data: { role_id: string } };
		const secretResponse = await this.request(`auth/approle/role/${roleName}/secret-id`, {});
		const { data: secret } = (await secretResponse.json()) as { data: { secret_id: string } };
		return {
			url: this.url,
			authMethod: 'appRole',
			roleId: role.role_id,
			secretId: secret.secret_id,
			kvMountPath: 'secret/',
			kvVersion: '2',
		};
	}

	async setRoleId(roleName: string, roleId: string): Promise<void> {
		await this.request(`auth/approle/role/${roleName}/role-id`, { role_id: roleId });
	}

	async writeSecret(name: string, data: Record<string, string>): Promise<void> {
		await this.request(`secret/data/${name}`, { data });
	}

	async login(roleId: string, secretId: string) {
		const response = await this.request('auth/approle/login', {
			role_id: roleId,
			secret_id: secretId,
		});
		const { auth } = (await response.json()) as {
			auth: { client_token: string; token_type: string; renewable: boolean };
		};
		return auth;
	}

	async getTokenStatus(token: string): Promise<number> {
		const response = await fetch(`${this.apiUrl}auth/token/lookup-self`, {
			headers: { 'X-Vault-Token': token },
		});
		await response.arrayBuffer();
		return response.status;
	}

	private async request(path: string, body?: Record<string, unknown>): Promise<Response> {
		const response = await fetch(`${this.apiUrl}${path}`, {
			method: body ? 'POST' : 'GET',
			headers: { 'X-Vault-Token': this.rootToken, 'Content-Type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined,
		});
		if (!response.ok) throw new Error(`Vault ${path} failed: ${response.status}`);
		return response;
	}
}

export function createVaultHelper(ctx: HelperContext): VaultHelper {
	const result = ctx.serviceResults.vault as VaultResult | undefined;
	if (!result) throw new Error('Vault service not found in context');
	return new VaultHelper(result.meta.apiUrl, result.meta.rootToken);
}

declare module './types' {
	interface ServiceHelpers {
		vault: VaultHelper;
	}
}
