import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from './n8n-test-container-utils';

export const DEFAULT_DEX_PORT = 5556;

const DEFAULT_CLIENT_ID = 'n8n-test-client';
const DEFAULT_CLIENT_SECRET = 'n8n-test-secret';
const DEFAULT_USER_EMAIL = 'test@n8n.io';
const DEFAULT_USER_PASSWORD = 'testpassword';

/**
 * Setup Dex OIDC provider container with default test client and user
 */
export async function setupDex({
	dexImage = 'dexidp/dex:v2.44.0',
	projectName,
	network,
	hostname = 'dex',
	port = DEFAULT_DEX_PORT,
	n8nCallbackPort,
}: {
	dexImage?: string;
	projectName: string;
	network: StartedNetwork;
	hostname?: string;
	port?: number;
	n8nCallbackPort?: number;
}): Promise<StartedTestContainer> {
	const { consumer, throwWithLogs } = createSilentLogConsumer();

	const config = generateDexConfig(port, projectName, n8nCallbackPort);

	try {
		const container = await new GenericContainer(dexImage)
			.withNetwork(network)
			.withNetworkAliases(hostname)
			// Map port to host so browser (Playwright) can access discovery endpoint
			.withExposedPorts({ container: port, host: port })
			.withEnvironment({
				DEX_LOG_LEVEL: 'debug',
			})
			.withCommand(['dex', 'serve', '/etc/dex/config.yaml'])
			.withCopyContentToContainer([
				{
					content: config,
					target: '/etc/dex/config.yaml',
				},
			])
			.withWaitStrategy(
				Wait.forAll([
					Wait.forListeningPorts(),
					Wait.forHttp('/.well-known/openid-configuration', port)
						.forStatusCode(200)
						.withStartupTimeout(30000),
				]),
			)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'dex',
			})
			.withName(`${projectName}-dex`)
			.withReuse()
			.withLogConsumer(consumer)
			.start();

		return container;
	} catch (error) {
		return throwWithLogs(error);
	}
}

/**
 * Get n8n environment variables for Dex OIDC configuration
 */
export function getDexEnvironment(
	hostname = 'dex',
	port = DEFAULT_DEX_PORT,
	clientId = DEFAULT_CLIENT_ID,
	clientSecret = DEFAULT_CLIENT_SECRET,
): Record<string, string> {
	return {
		N8N_SSO_OIDC_LOGIN_ENABLED: 'true',
		DEX_CLIENT_ID: clientId,
		DEX_CLIENT_SECRET: clientSecret,
		DEX_ISSUER_URL: `http://${hostname}:${port}`,
	};
}

/**
 * Get Dex discovery endpoint URL (external, for host/browser access)
 */
export function getDexDiscoveryUrl(
	container: StartedTestContainer,
	port = DEFAULT_DEX_PORT,
): string {
	return `http://${container.getHost()}:${container.getMappedPort(port)}/.well-known/openid-configuration`;
}

/**
 * Get Dex issuer URL (internal Docker network)
 */
export function getDexIssuerUrl(hostname = 'dex', port = DEFAULT_DEX_PORT): string {
	return `http://${hostname}:${port}`;
}

function generateDexConfig(_port: number, projectName: string, n8nCallbackPort?: number): string {
	const port = _port;
	const passwordHash = '$2y$10$tOVZ/rR/o4Z.kcL/heA43uhu76HRposBhQTe0XWfFSQtj2tn.b4Bi';

	const redirectURIs = [
		'http://host.docker.internal:5678/rest/sso/oidc/callback',
		'http://localhost:5678/rest/sso/oidc/callback',
		`http://${projectName}-n8n:5678/rest/sso/oidc/callback`,
	];

	if (n8nCallbackPort) {
		redirectURIs.push(`http://localhost:${n8nCallbackPort}/rest/sso/oidc/callback`);
	}

	return `
issuer: http://localhost:${port}

storage:
  type: memory

web:
  http: 0.0.0.0:${port}

oauth2:
  skipApprovalScreen: true

staticClients:
  - id: ${DEFAULT_CLIENT_ID}
    redirectURIs:
${redirectURIs.map((uri) => `      - '${uri}'`).join('\n')}
    name: 'n8n Test Client'
    secret: ${DEFAULT_CLIENT_SECRET}

enablePasswordDB: true

staticPasswords:
  - email: "${DEFAULT_USER_EMAIL}"
    hash: "${passwordHash}"
    username: "testuser"
    userID: "test-user-id-123"
`;
}

export const DEX_TEST_CLIENT_ID = DEFAULT_CLIENT_ID;
export const DEX_TEST_CLIENT_SECRET = DEFAULT_CLIENT_SECRET;
export const DEX_TEST_USER_EMAIL = DEFAULT_USER_EMAIL;
export const DEX_TEST_USER_PASSWORD = DEFAULT_USER_PASSWORD;
