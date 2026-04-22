import getPort from 'get-port';
import { setTimeout as wait } from 'node:timers/promises';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';
import { Agent, request as undiciRequest } from 'undici';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { FileToMount, HelperContext, Service, ServiceResult } from './types';

const HOSTNAME = 'keycloak';
const HTTPS_PORT = 8443;

const KEYCLOAK_TEST_REALM = 'test';
const KEYCLOAK_TEST_CLIENT_ID = 'n8n-e2e';
const KEYCLOAK_TEST_CLIENT_SECRET = 'n8n-test-secret';
const KEYCLOAK_TEST_USER_EMAIL = 'test@n8n.io';
const KEYCLOAK_TEST_USER_PASSWORD = 'testpassword';
const KEYCLOAK_TEST_USER_FIRSTNAME = 'Test';
const KEYCLOAK_TEST_USER_LASTNAME = 'User';

const KEYCLOAK_ADMIN_USER = 'admin';
const KEYCLOAK_ADMIN_PASSWORD = 'admin';
const KEYCLOAK_CERT_PATH = '/tmp/keycloak-ca.pem';
const N8N_KEYCLOAK_CERT_PATH = '/tmp/keycloak-ca.pem';

export interface KeycloakConfig {
	n8nCallbackUrl: string;
}

export interface KeycloakMeta {
	discoveryUrl: string;
	internalDiscoveryUrl: string;
	certPem: string;
	hostPort: number;
	clientId: string;
	clientSecret: string;
	testUser: {
		email: string;
		password: string;
		firstName: string;
		lastName: string;
	};
	n8nFilesToMount: FileToMount[];
}

export type KeycloakResult = ServiceResult<KeycloakMeta>;

function generateRealmJson(callbackUrl: string): string {
	// Derive the n8n base URL from the OIDC callback URL
	const n8nBaseUrl = callbackUrl.split('/rest/')[0];
	return JSON.stringify({
		realm: KEYCLOAK_TEST_REALM,
		enabled: true,
		sslRequired: 'none',
		registrationAllowed: false,
		loginWithEmailAllowed: true,
		duplicateEmailsAllowed: false,
		resetPasswordAllowed: false,
		editUsernameAllowed: false,
		bruteForceProtected: false,
		clients: [
			{
				clientId: KEYCLOAK_TEST_CLIENT_ID,
				enabled: true,
				clientAuthenticatorType: 'client-secret',
				secret: KEYCLOAK_TEST_CLIENT_SECRET,
				redirectUris: [
					callbackUrl,
					`${callbackUrl}/*`,
					// Allow the n8n OAuth2 credential callback for dynamic credential authorization flow
					`${n8nBaseUrl}/rest/oauth2-credential/callback`,
				],
				webOrigins: ['*'],
				standardFlowEnabled: true,
				directAccessGrantsEnabled: true,
				publicClient: false,
				protocol: 'openid-connect',
			},
		],
		users: [
			{
				username: 'testuser',
				enabled: true,
				email: KEYCLOAK_TEST_USER_EMAIL,
				emailVerified: true,
				firstName: KEYCLOAK_TEST_USER_FIRSTNAME,
				lastName: KEYCLOAK_TEST_USER_LASTNAME,
				credentials: [
					{
						type: 'password',
						value: KEYCLOAK_TEST_USER_PASSWORD,
						temporary: false,
					},
				],
			},
		],
	});
}

/**
 * Generates a shell script that creates a keystore with self-signed cert using Java keytool,
 * exports the certificate to PEM format, and starts Keycloak with HTTPS.
 */
function generateStartupScript(): string {
	return `#!/bin/bash
set -e

# Generate self-signed certificate using Java keytool (available in Keycloak image)
keytool -genkeypair \\
  -storepass password \\
  -storetype PKCS12 \\
  -keyalg RSA \\
  -keysize 2048 \\
  -dname "CN=localhost" \\
  -alias server \\
  -ext "SAN=DNS:localhost,DNS:keycloak,IP:127.0.0.1" \\
  -keystore /opt/keycloak/conf/server.keystore

# Export the certificate to PEM format for Node.js NODE_EXTRA_CA_CERTS
keytool -exportcert \\
  -alias server \\
  -keystore /opt/keycloak/conf/server.keystore \\
  -rfc \\
  -file ${KEYCLOAK_CERT_PATH} \\
  -storepass password

exec /opt/keycloak/bin/kc.sh start-dev \\
  --import-realm \\
  --https-key-store-file=/opt/keycloak/conf/server.keystore \\
  --https-key-store-password=password \\
  --hostname=https://localhost:\${KEYCLOAK_HOST_PORT} \\
  --hostname-backchannel-dynamic=true
`;
}

