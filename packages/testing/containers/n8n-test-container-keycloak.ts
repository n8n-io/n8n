import getPort from 'get-port';
import { setTimeout as wait } from 'node:timers/promises';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';
import { Agent } from 'undici';

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
	/** PEM-encoded CA certificate for the Keycloak HTTPS server */
	certPem: string;
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

/** Path where the CA certificate is exported in PEM format inside the container */
const KEYCLOAK_CERT_PATH = '/tmp/keycloak-ca.pem';

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

/**
 * Setup Keycloak container for OIDC testing.
 * Uses HTTPS with self-signed certificate generated via Java keytool.
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
			.withExposedPorts({ container: httpsPort, host: allocatedHostPort })
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
				'com.docker.compose.service': 'keycloak',
			})
			.withName(`${projectName}-keycloak`)
			.withLogConsumer(consumer)
			.withReuse()
			.start();

		const discoveryUrl = `https://localhost:${allocatedHostPort}/realms/${KEYCLOAK_TEST_REALM}/.well-known/openid-configuration`;
		const internalDiscoveryUrl = `https://${hostname}:${httpsPort}/realms/${KEYCLOAK_TEST_REALM}/.well-known/openid-configuration`;

		const certPem = await extractCertificate(container);
		await waitForKeycloakReady(allocatedHostPort, certPem);

		return {
			container,
			discoveryUrl,
			internalDiscoveryUrl,
			certPem,
		};
	} catch (error) {
		return throwWithLogs(error);
	}
}

/** Extract the CA certificate from the Keycloak container. */
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

/** Poll the Keycloak HTTPS discovery endpoint until it's ready. */
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
}

/** Poll Keycloak discovery endpoint from inside an n8n container. */
export async function waitForKeycloakFromContainer(
	n8nContainer: StartedTestContainer,
	discoveryUrl: string,
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
				discoveryUrl,
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
		`Keycloak discovery endpoint not reachable from n8n container within ${timeoutMs}ms: ${discoveryUrl}`,
	);
}

/** Path where the CA certificate will be mounted in n8n containers */
export const N8N_KEYCLOAK_CERT_PATH = '/tmp/keycloak-ca.pem';

/** Get environment variables to configure n8n for OIDC with Keycloak. */
export function getKeycloakN8nEnvironment(
	hostname = 'keycloak',
	certPath = N8N_KEYCLOAK_CERT_PATH,
): Record<string, string> {
	return {
		NODE_EXTRA_CA_CERTS: certPath,
		NO_PROXY: `localhost,127.0.0.1,${hostname},host.docker.internal`,
	};
}
