import getPort from 'get-port';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from './n8n-test-container-utils';
import { TEST_CONTAINER_IMAGES } from './test-containers';

// Keycloak test configuration constants
export const KEYCLOAK_TEST_REALM = 'test';
export const KEYCLOAK_TEST_CLIENT_ID = 'n8n-e2e';
export const KEYCLOAK_TEST_CLIENT_SECRET = 'n8n-test-secret';
export const KEYCLOAK_TEST_USER_EMAIL = 'test@n8n.io';
export const KEYCLOAK_TEST_USER_PASSWORD = 'testpassword';
export const KEYCLOAK_TEST_USER_FIRSTNAME = 'Test';
export const KEYCLOAK_TEST_USER_LASTNAME = 'User';

const KEYCLOAK_ADMIN_USER = 'admin';
const KEYCLOAK_ADMIN_PASSWORD = 'admin';

export interface KeycloakSetupResult {
	container: StartedTestContainer;
	discoveryUrl: string;
	internalDiscoveryUrl: string;
}

/**
 * Generates the realm import JSON for Keycloak with the test client and user.
 * @param callbackUrl The callback URL for the n8n OIDC client
 */
function generateRealmJson(callbackUrl: string): string {
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
				redirectUris: [callbackUrl, `${callbackUrl}/*`],
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
 * Generates a shell script that creates a keystore with self-signed cert using Java keytool
 * and starts Keycloak with HTTPS.
 *
 * KC_HOSTNAME is set to localhost:{hostPort} - the frontend URL that browser uses.
 * hostname-backchannel-dynamic=true allows n8n container to access via keycloak:8443.
 * The issuer in tokens will be localhost:{hostPort}, matching what browser expects.
 */
function generateStartupScript(): string {
	return `#!/bin/bash
set -e

# Generate self-signed certificate using Java keytool (available in Keycloak image)
# Note: NODE_TLS_REJECT_UNAUTHORIZED=0 is set in tests, so cert validation is skipped
keytool -genkeypair \\
  -storepass password \\
  -storetype PKCS12 \\
  -keyalg RSA \\
  -keysize 2048 \\
  -dname "CN=localhost" \\
  -alias server \\
  -ext "SAN=DNS:localhost,DNS:keycloak,IP:127.0.0.1" \\
  -keystore /opt/keycloak/conf/server.keystore

# Start Keycloak with HTTPS using the generated keystore
# KC_HOSTNAME uses localhost:{hostPort} - the frontend URL that browser uses
# hostname-backchannel-dynamic=true allows n8n container to access via keycloak:8443
# The issuer in tokens will be localhost:{hostPort}, matching what browser expects
exec /opt/keycloak/bin/kc.sh start-dev \\
  --import-realm \\
  --https-key-store-file=/opt/keycloak/conf/server.keystore \\
  --https-key-store-password=password \\
  --hostname=https://localhost:\${KEYCLOAK_HOST_PORT} \\
  --hostname-backchannel-dynamic=true
`;
}

/**
 * Setup Keycloak container for OIDC testing.
 * Uses HTTPS with self-signed certificate generated via Java keytool.
 *
 * KC_HOSTNAME is set to localhost:{hostPort} (frontend URL for browser).
 * - Browser accesses via localhost:{hostPort} (matches KC_HOSTNAME, issuer in tokens)
 * - n8n container accesses via keycloak:8443 (Docker network alias)
 * - hostname-backchannel-dynamic=true allows n8n to use different hostname for backend requests
 *
 * @param projectName Project name for container naming
 * @param network The shared Docker network
 * @param n8nCallbackUrl The n8n OIDC callback URL
 * @returns Container and discovery URLs
 */
export async function setupKeycloak({
	projectName,
	network,
	n8nCallbackUrl,
}: {
	projectName: string;
	network: StartedNetwork;
	n8nCallbackUrl: string;
}): Promise<KeycloakSetupResult> {
	const { consumer, throwWithLogs } = createSilentLogConsumer();

	// Allocate a fixed host port for Keycloak
	const allocatedHostPort = await getPort();

	const realmJson = generateRealmJson(n8nCallbackUrl);
	const startupScript = generateStartupScript();

	const hostname = 'keycloak';
	const httpsPort = 8443;

	try {
		const container = await new GenericContainer(TEST_CONTAINER_IMAGES.keycloak)
			.withNetwork(network)
			.withNetworkAliases(hostname)
			// Bind container port 8443 to the pre-allocated host port
			.withExposedPorts({ container: httpsPort, host: allocatedHostPort })
			.withEnvironment({
				KEYCLOAK_ADMIN: KEYCLOAK_ADMIN_USER,
				KEYCLOAK_ADMIN_PASSWORD,
				KC_HEALTH_ENABLED: 'true',
				KC_METRICS_ENABLED: 'false',
				// Pass the host port to the startup script for KC_HOSTNAME
				KEYCLOAK_HOST_PORT: String(allocatedHostPort),
			})
			.withCopyContentToContainer([
				{
					content: realmJson,
					target: '/opt/keycloak/data/import/realm.json',
				},
				{
					content: startupScript,
					target: '/startup.sh',
					mode: 0o755,
				},
			])
			// Override entrypoint to run our startup script that generates certs
			.withEntrypoint(['/bin/bash', '/startup.sh'])
			.withWaitStrategy(
				Wait.forLogMessage(/Running the server in development mode/).withStartupTimeout(120000),
			)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'keycloak',
			})
			.withName(`${projectName}-keycloak`)
			.withLogConsumer(consumer)
			.start();

		// Browser uses localhost:{hostPort} to access Keycloak
		const discoveryUrl = `https://localhost:${allocatedHostPort}/realms/${KEYCLOAK_TEST_REALM}/.well-known/openid-configuration`;
		// n8n container uses Docker network alias keycloak:8443 (same network)
		const internalDiscoveryUrl = `https://keycloak:${httpsPort}/realms/${KEYCLOAK_TEST_REALM}/.well-known/openid-configuration`;

		// Wait for the discovery endpoint to be available (use localhost for host check)
		await waitForKeycloakReady(allocatedHostPort);

		console.log(`Keycloak discovery URL: ${discoveryUrl}`);

		return {
			container,
			discoveryUrl,
			internalDiscoveryUrl,
		};
	} catch (error) {
		return throwWithLogs(error);
	}
}