async function extractCertificate(
	container: StartedTestContainer,
	timeoutMs: number = 30000,
): Promise<string> {
	const startTime = Date.now();
	const retryIntervalMs = 500;

	while (Date.now() - startTime < timeoutMs) {
		try {
			const certResult = await container.exec(['cat', KEYCLOAK_CERT_PATH]);
			if (certResult.exitCode === 0 && certResult.output.includes('BEGIN CERTIFICATE')) {
				return certResult.output;
			}
		} catch {
			// Retry on error
		}
		await wait(retryIntervalMs);
	}

	throw new Error(
		`Failed to extract Keycloak certificate from ${KEYCLOAK_CERT_PATH} within ${timeoutMs}ms`,
	);
}

async function waitForKeycloakReady(
	port: number,
	certPem: string,
	timeoutMs: number = 60000,
): Promise<void> {
	const startTime = Date.now();
	const url = `https://localhost:${port}/realms/${KEYCLOAK_TEST_REALM}/.well-known/openid-configuration`;
	const retryIntervalMs = 2000;

	const agent = new Agent({
		connect: { ca: certPem },
	});

	try {
		while (Date.now() - startTime < timeoutMs) {
			try {
				const response = await fetch(url, {
					// @ts-expect-error - dispatcher is an undici-specific option
					dispatcher: agent,
				});
				if (response.ok) {
					return;
				}
			} catch {
				// Retry on connection errors
			}

			await wait(retryIntervalMs);
		}

		throw new Error(
			`Keycloak discovery endpoint at ${url} did not become ready within ${timeoutMs / 1000} seconds`,
		);
	} finally {
		await agent.close();
	}
}

export const keycloak: Service<KeycloakResult> = {
	description: 'Keycloak OIDC provider',

	getOptions(ctx) {
		const port = ctx.allocatedPorts.loadBalancer ?? ctx.allocatedPorts.main;
		return { n8nCallbackUrl: `http://localhost:${port}/rest/sso/oidc/callback` } as KeycloakConfig;
	},

	async verifyFromN8n(result, n8nContainers) {
		const { setTimeout: wait } = await import('node:timers/promises');
		const timeoutMs = 30000;
		const retryIntervalMs = 1000;

		for (const container of n8nContainers) {
			const startTime = Date.now();
			let verified = false;

			while (Date.now() - startTime < timeoutMs) {
				try {
					const execResult = await container.exec([
						'wget',
						'--no-check-certificate',
						'-q',
						'-O',
						'-',
						result.meta.internalDiscoveryUrl,
					]);
					if (execResult.exitCode === 0) {
						verified = true;
						break;
					}
				} catch {
					// Retry
				}
				await wait(retryIntervalMs);
			}

			if (!verified) {
				throw new Error(
					`Keycloak verification failed: ${container.getName()} could not reach ${result.meta.internalDiscoveryUrl} within ${timeoutMs}ms`,
				);
			}
		}
	},

	async start(
		network: StartedNetwork,
		projectName: string,
		config?: unknown,
	): Promise<KeycloakResult> {
		const { n8nCallbackUrl } = config as KeycloakConfig;
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		// Allocate a fixed host port for Keycloak
		const allocatedHostPort = await getPort();

		const realmJson = generateRealmJson(n8nCallbackUrl);
		const startupScript = generateStartupScript();

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.keycloak)
				.withNetwork(network)
				.withNetworkAliases(HOSTNAME)
				.withExposedPorts({ container: HTTPS_PORT, host: allocatedHostPort })
				.withEnvironment({
					KEYCLOAK_ADMIN: KEYCLOAK_ADMIN_USER,
					KEYCLOAK_ADMIN_PASSWORD,
					KC_HEALTH_ENABLED: 'true',
					KC_METRICS_ENABLED: 'false',
					KEYCLOAK_HOST_PORT: String(allocatedHostPort),
				})
				.withCopyContentToContainer([
					{ content: realmJson, target: '/opt/keycloak/data/import/realm.json' },
					{ content: startupScript, target: '/startup.sh', mode: 0o755 },
				])
				.withEntrypoint(['/bin/bash', '/startup.sh'])
				.withWaitStrategy(
					Wait.forLogMessage(/Running the server in development mode/).withStartupTimeout(120000),
				)
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': HOSTNAME,
				})
				.withName(`${projectName}-${HOSTNAME}`)
				.withLogConsumer(consumer)
				.withReuse()
				.start();

			const discoveryUrl = `https://localhost:${allocatedHostPort}/realms/${KEYCLOAK_TEST_REALM}/.well-known/openid-configuration`;
			const internalDiscoveryUrl = `https://${HOSTNAME}:${HTTPS_PORT}/realms/${KEYCLOAK_TEST_REALM}/.well-known/openid-configuration`;

			const certPem = await extractCertificate(container);
			await waitForKeycloakReady(allocatedHostPort, certPem);

			return {
				container,
				meta: {
					discoveryUrl,
					internalDiscoveryUrl,
					certPem,
					hostPort: allocatedHostPort,
					clientId: KEYCLOAK_TEST_CLIENT_ID,
					clientSecret: KEYCLOAK_TEST_CLIENT_SECRET,
					testUser: {
						email: KEYCLOAK_TEST_USER_EMAIL,
						password: KEYCLOAK_TEST_USER_PASSWORD,
						firstName: KEYCLOAK_TEST_USER_FIRSTNAME,
						lastName: KEYCLOAK_TEST_USER_LASTNAME,
					},
					n8nFilesToMount: [{ content: certPem, target: N8N_KEYCLOAK_CERT_PATH }],
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},

	env(result: KeycloakResult, external?: boolean): Record<string, string> {
		if (external) {
			return {
				N8N_OIDC_DISCOVERY_URL: result.meta.discoveryUrl,
				N8N_OIDC_CLIENT_ID: result.meta.clientId,
				N8N_OIDC_CLIENT_SECRET: result.meta.clientSecret,
			};
		}
		return {
			NODE_EXTRA_CA_CERTS: N8N_KEYCLOAK_CERT_PATH,
			NO_PROXY: `localhost,127.0.0.1,${HOSTNAME},host.docker.internal`,
		};
	},
};

