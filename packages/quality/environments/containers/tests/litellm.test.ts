import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const startContainer = vi.hoisted(() => vi.fn());
const getPort = vi.hoisted(() => vi.fn());

vi.mock('get-port', () => ({ default: getPort }));

// The real builder, so the tests read the Docker settings the service makes. Only start() is fake.
vi.mock('testcontainers', async () => {
	const actual = await vi.importActual<typeof import('testcontainers')>('testcontainers');
	class GenericContainer extends actual.GenericContainer {
		override async start() {
			return await startContainer(this);
		}
	}
	return { ...actual, GenericContainer };
});

import { buildLiteLlmSetup, liteLlm } from '../services/litellm';
import type { StartContext } from '../services/types';

type PortBindings = Record<string, Array<{ HostIp?: string; HostPort: string }>>;

interface Built {
	createOpts: { name?: string; Cmd?: string[] };
	hostConfig: { PortBindings?: PortBindings };
	environment: Record<string, string>;
	exposedPorts: unknown[];
	networkMode?: string;
	networkAliases: string[];
	contentsToCopy: Array<{ content: string; target: string }>;
	startupTimeoutMs?: number;
	waitStrategy: {
		path?: string;
		port?: number;
		predicates?: Array<(response: { status: number }) => Promise<boolean>>;
	};
}

const CONFIG_FILE = '/app/config.yaml';
const CADDYFILE = '/etc/caddy/Caddyfile';
const NETWORK = { getName: () => 'n8n-test-network' } as unknown as StartedNetwork;

const AZURE_ENV = {
	LITELLM_AZURE_API_BASE: 'https://example-resource.openai.azure.com',
	LITELLM_AZURE_DEPLOYMENT: 'gpt-test',
	LITELLM_AZURE_TENANT_ID: 'tenant-id',
	LITELLM_AZURE_CLIENT_ID: 'client-id',
	LITELLM_AZURE_CLIENT_SECRET: 'client-secret-value',
};

let built: Built[] = [];

function startedFrom(container: Built) {
	return {
		name: container.createOpts.name,
		getMappedPort: (port: number) =>
			Number(container.hostConfig.PortBindings?.[`${port}/tcp`]?.[0]?.HostPort) || 32768,
	} as unknown as StartedTestContainer;
}

// Found by the file each one gets, so an image override (TEST_IMAGE_*) cannot break the lookup
function builtWith(target: string): Built {
	const container = built.find(({ contentsToCopy }) =>
		contentsToCopy.some((f) => f.target === target),
	);
	if (!container) throw new Error(`No container got ${target}`);
	return container;
}

function copied(target: string): string {
	const file = builtWith(target).contentsToCopy.find((f) => f.target === target);
	if (!file) throw new Error(`No file ${target}`);
	return file.content;
}

function caddyRoute(route: string): string {
	const block = copied(CADDYFILE)
		.split(/\n\s*(?=handle)/)
		.find((part) => part.includes(`handle_path ${route}`));
	if (!block) throw new Error(`No Caddy route ${route}`);
	return block;
}

async function startGateway(external: boolean) {
	const registered: StartedTestContainer[] = [];
	const ctx = {
		external,
		registerContainer: (container: StartedTestContainer) => registered.push(container),
	} as unknown as StartContext;
	const result = await liteLlm.start(NETWORK, 'n8n-test', undefined, ctx);
	return { result, registered };
}

async function startGatewayExpectingError(external: boolean, message: string) {
	const registered: StartedTestContainer[] = [];
	const ctx = {
		external,
		registerContainer: (container: StartedTestContainer) => registered.push(container),
	} as unknown as StartContext;
	await expect(liteLlm.start(NETWORK, 'n8n-test', undefined, ctx)).rejects.toThrow(message);
	return registered;
}

