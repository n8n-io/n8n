import type { McpScope } from '@n8n/api-types';
import type { ApiKeyScope } from '@n8n/permissions';
import { request, type APIResponse } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

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
	/** The value a trigger stores in its `trustedSource` parameter. */
	id: string;
	/** The issuer that resource metadata must list. */
	issuer: string;
	/** Where a Form or Chat trigger sends a visitor without a session. */
	authorizationEndpoint: string;
	/** A webhook id for a Form or Chat trigger whose redirect login the source accepts. */
	loginWebhookId(trigger: 'form' | 'chat'): string;
	/** A bearer token for the member. Only the internal source uses `resource`. */
	bearerFor(resource?: string): Promise<string>;
	/** The request context that runs the redirect login and keeps its cookies. */
	visitor: ApiHelpers;
	/** Runs the login at the source. Returns the n8n callback URL with `code` and `state`. */
	login(authorizationUrl: string): Promise<string>;
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
	/**
	 * Signed in as the member: creates the member's workflows, mints internal
	 * tokens and approves consent.
	 */
	memberApi: ApiHelpers;
	/**
	 * No session. Every surface call goes through it: a session cookie would
	 * authenticate the public API and a Chat POST before the bearer token does.
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
				// The Form and Chat trigger logins exchange the code with this client.
				client: {
					kind: 'registered',
					clientId: keycloak.clientId,
					clientSecret: keycloak.clientSecret,
				},
			},
			surfaces: { 'public-api': surface, 'instance-mcp': surface, trigger: surface },
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
				// The trigger specs share a workflow with the member.
				await owner.enableFeature('sharing');
				// The internal source's OAuth endpoints and instance MCP need MCP access.
				await owner.setMcpAccess(true);

				const { keycloak } = n8nContainer.services;
				// Instance MCP lists only the tools that an MCP scope in the token unlocks.
				const mcpScope: McpScope = 'workflow:read';
				// The public API narrows the grant to the API key scopes in the token. Listing needs this one.
				const publicApiScope: ApiKeyScope = 'workflow:list';
				await keycloak.addDefaultClientScopes([mcpScope, publicApiScope]);
				const created = await owner.trustedSources.create(keycloakSourceInput(keycloak));
				// n8n checks the built-in source once at boot, in the background, and the gate refuses
				// it until a check passes.
				const internalSource = await owner.trustedSources.waitUntilHealthy(INTERNAL_SOURCE_ID);
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

	sources: async ({ suiteSetup, member, memberApi, caller, services }, use) => {
		const { internalSource, keycloakSource } = suiteSetup;
		const { keycloak } = services;

		await use({
			'n8n-internal': {
				id: internalSource.id,
				issuer: internalSource.issuer,
				authorizationEndpoint: `${internalSource.issuer.replace(/\/$/, '')}/mcp-oauth/authorize`,
				// n8n accepts any trigger URL of its own instance as a redirect URI.
				loginWebhookId: () => nanoid(),
				bearerFor: async (resource) =>
					(await memberApi.mcpOauth.completeAuthorizationCodeFlow({ resource })).tokens
						.access_token,
				// The consent step needs the member's session.
				visitor: memberApi,
				login: async (authorizationUrl) =>
					(await memberApi.mcpOauth.loginAtAuthorizeUrl(authorizationUrl)).href,
				// The internal source resolves the user from the token and stores no binding.
				expectBinding: async () => {},
			},
			keycloak: {
				id: keycloakSource.id,
				issuer: keycloakSource.issuer,
				authorizationEndpoint: keycloak.authorizationEndpoint,
				// The realm lists the exact trigger URLs that it accepts as redirect URIs.
				loginWebhookId: (trigger) => keycloak.triggerWebhookIds[trigger],
				bearerFor: async () =>
					await keycloak.getAccessToken(keycloak.testUser.email, keycloak.testUser.password),
				visitor: caller,
				login: async (authorizationUrl) =>
					await keycloak.completeAuthorizationCodeFlow(authorizationUrl),
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

function otherKind(kind: SourceKind): SourceKind {
	return kind === 'keycloak' ? 'n8n-internal' : 'keycloak';
}

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

/** A 401 for a valid token from a source that the resource does not accept. */
function expectSourceNotAccepted(response: APIResponse): void {
	expect(response.status()).toBe(401);
	const challenge = response.headers()['www-authenticate'];
	expect(challenge).toContain('error="invalid_token"');
	expect(challenge).toContain('error_description="source-not-accepted"');
}

/** A 403 for a resolved user who cannot execute the workflow. */
function expectInsufficientScope(response: APIResponse): void {
	expect(response.status()).toBe(403);
	expect(response.headers()['www-authenticate']).toContain('error="insufficient_scope"');
}