export class KeycloakHelper {
	private readonly meta: KeycloakMeta;

	constructor(_container: StartedTestContainer, meta: KeycloakMeta) {
		this.meta = meta;
	}

	get discoveryUrl(): string {
		return this.meta.discoveryUrl;
	}

	get internalDiscoveryUrl(): string {
		return this.meta.internalDiscoveryUrl;
	}

	get certPem(): string {
		return this.meta.certPem;
	}

	get hostPort(): number {
		return this.meta.hostPort;
	}

	get realm(): string {
		return KEYCLOAK_TEST_REALM;
	}

	get clientId(): string {
		return this.meta.clientId;
	}

	get clientSecret(): string {
		return this.meta.clientSecret;
	}

	get testUser() {
		return this.meta.testUser;
	}

	/**
	 * Obtain an access token for a user via the Resource Owner Password Credentials (ROPC) grant.
	 * Keycloak's test realm has directAccessGrantsEnabled=true, so no browser redirect is needed.
	 */
	async getAccessToken(email: string, password: string): Promise<string> {
		const tokenEndpoint = `https://localhost:${this.meta.hostPort}/realms/${KEYCLOAK_TEST_REALM}/protocol/openid-connect/token`;
		const agent = new Agent({ connect: { ca: this.meta.certPem } });

		const body = new URLSearchParams({
			grant_type: 'password',
			client_id: KEYCLOAK_TEST_CLIENT_ID,
			client_secret: KEYCLOAK_TEST_CLIENT_SECRET,
			username: email,
			password,
			scope: 'openid',
		});

		try {
			const response = await fetch(tokenEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: body.toString(),
				// @ts-expect-error - dispatcher is an undici-specific option
				dispatcher: agent,
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`Keycloak token request failed (${response.status}): ${text}`);
			}

			const data = (await response.json()) as { access_token: string };
			return data.access_token;
		} finally {
			await agent.close();
		}
	}

	/**
	 * Programmatically completes the OAuth2 authorization code flow for the test user.
	 * Uses undici (with the Keycloak CA cert) to:
	 *   1. GET the Keycloak authorization page
	 *   2. Extract the login form action URL
	 *   3. POST test user credentials to Keycloak
	 *
	 * Returns the n8n OAuth2 callback URL (with `code` and `state` query params).
	 * The caller should then GET this URL using the n8n API request context (which holds
	 * the n8n session cookie) so that n8n exchanges the code for tokens and stores them.
	 */
	async completeAuthorizationCodeFlow(authorizationUrl: string): Promise<string> {
		const agent = new Agent({ connect: { ca: this.meta.certPem } });

		try {
			// Step 1: GET the Keycloak authorization page (HTML with login form).
			// Use undiciRequest to access raw set-cookie headers for forwarding.
			const authPageResult = await undiciRequest(authorizationUrl, {
				method: 'GET',
				dispatcher: agent,
			});

			if (authPageResult.statusCode < 200 || authPageResult.statusCode >= 300) {
				await authPageResult.body.text();
				throw new Error(
					`Failed to load Keycloak authorization page: HTTP ${authPageResult.statusCode}`,
				);
			}

			// Extract session cookies from the response to forward with the login POST.
			// Keycloak sets cookies like AUTH_SESSION_ID, KC_RESTART that are required
			// for the login form submission to succeed.
			const rawCookies = authPageResult.headers['set-cookie'];
			const cookieHeader = (Array.isArray(rawCookies) ? rawCookies : [rawCookies])
				.filter(Boolean)
				.map((c) => (c as string).split(';')[0])
				.join('; ');

			const html = await authPageResult.body.text();

			// Step 2: Extract the Keycloak login form action URL.
			// Keycloak's login form action always contains 'login-actions/authenticate'.
			const rawFormAction = html.match(/action="([^"]*login-actions\/authenticate[^"]*)"/)?.[1];
			if (!rawFormAction) {
				throw new Error('Could not find Keycloak login form action in authorization page HTML');
			}
			const formAction = rawFormAction.replace(/&amp;/g, '&');

			// Step 3: POST credentials with session cookies — Keycloak responds with 302
			// to the n8n callback URL. undiciRequest does NOT follow redirects by default.
			const loginBody = new URLSearchParams({
				username: this.meta.testUser.email,
				password: this.meta.testUser.password,
			});

			const loginHeaders: Record<string, string> = {
				'Content-Type': 'application/x-www-form-urlencoded',
			};
			if (cookieHeader) {
				loginHeaders['Cookie'] = cookieHeader;
			}

			const { headers, body } = await undiciRequest(formAction, {
				method: 'POST',
				headers: loginHeaders,
				body: loginBody.toString(),
				dispatcher: agent,
			});

			// Consume the body to prevent resource leaks
			await body.text();

			const location = headers.location;
			const redirectUrl = Array.isArray(location) ? location[0] : location;

			if (!redirectUrl) {
				throw new Error(
					'Keycloak did not redirect after login. ' +
						'Ensure the OAuth2 credential callback URL is registered in Keycloak redirectUris.',
				);
			}

			return redirectUrl; // e.g. http://localhost:{n8n_port}/rest/oauth2-credential/callback?code=...&state=...
		} finally {
			await agent.close();
		}
	}

	async waitForFromContainer(
		n8nContainer: StartedTestContainer,
		timeoutMs: number = 30000,
	): Promise<void> {
		const startTime = Date.now();
		const retryIntervalMs = 1000;

		while (Date.now() - startTime < timeoutMs) {
			try {
				const result = await n8nContainer.exec([
					'wget',
					'--no-check-certificate',
					'-q',
					'-O',
					'-',
					this.meta.internalDiscoveryUrl,
				]);
				if (result.exitCode === 0) {
					return;
				}
			} catch {
				// Retry on error
			}
			await wait(retryIntervalMs);
		}

		throw new Error(
			`Keycloak discovery endpoint not reachable from n8n container within ${timeoutMs}ms: ${this.meta.internalDiscoveryUrl}`,
		);
	}
}

export function createKeycloakHelper(ctx: HelperContext): KeycloakHelper {
	const result = ctx.serviceResults.keycloak as KeycloakResult | undefined;
	if (!result) {
		throw new Error('Keycloak service not found in context');
	}
	return new KeycloakHelper(result.container, result.meta);
}

declare module './types' {
	interface ServiceHelpers {
		keycloak: KeycloakHelper;
	}
}
