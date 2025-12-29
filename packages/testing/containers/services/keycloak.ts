import getPort from 'get-port';
import { setTimeout as wait } from 'node:timers/promises';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';
import { Agent } from 'undici';

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

	env(): Record<string, string> {
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