/**
 * Poll the Keycloak HTTPS discovery endpoint until it's ready.
 */
async function waitForKeycloakReady(port: number, timeoutMs: number = 60000): Promise<void> {
	const startTime = Date.now();
	// Use localhost for health check - this runs on the host machine where localhost works
	// (The actual OIDC URLs use host.docker.internal for cross-environment compatibility)
	const url = `https://localhost:${port}/realms/${KEYCLOAK_TEST_REALM}/.well-known/openid-configuration`;
	const retryIntervalMs = 2000;

	// Ignore self-signed certificate errors for this check
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

	while (Date.now() - startTime < timeoutMs) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {
			// Retry on connection errors
		}

		await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
	}

	console.warn(
		`WARNING: Keycloak discovery endpoint at ${url} did not return 200 within ${timeoutMs / 1000} seconds.`,
	);
}

/**
 * Poll Keycloak discovery endpoint from inside an n8n container.
 * This ensures Docker networking is ready before proceeding with OIDC configuration.
 * @param n8nContainer The started n8n container to exec into
 * @param discoveryUrl The Keycloak discovery URL to check
 * @param timeoutMs Maximum time to wait for connectivity (default 30s)
 */
export async function waitForKeycloakFromContainer(
	n8nContainer: StartedTestContainer,
	discoveryUrl: string,
	timeoutMs: number = 30000,
): Promise<void> {
	const startTime = Date.now();
	const retryIntervalMs = 1000;

	while (Date.now() - startTime < timeoutMs) {
		try {
			// Use wget since curl might not be available in n8n image
			// --no-check-certificate skips TLS verification for self-signed certs
			const result = await n8nContainer.exec([
				'wget',
				'--no-check-certificate',
				'-q',
				'-O',
				'-',
				discoveryUrl,
			]);
			if (result.exitCode === 0) {
				return; // Success - n8n container can reach Keycloak
			}
		} catch {
			// Retry on error
		}
		await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
	}

	throw new Error(
		`Keycloak discovery endpoint not reachable from n8n container within ${timeoutMs}ms: ${discoveryUrl}`,
	);
}

/**
 * Get environment variables to configure n8n for OIDC with Keycloak.
 * These should be added to the n8n container environment.
 */
export function getKeycloakN8nEnvironment(): Record<string, string> {
	return {
		// Enable E2E tests mode
		E2E_TESTS: 'true',
		// Accept self-signed certificates from Keycloak (test only!)
		NODE_TLS_REJECT_UNAUTHORIZED: '0',
		// Bypass proxy for all relevant hosts including host.docker.internal
		NO_PROXY: 'localhost,127.0.0.1,keycloak,host.docker.internal',
		// Clear any proxy settings that might interfere
		HTTP_PROXY: '',
		HTTPS_PROXY: '',
	};
}