beforeEach(() => {
	built = [];
	startContainer.mockReset();
	startContainer.mockImplementation(async (container: Built) => {
		built.push(container);
		return startedFrom(container);
	});
	getPort.mockReset();
	getPort.mockImplementation(async ({ port }: { port: number }) => port);
	for (const name of Object.keys(AZURE_ENV)) vi.stubEnv(name, '');
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('liteLlm.start', () => {
	test('registers the gateway before the front door starts, so the stack can stop it', async () => {
		startContainer.mockImplementation(async (container: Built) => {
			built.push(container);
			if (container.contentsToCopy.some((f) => f.target === CADDYFILE)) {
				throw new Error('front door failed');
			}
			return startedFrom(container);
		});

		const registered = await startGatewayExpectingError(false, 'front door failed');

		expect(registered).toEqual([expect.objectContaining({ name: 'n8n-test-litellm' })]);
	});

	test('registers nothing and starts no front door when the gateway fails', async () => {
		startContainer.mockImplementation(async (container: Built) => {
			built.push(container);
			throw new Error('gateway failed');
		});

		const registered = await startGatewayExpectingError(false, 'gateway failed');

		expect(registered).toEqual([]);
		expect(startContainer).toHaveBeenCalledTimes(1);
	});

	test('registers both containers when both start', async () => {
		const { result, registered } = await startGateway(false);

		expect(registered).toHaveLength(2);
		expect(result.containers).toEqual(registered);
	});

	test('publishes both ports on 127.0.0.1 only, on fixed host ports for local dev', async () => {
		const { result } = await startGateway(true);

		expect(builtWith(CONFIG_FILE).hostConfig.PortBindings).toEqual({
			'4000/tcp': [{ HostIp: '127.0.0.1', HostPort: '4000' }],
		});
		expect(builtWith(CONFIG_FILE).exposedPorts).toEqual([4000]);
		expect(builtWith(CADDYFILE).hostConfig.PortBindings).toEqual({
			'80/tcp': [{ HostIp: '127.0.0.1', HostPort: '4001' }],
		});
		expect(builtWith(CADDYFILE).exposedPorts).toEqual([80]);
		expect(result.meta.logins.map(({ method, baseUrl }) => [method, baseUrl])).toEqual([
			['Bearer token', 'http://localhost:4000/v1'],
			['API key in header', 'http://localhost:4000/v1'],
			['Basic auth', 'http://localhost:4001/basic/v1'],
			['None', 'http://localhost:4001/none/v1'],
		]);
	});

	test('uses random loopback host ports and network URLs inside a stack', async () => {
		const { result } = await startGateway(false);

		expect(builtWith(CONFIG_FILE).hostConfig.PortBindings).toEqual({
			'4000/tcp': [{ HostIp: '127.0.0.1', HostPort: '0' }],
		});
		expect(builtWith(CADDYFILE).hostConfig.PortBindings).toEqual({
			'80/tcp': [{ HostIp: '127.0.0.1', HostPort: '0' }],
		});
		expect(getPort).not.toHaveBeenCalled();
		expect(result.meta.logins.map(({ baseUrl }) => baseUrl)).toEqual([
			'http://litellm:4000/v1',
			'http://litellm:4000/v1',
			'http://litellm-front-door:80/basic/v1',
			'http://litellm-front-door:80/none/v1',
		]);
	});

	test('names both containers after the project and puts them on the stack network', async () => {
		await startGateway(false);

		expect(builtWith(CONFIG_FILE)).toMatchObject({
			createOpts: { name: 'n8n-test-litellm' },
			networkMode: 'n8n-test-network',
			networkAliases: ['litellm'],
		});
		expect(builtWith(CADDYFILE)).toMatchObject({
			createOpts: { name: 'n8n-test-litellm-front-door' },
			networkMode: 'n8n-test-network',
			networkAliases: ['litellm-front-door'],
		});
	});

	test('front door asks for Basic auth on /basic only and passes the gateway key on', async () => {
		await startGateway(true);

		const basic = caddyRoute('/basic/*');
		const none = caddyRoute('/none/*');
		expect(basic).toMatch(/basic_auth \{\s+n8n \$2a\$14\$/);
		expect(none).not.toContain('basic_auth');
		for (const route of [basic, none]) {
			expect(route).toContain('reverse_proxy litellm:4000');
			expect(route).toContain('header_up Authorization "Bearer sk-n8n-test-gateway"');
		}
	});

	test('starts the gateway with its config, its key and a readiness check', async () => {
		await startGateway(true);
		const gateway = builtWith(CONFIG_FILE);
		const [statusCheck] = gateway.waitStrategy.predicates ?? [];

		expect(JSON.parse(copied(CONFIG_FILE)).general_settings).toEqual({
			master_key: 'sk-n8n-test-gateway',
		});
		expect(gateway.createOpts.Cmd).toEqual([
			'--config',
			CONFIG_FILE,
			'--port',
			'4000',
			'--telemetry',
			'False',
		]);
		expect(gateway.waitStrategy).toMatchObject({ path: '/health/liveliness', port: 4000 });
		expect(await statusCheck({ status: 200 })).toBe(true);
		expect(await statusCheck({ status: 503 })).toBe(false);
		expect(gateway.startupTimeoutMs).toBe(180_000);
		expect(gateway.environment).toEqual({ LITELLM_LOCAL_MODEL_COST_MAP: 'True' });
	});

	test('gives the Azure secret to the gateway only through its environment', async () => {
		for (const [name, value] of Object.entries(AZURE_ENV)) vi.stubEnv(name, value);

		const { result } = await startGateway(true);

		expect(result.meta.models).toEqual(['gpt-test', 'mock-model']);
		expect(builtWith(CONFIG_FILE).environment).toEqual({
			AZURE_CLIENT_SECRET: 'client-secret-value',
			LITELLM_LOCAL_MODEL_COST_MAP: 'True',
		});
		expect(copied(CONFIG_FILE)).not.toContain('client-secret-value');
	});

	test.each([4000, 4001])(
		'refuses to start when fixed port %i is taken, and starts no container',
		async (takenPort) => {
			getPort.mockImplementation(async ({ port }: { port: number }) =>
				port === takenPort ? 50123 : port,
			);

			await startGatewayExpectingError(true, `Port ${takenPort} is in use`);
			expect(startContainer).not.toHaveBeenCalled();
		},
	);
});

describe('buildLiteLlmSetup', () => {
	const modelNames = (config: string) =>
		JSON.parse(config).model_list.map(({ model_name }: { model_name: string }) => model_name);

	test('serves only the mock model when no Azure variable is set', () => {
		const setup = buildLiteLlmSetup({});
		const [mock] = JSON.parse(setup.config).model_list;

		expect(setup.models).toEqual(['mock-model']);
		expect(modelNames(setup.config)).toEqual(setup.models);
		expect(mock.litellm_params).toEqual({
			model: 'openai/mock-model',
			mock_response: expect.any(String),
		});
		expect(setup.environment).toEqual({});
	});

	test('adds the Azure deployment and keeps the secret out of the config', () => {
		const setup = buildLiteLlmSetup(AZURE_ENV);
		const [azure, mock] = JSON.parse(setup.config).model_list;

		expect(setup.models).toEqual(['gpt-test', 'mock-model']);
		expect(modelNames(setup.config)).toEqual(setup.models);
		expect(azure.litellm_params).toEqual({
			model: 'azure/gpt-test',
			api_base: 'https://example-resource.openai.azure.com',
			api_version: '2025-03-01-preview',
			tenant_id: 'tenant-id',
			client_id: 'client-id',
			client_secret: 'os.environ/AZURE_CLIENT_SECRET',
		});
		expect(mock.litellm_params).toMatchObject({ mock_response: expect.any(String) });
		expect(setup.config).not.toContain('client-secret-value');
		expect(setup.environment).toEqual({ AZURE_CLIENT_SECRET: 'client-secret-value' });
	});

	test('uses the API version from the environment when set', () => {
		const setup = buildLiteLlmSetup({ ...AZURE_ENV, LITELLM_AZURE_API_VERSION: '2025-04-01' });

		expect(JSON.parse(setup.config).model_list[0].litellm_params.api_version).toBe('2025-04-01');
	});

	test('names the missing variables when only some are set', () => {
		const { LITELLM_AZURE_CLIENT_SECRET: _, ...partial } = AZURE_ENV;

		expect(() => buildLiteLlmSetup({ ...partial, LITELLM_AZURE_TENANT_ID: ' ' })).toThrow(
			'Missing: LITELLM_AZURE_TENANT_ID, LITELLM_AZURE_CLIENT_SECRET',
		);
	});
});
