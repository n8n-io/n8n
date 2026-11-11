import getPort from 'get-port';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult, StartContext } from './types';

const GATEWAY_HOSTNAME = 'litellm';
const GATEWAY_PORT = 4000;
const FRONT_DOOR_HOSTNAME = 'litellm-front-door';
const FRONT_DOOR_PORT = 80;
const FRONT_DOOR_HOST_PORT = 4001;

// Fixed test logins, as in the other services here. They open only this container,
// which listens on 127.0.0.1. The real Azure secret comes from the shell.
const MASTER_KEY = 'sk-n8n-test-gateway';
const BASIC_USER = 'n8n';
const BASIC_PASSWORD = 'test-password';
// Output of `caddy hash-password --plaintext test-password`
const BASIC_PASSWORD_HASH = '$2a$14$DgytGdnK.uKD0/e6YUoEQunxx7Luqq/iEoTW/uGmZVFdflN8ibAqa';

const MOCK_MODEL = 'mock-model';
const MOCK_REPLY = 'This is a fixed reply from the n8n test gateway.';

const AZURE_VARIABLES = [
	'LITELLM_AZURE_API_BASE',
	'LITELLM_AZURE_DEPLOYMENT',
	'LITELLM_AZURE_TENANT_ID',
	'LITELLM_AZURE_CLIENT_ID',
	'LITELLM_AZURE_CLIENT_SECRET',
] as const;
const DEFAULT_AZURE_API_VERSION = '2025-03-01-preview';

export interface LiteLlmLogin {
	method: string;
	baseUrl: string;
	login: string;
}

export interface LiteLlmMeta {
	models: string[];
	logins: LiteLlmLogin[];
}

export type LiteLlmResult = ServiceResult<LiteLlmMeta> & {
	containers: StartedTestContainer[];
};

export interface LiteLlmSetup {
	/** LiteLLM reads YAML, and JSON is valid YAML */
	config: string;
	environment: Record<string, string>;
	models: string[];
}

export function buildLiteLlmSetup(env: NodeJS.ProcessEnv): LiteLlmSetup {
	const read = (name: string) => env[name]?.trim() ?? '';
	const mockModel = {
		model_name: MOCK_MODEL,
		litellm_params: { model: `openai/${MOCK_MODEL}`, mock_response: MOCK_REPLY },
	};
	const toConfig = (models: object[]) =>
		JSON.stringify({ model_list: models, general_settings: { master_key: MASTER_KEY } }, null, 2);

	const missing = AZURE_VARIABLES.filter((name) => !read(name));
	if (missing.length === AZURE_VARIABLES.length) {
		return { config: toConfig([mockModel]), environment: {}, models: [MOCK_MODEL] };
	}
	if (missing.length > 0) {
		throw new Error(
			`Set all Azure variables for the LiteLLM gateway, or none of them. Missing: ${missing.join(', ')}`,
		);
	}

	const deployment = read('LITELLM_AZURE_DEPLOYMENT');
	const azureModel = {
		model_name: deployment,
		litellm_params: {
			model: `azure/${deployment}`,
			api_base: read('LITELLM_AZURE_API_BASE'),
			api_version: read('LITELLM_AZURE_API_VERSION') || DEFAULT_AZURE_API_VERSION,
			tenant_id: read('LITELLM_AZURE_TENANT_ID'),
			client_id: read('LITELLM_AZURE_CLIENT_ID'),
			// LiteLLM reads it from the container environment, so it stays out of the config file
			client_secret: 'os.environ/AZURE_CLIENT_SECRET',
		},
	};

	return {
		config: toConfig([azureModel, mockModel]),
		environment: { AZURE_CLIENT_SECRET: read('LITELLM_AZURE_CLIENT_SECRET') },
		models: [deployment, MOCK_MODEL],
	};
}

// LiteLLM accepts only its key. This proxy adds Basic auth and no login, then passes the key on.
function buildFrontDoorConfig(): string {
	const upstream = `${GATEWAY_HOSTNAME}:${GATEWAY_PORT} {
			header_up Authorization "Bearer ${MASTER_KEY}"
		}`;

	return `
:${FRONT_DOOR_PORT} {
	handle_path /basic/* {
		basic_auth {
			${BASIC_USER} ${BASIC_PASSWORD_HASH}
		}
		reverse_proxy ${upstream}
	}

	handle_path /none/* {
		reverse_proxy ${upstream}
	}

	handle {
		respond "Not found. Use /basic/v1 or /none/v1." 404
	}
}`;
}

// testcontainers cannot bind a port to one address. With Azure on, the gateway
// spends real quota, so nobody else on the network may reach it.
class LoopbackContainer extends GenericContainer {
	withLoopbackPort(container: number, host = 0): this {
		this.withExposedPorts(container);
		this.hostConfig.PortBindings = {
			...this.hostConfig.PortBindings,
			[`${container}/tcp`]: [{ HostIp: '127.0.0.1', HostPort: String(host) }],
		};
		return this;
	}
}

