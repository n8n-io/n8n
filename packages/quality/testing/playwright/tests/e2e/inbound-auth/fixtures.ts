import type { McpScope } from '@n8n/api-types';
import type { ApiKeyScope } from '@n8n/permissions';
import { request, type APIResponse } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import { test as base, expect } from '../../../fixtures/base';
import { ApiHelpers } from '../../../services/api-helper';
import type {
	TrustedSource,
	TrustedSourceInput,
} from '../../../services/trusted-source-api-helper';
import type { TestUser } from '../../../services/user-api-helper';

/**
 * Shared setup for the inbound auth suite: every spec runs the same checks for
 * the internal trusted source and for Keycloak as an external one.
 */

export const SOURCE_KINDS = ['n8n-internal', 'keycloak'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

// The fixed id of the built-in source (`SYSTEM_TRUSTED_SOURCE_ID` in the cli package).
// A kind is only a label: the Keycloak source gets a generated id.
const INTERNAL_SOURCE_ID = 'n8n-internal';

/** One trusted source as a spec sees it. Specs never branch on `kind`. */
export interface SourceUnderTest {
	kind: SourceKind;
	/** The issuer that resource metadata must list. */
	issuer: string;
	/** A bearer token for the member. Only the internal source uses `resource`. */
	bearerFor(resource?: string): Promise<string>;
	/** Checks that the member has one identity binding. The internal source binds none. */
	expectBinding(): Promise<void>;
}

interface SuiteSetup {
	member: TestUser;
	internalSource: TrustedSource;
	keycloakSource: TrustedSource;
}

type InboundAuthWorkerFixtures = {
	suiteSetup: SuiteSetup;
};

type InboundAuthFixtures = {
	/** The n8n member that both sources resolve to. */
	member: TestUser;
	/** Signed in as the member: creates the member's workflows and mints internal tokens. */
	memberApi: ApiHelpers;
	/**
	 * No session. Every surface call goes through it: a session cookie would
	 * authenticate the public API before the bearer token does.
	 */
	caller: ApiHelpers;
	sources: Record<SourceKind, SourceUnderTest>;
};

function keycloakSourceInput(keycloak: ServiceHelpers['keycloak']): TrustedSourceInput {
	// Keycloak ignores the RFC 8707 `resource` parameter, so `aud` is the realm's fixed audience.
	const surface = { audiences: [keycloak.audience] };
	return {
		name: 'Keycloak e2e',
		issuer: keycloak.issuer,
		config: {
			version: 1,
			authentication: {
				type: 'oauth2',
				discovery: { mode: 'manual', metadataUrl: keycloak.internalDiscoveryUrl },
			},
			surfaces: { 'public-api': surface, 'instance-mcp': surface },
			// User tokens carry `azp`, not `client_id`, and instance MCP needs a client id.
			identity: { claimMapping: { clientId: 'azp' } },
		},
	};
}

export const test = base.extend<InboundAuthFixtures, InboundAuthWorkerFixtures>({
	suiteSetup: [
		async ({ n8nContainer, backendUrl, dbSetup }, use) => {
			// The worker's database reset runs first, so it cannot drop the member or the source.
			void dbSetup;
			if (!n8nContainer) {
				// Local runs have no stack, and `containerRequirement` skips every test.
				await use(null!);
				return;
			}

			const context = await request.newContext({ baseURL: backendUrl });
			let setup: SuiteSetup;
			try {
				const owner = new ApiHelpers(context);
				await owner.signin('owner');
				await owner.enableFeature('trustedSourceManage');
				// The internal source's OAuth endpoints and instance MCP need MCP access.
				await owner.setMcpAccess(true);

				const { keycloak } = n8nContainer.services;
				// Instance MCP lists only the tools that an MCP scope in the token unlocks.
				const mcpScope: McpScope = 'workflow:read';
				// The public API narrows the grant to the API key scopes in the token. Listing needs this one.
				const publicApiScope: ApiKeyScope = 'workflow:list';
				await keycloak.addDefaultClientScopes([mcpScope, publicApiScope]);
				const created = await owner.trustedSources.create(keycloakSourceInput(keycloak));
				const internalSource = await owner.trustedSources.get(INTERNAL_SOURCE_ID);
				const keycloakSource = await owner.trustedSources.waitUntilHealthy(created.id);

				// n8n never links the owner by email, so the Keycloak user needs a member to link to.
				// Last step: accepting the invitation signs this context in as the member.
				const member = await owner.users.create({
					email: keycloak.testUser.email,
					firstName: keycloak.testUser.firstName,
					lastName: keycloak.testUser.lastName,
				});
				setup = { member, internalSource, keycloakSource };
			} finally {
				await context.dispose();
			}
			await use(setup);
		},
		// Auto: a test that uses only `caller` still needs MCP access and the Keycloak source.
		// Discovery can wait for a scheduled run (see waitUntilHealthy), so allow more than one test's time.
		{ scope: 'worker', auto: true, timeout: 120_000 },
	],

	member: async ({ suiteSetup }, use) => {
		await use(suiteSetup.member);
	},

	memberApi: async ({ api, backendUrl, member }, use) => {
		const context = await request.newContext({ baseURL: backendUrl });
		const memberApi = new ApiHelpers(context, api.options);
		await memberApi.login(member);
		await use(memberApi);
		await context.dispose();
	},

	caller: async ({ api, backendUrl }, use) => {
		const context = await request.newContext({ baseURL: backendUrl });
		await use(new ApiHelpers(context, api.options));
		await context.dispose();
	},

	sources: async ({ suiteSetup, member, memberApi, services }, use) => {
		const { internalSource, keycloakSource } = suiteSetup;
		const { keycloak } = services;

		await use({
			'n8n-internal': {
				kind: 'n8n-internal',
				issuer: internalSource.issuer,
				bearerFor: async (resource) =>
					(await memberApi.mcpOauth.completeAuthorizationCodeFlow({ resource })).tokens
						.access_token,
				// The internal source resolves the user from the token and stores no binding.
				expectBinding: async () => {},
			},
			keycloak: {
				kind: 'keycloak',
				issuer: keycloakSource.issuer,
				bearerFor: async () =>
					await keycloak.getAccessToken(keycloak.testUser.email, keycloak.testUser.password),
				expectBinding: async () => {
					// One binding, made by the email link, and the same one on every surface.
					expect(keycloakSource.id).toMatch(/^[\w-]+$/);
					const output = await services.postgres.exec(
						`SELECT "userId", provenance, status FROM trusted_source_identity WHERE "sourceId" = '${keycloakSource.id}';`,
					);
					const rows = output
						.trim()
						.split('\n')
						.filter(Boolean)
						.map((line) => line.split('\t'));
					expect(rows).toEqual([[member.id, 'claim-match', 'active']]);
				},
			},
		});
	},
});

export { expect };

/** RFC 9728 protected resource metadata, as n8n serves it. */
export interface ResourceMetadata {
	resource: string;
	authorization_servers: string[];
}

/**
 * Polls the resource metadata until n8n serves it. A trigger registers its
 * resource after activation returns, so the first requests can get a 404.
 */
export async function waitForResourceMetadata(
	api: ApiHelpers,
	resourcePath: string,
): Promise<ResourceMetadata> {
	let metadata: ResourceMetadata | undefined;
	await expect
		.poll(
			async () => {
				const response = await api.mcpOauth.getProtectedResourceMetadata(resourcePath);
				if (response.status() === 200) metadata = (await response.json()) as ResourceMetadata;
				return response.status();
			},
			{ timeout: 20_000, intervals: [500, 1000, 2000] },
		)
		.toBe(200);
	return metadata!;
}

/** The metadata URL that a challenge for this resource names (RFC 9728 section 3.1). */
function resourceMetadataUrl(resource: string): string {
	const url = new URL(resource);
	return `${url.origin}/.well-known/oauth-protected-resource${url.pathname}${url.search}`;
}

/** A 401 for a request with no credential: the challenge names the resource metadata and no error. */
export function expectNoCredentialChallenge(response: APIResponse, resource: string): void {
	expect(response.status()).toBe(401);
	const challenge = response.headers()['www-authenticate'];
	expect(challenge).toContain(`resource_metadata="${resourceMetadataUrl(resource)}"`);
	expect(challenge).not.toContain('error=');
}