/** Reads a cookie from the request context's cookie jar. */
async function cookieValue(api: ApiHelpers, name: string): Promise<string | undefined> {
	const { cookies } = await api.request.storageState();
	const cookie = cookies.find((candidate) => candidate.name === name);
	return cookie && decodeURIComponent(cookie.value);
}

export interface PublishedTrigger {
	workflowId: string;
	/** The production path, for example `/webhook/<path>`. */
	path: string;
	/** The token audience for this trigger. */
	resource: string;
	/** The issuers that the trigger's resource metadata lists. */
	authorizationServers: string[];
}

async function publish(
	api: ApiHelpers,
	workflow: { workflowId: string; createdWorkflow: IWorkflowBase },
	path: string,
	metadataQuery = '',
): Promise<PublishedTrigger> {
	await api.workflows.activate(workflow.workflowId, workflow.createdWorkflow.versionId!);
	const metadata = await waitForResourceMetadata(api, `${path.slice(1)}${metadataQuery}`);
	return {
		workflowId: workflow.workflowId,
		path,
		resource: metadata.resource,
		authorizationServers: metadata.authorization_servers,
	};
}

/** A POST Webhook that accepts tokens from the source, for users who can execute the workflow. */
export async function publishWebhookTrigger(
	api: ApiHelpers,
	sourceId: string,
): Promise<PublishedTrigger> {
	const workflow = await api.workflows.createWorkflowFromDefinition({
		name: 'Inbound auth webhook',
		nodes: [
			{
				id: nanoid(),
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				// 2.1 is the last version whose n8nOAuth2 mode takes only a bearer token.
				typeVersion: 2.1,
				position: [0, 0],
				parameters: {
					httpMethod: 'POST',
					// Replaced with a unique path by createWorkflowFromDefinition
					path: 'inbound-auth',
					authentication: 'n8nOAuth2',
					requireExecuteAccess: true,
					trustedSource: sourceId,
					options: {},
				},
			},
		],
		connections: {},
	});
	return await publish(api, workflow, `/webhook/${workflow.webhookPath}`, '?method=POST');
}

/** An MCP server with an echo tool that accepts tokens from the source, for users who can execute the workflow. */
export async function publishMcpTrigger(
	api: ApiHelpers,
	sourceId: string,
): Promise<PublishedTrigger> {
	const workflow = await api.workflows.importWorkflowFromFile(
		'mcp-trigger/mcp-trigger-basic.json',
		{
			transform: (definition) => {
				const trigger = definition.nodes?.find((node) => node.name === 'MCP Server Trigger');
				Object.assign(trigger!.parameters, {
					authentication: 'n8nOAuth2',
					requireExecuteAccess: true,
					trustedSource: sourceId,
				});
				return definition;
			},
		},
	);
	// The import makes the trigger path unique, so read it back.
	const trigger = workflow.createdWorkflow.nodes.find((node) => node.name === 'MCP Server Trigger');
	return await publish(api, workflow, `/mcp/${trigger!.parameters.path as string}`);
}

export const FORM_TITLE = 'Inbound auth form';

/** A form whose visitors sign in at the source. With no `path`, the form path is the webhook id. */
export async function publishFormTrigger(
	api: ApiHelpers,
	sourceId: string,
	webhookId: string,
): Promise<PublishedTrigger> {
	const workflow = await api.workflows.createWorkflowFromDefinition(
		{
			name: `Inbound auth form ${nanoid()}`,
			nodes: [
				{
					id: nanoid(),
					name: 'On form submission',
					type: 'n8n-nodes-base.formTrigger',
					typeVersion: 2.6,
					position: [0, 0],
					webhookId,
					parameters: {
						formTitle: FORM_TITLE,
						formFields: { values: [{ fieldLabel: 'Name' }] },
						authentication: 'n8nUserAuth',
						trustedSource: sourceId,
						options: {},
					},
				},
			],
			connections: {},
		},
		// Keycloak accepts only the exact trigger URLs in its realm, so the webhook id stays fixed.
		{ makeUnique: false },
	);
	return await publish(api, workflow, `/form/${webhookId}`);
}

/** A hosted chat whose visitors sign in at the source. */
export async function publishChatTrigger(
	api: ApiHelpers,
	sourceId: string,
	webhookId: string,
): Promise<PublishedTrigger> {
	const workflow = await api.workflows.createWorkflowFromDefinition(
		{
			name: `Inbound auth chat ${nanoid()}`,
			nodes: [
				{
					id: nanoid(),
					name: 'When chat message received',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1.5,
					position: [0, 0],
					webhookId,
					parameters: {
						public: true,
						mode: 'hostedChat',
						authentication: 'n8nUserAuth',
						trustedSource: sourceId,
						options: {},
					},
				},
			],
			connections: {},
		},
		// Keycloak accepts only the exact trigger URLs in its realm, so the webhook id stays fixed.
		{ makeUnique: false },
	);
	return await publish(api, workflow, `/webhook/${webhookId}/chat`);
}