async function assertPortFree(port: number) {
	if ((await getPort({ port })) !== port) {
		throw new Error(
			`Port ${port} is in use. A LiteLLM gateway may run already. Stop it with "pnpm --filter n8n-containers services:clean". If you started it with --name, use "docker rm -f <name>-litellm <name>-litellm-front-door".`,
		);
	}
}

function buildLogins(gatewayUrl: string, frontDoorUrl: string): LiteLlmLogin[] {
	return [
		{ method: 'Bearer token', baseUrl: `${gatewayUrl}/v1`, login: `key ${MASTER_KEY}` },
		{
			method: 'API key in header',
			baseUrl: `${gatewayUrl}/v1`,
			login: `header Ocp-Apim-Subscription-Key, key ${MASTER_KEY}`,
		},
		{
			method: 'Basic auth',
			baseUrl: `${frontDoorUrl}/basic/v1`,
			login: `user ${BASIC_USER}, password ${BASIC_PASSWORD}`,
		},
		{ method: 'None', baseUrl: `${frontDoorUrl}/none/v1`, login: 'no login' },
	];
}

export const liteLlm: Service<LiteLlmResult> = {
	description: 'LiteLLM AI gateway',

	async start(network, projectName, _options, ctx?: StartContext): Promise<LiteLlmResult> {
		const setup = buildLiteLlmSetup(process.env);
		// Fixed host ports keep the credential URLs the same after a restart
		const hostPort = (port: number) => (ctx?.external ? port : undefined);
		if (ctx?.external) {
			await assertPortFree(GATEWAY_PORT);
			await assertPortFree(FRONT_DOOR_HOST_PORT);
		}

		const gatewayLogs = createSilentLogConsumer();
		let gateway: StartedTestContainer;
		try {
			gateway = await new LoopbackContainer(TEST_CONTAINER_IMAGES.litellm)
				.withNetwork(network)
				.withNetworkAliases(GATEWAY_HOSTNAME)
				.withLoopbackPort(GATEWAY_PORT, hostPort(GATEWAY_PORT))
				.withCopyContentToContainer([{ content: setup.config, target: '/app/config.yaml' }])
				.withEnvironment({ ...setup.environment, LITELLM_LOCAL_MODEL_COST_MAP: 'True' })
				.withCommand([
					'--config',
					'/app/config.yaml',
					'--port',
					String(GATEWAY_PORT),
					'--telemetry',
					'False',
				])
				// LiteLLM needs about a minute to start
				.withWaitStrategy(Wait.forHttp('/health/liveliness', GATEWAY_PORT).forStatusCode(200))
				.withStartupTimeout(180_000)
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': GATEWAY_HOSTNAME,
				})
				.withName(`${projectName}-${GATEWAY_HOSTNAME}`)
				.withReuse()
				.withLogConsumer(gatewayLogs.consumer)
				.start();
		} catch (error) {
			return gatewayLogs.throwWithLogs(error);
		}
		ctx?.registerContainer?.(gateway);

		const frontDoorLogs = createSilentLogConsumer();
		let frontDoor: StartedTestContainer;
		try {
			frontDoor = await new LoopbackContainer(TEST_CONTAINER_IMAGES.caddy)
				.withNetwork(network)
				.withNetworkAliases(FRONT_DOOR_HOSTNAME)
				.withLoopbackPort(FRONT_DOOR_PORT, hostPort(FRONT_DOOR_HOST_PORT))
				.withCopyContentToContainer([
					{ content: buildFrontDoorConfig(), target: '/etc/caddy/Caddyfile' },
				])
				.withWaitStrategy(Wait.forListeningPorts())
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': FRONT_DOOR_HOSTNAME,
				})
				.withName(`${projectName}-${FRONT_DOOR_HOSTNAME}`)
				.withReuse()
				.withLogConsumer(frontDoorLogs.consumer)
				.start();
		} catch (error) {
			return frontDoorLogs.throwWithLogs(error);
		}
		ctx?.registerContainer?.(frontDoor);

		const logins = ctx?.external
			? buildLogins(
					`http://localhost:${gateway.getMappedPort(GATEWAY_PORT)}`,
					`http://localhost:${frontDoor.getMappedPort(FRONT_DOOR_PORT)}`,
				)
			: buildLogins(
					`http://${GATEWAY_HOSTNAME}:${GATEWAY_PORT}`,
					`http://${FRONT_DOOR_HOSTNAME}:${FRONT_DOOR_PORT}`,
				);

		return {
			container: gateway,
			containers: [gateway, frontDoor],
			meta: { models: setup.models, logins },
		};
	},
};