/** Runs the checks against a published trigger, then unpublishes it, also when a check fails. */
export async function withTrigger(
	api: ApiHelpers,
	published: Promise<PublishedTrigger>,
	run: (trigger: PublishedTrigger) => Promise<void>,
): Promise<void> {
	const trigger = await published;
	try {
		await run(trigger);
	} finally {
		await api.workflows.deactivate(trigger.workflowId);
	}
}

/**
 * Checks the execute gate of a trigger that has `requireExecuteAccess` on. The
 * same token runs the workflow while the member can execute it, and gets 403
 * `insufficient_scope` after the owner unshares the workflow.
 */
export async function expectExecuteGate(
	api: ApiHelpers,
	memberApi: ApiHelpers,
	source: SourceUnderTest,
	trigger: PublishedTrigger,
	calls: {
		/** Calls the trigger so that the workflow runs, and checks the answer. */
		run: (headers: Record<string, string>) => Promise<void>;
		/** Sends the first request of a call and returns the answer. */
		send: (headers: Record<string, string>) => Promise<APIResponse>;
	},
): Promise<void> {
	const memberProject = await memberApi.projects.getMyPersonalProject();
	// Share first: the internal server gives no token to a user who cannot execute the workflow.
	await api.workflows.shareWorkflow(trigger.workflowId, [memberProject.id]);
	const headers = { Authorization: `Bearer ${await source.bearerFor(trigger.resource)}` };

	await calls.run(headers);
	// The worker checks the grant again when it runs, so the run must end before the unshare.
	const executionStatuses = async () =>
		(await api.workflows.getExecutions(trigger.workflowId)).map(({ status }) => status);
	await expect.poll(executionStatuses, { timeout: 20_000 }).toEqual(['success']);

	await api.workflows.shareWorkflow(trigger.workflowId, []);
	expectInsufficientScope(await calls.send(headers));
	expect(await executionStatuses()).toEqual(['success']);
	await source.expectBinding();
}

/**
 * Checks what a trigger refuses before it runs. Its metadata lists only the
 * selected source, a request with no credential gets a challenge, and a valid
 * token from the other source gets `source-not-accepted`.
 */
export async function expectTriggerRefusals(
	api: ApiHelpers,
	trigger: PublishedTrigger,
	sources: Record<SourceKind, SourceUnderTest>,
	kind: SourceKind,
	send: (token?: string) => Promise<APIResponse>,
): Promise<void> {
	expect(trigger.authorizationServers).toEqual([sources[kind].issuer]);
	expectNoCredentialChallenge(await send(), trigger.resource);
	// A token for any resource will do: the pipeline refuses the source before it checks the audience.
	expectSourceNotAccepted(await send(await sources[otherKind(kind)].bearerFor()));
	expect(await api.workflows.getExecutions(trigger.workflowId)).toHaveLength(0);
}

/**
 * Runs the redirect login of a Form or Chat trigger as the source's visitor.
 * Returns the value of the one-hop cookie that carries the token to the clean
 * trigger URL. For Form, the value is the access token. For Chat, it is JSON
 * with the token and its expiry.
 */
export async function loginThroughTrigger(
	source: SourceUnderTest,
	trigger: PublishedTrigger,
	cookieName: string,
): Promise<string> {
	const { visitor } = source;

	const start = await visitor.webhooks.trigger(trigger.path, { maxRedirects: 0 });
	expect(start.status()).toBe(302);
	const authorizationUrl = new URL(start.headers().location, trigger.resource);
	expect(`${authorizationUrl.origin}${authorizationUrl.pathname}`).toBe(
		source.authorizationEndpoint,
	);
	// The trigger URL is both the redirect URI and the resource.
	expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(trigger.resource);

	const callbackUrl = new URL(await source.login(authorizationUrl.href));
	expect(`${callbackUrl.origin}${callbackUrl.pathname}`).toBe(trigger.resource);
	expect(callbackUrl.searchParams.has('code')).toBe(true);

	// n8n exchanges the code, keeps the token in a cookie and drops `code` from the URL.
	const exchanged = await visitor.webhooks.trigger(callbackUrl.href, { maxRedirects: 0 });
	expect(exchanged.status()).toBe(302);
	expect(new URL(exchanged.headers().location, trigger.resource).href).toBe(trigger.resource);
	const cookie = await cookieValue(visitor, cookieName);
	expect(cookie).toBeTruthy();
	return cookie!;
}
