import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	GenericContainer,
	Network,
	type StartedNetwork,
	type StartedTestContainer,
} from 'testcontainers';
import { afterEach, beforeEach, expect, onTestFinished, test, vi } from 'vitest';

import * as containerUtils from '../helpers/utils';
import { ENGINE_SHARED_STORAGE_PATH } from '../services/engine';
import { createN8NStack, type N8NConfig, type N8NStack } from '../stack';

const projectName = 'test-stack';
const main = `${projectName}-n8n`;
const caddy = `${projectName}-caddy-lb`;
const keycloakContainer = `${projectName}-keycloak`;
const queue = { workers: 1, webhooks: 1 };
const queueNames = [main, `${projectName}-n8n-worker-1`, `${projectName}-n8n-webhook-1`];
const serviceFile = { target: '/tmp/service-ca.pem', content: 'service certificate' };
const keyFile = { target: '/tmp/encryption-key', content: 'key-from-file' };
const hardeningOptions = {
	readOnlyRootfs: true,
	tmpfs: { '/tmp': 'rw,nosuid,nodev' },
	platform: 'linux/arm64',
};

type BindMounts = Parameters<GenericContainer['withBindMounts']>[0];

const built = new Map<
	string,
	{
		environment: Record<string, string>;
		files: Parameters<GenericContainer['withCopyContentToContainer']>[0];
		bindMounts: BindMounts;
		n8nContainer: NonNullable<N8NConfig['n8nContainer']>;
		reuse: boolean;
	}
>();
let stack: N8NStack | undefined;
const started = new Map<string, StartedTestContainer>();
const imageExists = vi.fn();

function startedContainer(name: string): StartedTestContainer {
	const container = {
		getId: () => name,
		getName: () => `/${name}`,
		getHost: () => 'docker-host.test',
		getMappedPort: (port: number) => (port === 80 ? 8080 : 5678),
		exec: vi.fn().mockImplementation(async (command: string[]) => ({
			exitCode: 0,
			output:
				command[0] === 'cat' && command[1] === '/tmp/keycloak-ca.pem'
					? '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----'
					: '',
		})),
		stop: vi.fn().mockResolvedValue(undefined),
	} as unknown as StartedTestContainer;
	started.set(name, container);
	return container;
}

vi.mock('testcontainers', async (importOriginal) => {
	const actual = await importOriginal<typeof import('testcontainers')>();
	class GenericContainer extends actual.GenericContainer {
		private bindMounts: BindMounts = [];

		override withBindMounts(bindMounts: BindMounts): this {
			this.bindMounts = bindMounts;
			return super.withBindMounts(bindMounts);
		}

		override async start(): Promise<StartedTestContainer> {
			const name = this.createOpts.name!;
			built.set(name, {
				environment: this.environment,
				files: this.contentsToCopy,
				bindMounts: this.bindMounts,
				n8nContainer: {
					readOnlyRootfs: this.hostConfig.ReadonlyRootfs,
					tmpfs: this.hostConfig.Tmpfs,
					platform: this.createOpts.platform,
				},
				reuse: this.reuse,
			});
			return startedContainer(name);
		}
	}
	return {
		...actual,
		GenericContainer,
		getContainerRuntimeClient: async () => ({ image: { exists: imageExists } }),
	};
});

vi.mock('get-port', () => ({ default: vi.fn().mockResolvedValue(5678) }));
vi.mock('../network-stabilization', () => ({ waitForNetworkQuiet: vi.fn() }));
vi.mock('../services/registry', async () => ({
	services: {
		mailpit: {
			description: 'Mailpit',
			start: async () => ({
				container: startedContainer(`${projectName}-mailpit`),
				meta: { n8nFilesToMount: [serviceFile] },
			}),
			env: () => ({ SERVICE_ENV: 'set-by-service' }),
		},
		tracing: {
			description: 'Tracing',
			start: async () => ({ container: startedContainer(`${projectName}-n8n-tracer`) }),
		},
		loadBalancer: (
			await vi.importActual<typeof import('../services/load-balancer')>('../services/load-balancer')
		).loadBalancer,
		keycloak: (await vi.importActual<typeof import('../services/keycloak')>('../services/keycloak'))
			.keycloak,
	},
	helperFactories: {},
}));

beforeEach(() => {
	built.clear();
	started.clear();
	imageExists.mockReset().mockResolvedValue(true);
	vi.stubEnv('QA_METRICS_WEBHOOK_URL', '');
	vi.stubEnv('CONTAINER_TELEMETRY_VERBOSE', '0');
	vi.stubEnv('N8N_CONTAINERS_KEEPALIVE', 'false');
	vi.spyOn(containerUtils, 'pollContainerHttpEndpoint').mockResolvedValue(undefined);
	vi.spyOn(Network.prototype, 'start').mockResolvedValue({
		getName: () => 'test-network',
		stop: vi.fn().mockResolvedValue(undefined),
	} as unknown as StartedNetwork);
});

afterEach(async () => {
	try {
		await stack?.stop();
	} finally {
		stack = undefined;
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	}
});

async function startStack(config: N8NConfig = {}) {
	stack = await createN8NStack({ projectName, services: ['mailpit'], ...config });
	return stack;
}

test.each([
	{ mode: 'standalone', topology: {}, names: [main], computedKey: 'DB_TYPE' },
	{ mode: 'queue', topology: queue, names: queueNames, computedKey: 'EXECUTIONS_MODE' },
])(
	'unsets env keys after merging all settings in $mode mode',
	async ({ topology, names, computedKey }) => {
		const unsetEnv = ['N8N_ENCRYPTION_KEY', 'SERVICE_ENV', 'USER_ENV', computedKey];
		await startStack({
			...topology,
			env: { N8N_ENCRYPTION_KEY_FILE: keyFile.target, USER_ENV: 'set-by-test' },
			unsetEnv,
		});

		for (const name of names) {
			const { environment } = built.get(name)!;
			expect(Object.keys(environment).filter((key) => unsetEnv.includes(key))).toEqual([]);
			expect(environment.N8N_ENCRYPTION_KEY_FILE).toBe(keyFile.target);
		}
	},
);

test.each([
	{ mode: 'standalone', topology: {}, names: [main], port: 5678 },
	{ mode: 'queue', topology: queue, names: queueNames, port: 8080 },
])('keeps defaults in $mode mode', async ({ mode, topology, names, port }) => {
	const { baseUrl } = await startStack(topology);

	for (const name of names) {
		const { environment, files, bindMounts, n8nContainer, reuse } = built.get(name)!;
		expect(Object.hasOwn(environment, 'N8N_ENCRYPTION_KEY')).toBe(true);
		expect(environment.N8N_STORAGE_PATH).toBeUndefined();
		expect(environment.N8N_DEFAULT_BINARY_DATA_MODE).toBeUndefined();
		expect(environment.N8N_PATH).toBeUndefined();
		expect(environment.N8N_EDITOR_BASE_URL).toBeUndefined();
		expect(environment.WEBHOOK_URL).toBe(baseUrl);
		expect(files).toEqual([serviceFile]);
		expect(bindMounts).toEqual([]);
		expect(n8nContainer).toEqual({});
		expect(reuse).toBe(true);
	}
	expect(baseUrl).toBe(`http://localhost:${port}`);
	expect(started.has(caddy)).toBe(mode === 'queue');
	if (mode === 'queue') {
		expect(built.get(caddy)?.files[0].content).not.toContain('handle_path');
	}
	expect(imageExists).not.toHaveBeenCalled();
});

test.each<{ scenario: string; config: N8NConfig; reuse: boolean }>([
	{ scenario: 'stack files', config: { files: [keyFile] }, reuse: false },
	{ scenario: 'shared storage', config: { sharedStorage: true }, reuse: false },
	{
		scenario: 'read-only root filesystem',
		config: { n8nContainer: { readOnlyRootfs: true } },
		reuse: false,
	},
	{
		scenario: 'tmpfs mounts',
		config: { n8nContainer: { tmpfs: hardeningOptions.tmpfs } },
		reuse: false,
	},
	{
		scenario: 'platform with a writable root filesystem',
		config: { n8nContainer: { readOnlyRootfs: false, platform: hardeningOptions.platform } },
		reuse: true,
	},
])('sets container reuse to $reuse for $scenario', async ({ config, reuse }) => {
	await startStack({ services: [], ...config });

	expect(built.get(main)?.reuse).toBe(reuse);
});

test('strips a normalized path prefix before Caddy matches webhook processor paths', async () => {
	await startStack({ pathPrefix: '/n8n', webhooks: 1 });
	const caddyfile = built.get(caddy)?.files.find(({ target }) => target === '/etc/caddy/Caddyfile');

	expect(caddyfile?.content).toContain(
		`handle_path /n8n/* {\n    @webhooks path /webhook/* /form/* /chat\n    handle @webhooks {\n      reverse_proxy ${projectName}-n8n-webhook-1:5678 {`,
	);
});

test.each(['/', 'n8n/', '/n8n/*', '/n8n/../editor/', '/n8n//editor/'])(
	'rejects an invalid path prefix: %s',
	async (pathPrefix) => {
		await expect(startStack({ pathPrefix })).rejects.toThrow(
			'pathPrefix must be an absolute subpath',
		);
		expect(Network.prototype.start).not.toHaveBeenCalled();
	},
);

test('lets env and unsetEnv override path prefix URL defaults', async () => {
	const editorUrl = 'https://editor.example.test/n8n/';
	await startStack({
		pathPrefix: '/n8n/',
		env: { N8N_EDITOR_BASE_URL: editorUrl },
		unsetEnv: ['WEBHOOK_URL'],
	});

	const { environment } = built.get(main)!;
	expect(environment.N8N_EDITOR_BASE_URL).toBe(editorUrl);
	expect(environment.WEBHOOK_URL).toBeUndefined();
});

test.each([
	{ scenario: 'default root', pathPrefix: undefined, expectedBase: 'http://localhost:5678' },
	{
		scenario: 'prefixed path',
		pathPrefix: '/n8n',
		expectedBase: 'http://docker-host.test:8080/n8n',
	},
	{
		scenario: 'prefix containing /rest/',
		pathPrefix: '/rest/',
		expectedBase: 'http://docker-host.test:8080/rest',
	},
])('registers Keycloak redirect URIs under $scenario', async ({ pathPrefix, expectedBase }) => {
	vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);

	const { baseUrl } = await startStack({ pathPrefix, services: ['keycloak'] });
	const realmFile = built
		.get(keycloakContainer)
		?.files.find(({ target }) => target === '/opt/keycloak/data/import/realm.json');
	if (typeof realmFile?.content !== 'string') {
		throw new Error('Expected Keycloak realm.json to be copied as a string');
	}
	const realm = JSON.parse(realmFile.content) as {
		clients: Array<{ redirectUris: string[] }>;
	};

	expect(baseUrl.replace(/\/$/, '')).toBe(expectedBase);
	expect(realm.clients[0].redirectUris).toEqual([
		`${expectedBase}/rest/sso/oidc/callback`,
		`${expectedBase}/rest/sso/oidc/callback/*`,
		`${expectedBase}/rest/oauth2-credential/callback`,
		`${expectedBase}/form/inbound-auth-keycloak-form`,
		`${expectedBase}/webhook/inbound-auth-keycloak-chat/chat`,
	]);
});

test('keeps the container settings when replacing the main', async () => {
	const { replaceN8N } = await startStack({ services: [], n8nContainer: hardeningOptions });
	built.clear();

	await replaceN8N({ image: 'n8nio/n8n:next' });

	expect(built.get(main)).toMatchObject({ n8nContainer: hardeningOptions, reuse: false });
});

test.each([
	{ source: 'stack', config: { services: [], files: [keyFile] }, target: keyFile.target },
	{ source: 'service', config: {}, target: serviceFile.target },
])('rejects copied $source files with a read-only root filesystem', async ({ config, target }) => {
	await expect(startStack({ ...config, n8nContainer: { readOnlyRootfs: true } })).rejects.toThrow(
		`cannot copy "${target}" with n8nContainer.readOnlyRootfs enabled`,
	);
	expect(built.size).toBe(0);
});

test.each([
	{
		source: 'stack file below the mount',
		config: { services: [], files: [keyFile] },
		target: keyFile.target,
		mountPath: '/tmp/./',
	},
	{
		source: 'service file at the mount',
		config: {},
		target: serviceFile.target,
		mountPath: serviceFile.target,
	},
])('rejects a tmpfs mount that hides a $source', async ({ config, target, mountPath }) => {
	await expect(
		startStack({ ...config, n8nContainer: { tmpfs: { [mountPath]: 'rw' } } }),
	).rejects.toThrow(`cannot copy "${target}": the tmpfs mount at "${mountPath}" hides this path`);
	expect(built.size).toBe(0);
});

test.each([
	['/run', '/var/run/secrets/key'],
	['/var/run', '/run/secrets/key'],
	['/var', '/var/run/secrets/key'],
])('rejects a tmpfs mount at %s that hides a copied file at %s', async (mountPath, target) => {
	const startup = startStack({
		services: [],
		files: [{ ...keyFile, target }],
		n8nContainer: { tmpfs: { [mountPath]: 'rw' } },
	}).then(({ baseUrl }) => baseUrl);

	await expect(startup).rejects.toThrow(
		`cannot copy "${target}": the tmpfs mount at "${mountPath}" hides this path`,
	);
	expect(built.size).toBe(0);
});

test.each([
	['/tmp', '/tmp-config/encryption-key'],
	['/run-config', '/var/run-config/encryption-key'],
])('copies files outside the tmpfs mount at %s: %s', async (mountPath, target) => {
	const file = { ...keyFile, target };
	await startStack({ services: [], files: [file], n8nContainer: { tmpfs: { [mountPath]: 'rw' } } });

	expect(built.get(main)?.files).toEqual([file]);
});

test('requires a local image before starting a container with a platform', async () => {
	const image = 'ghcr.io/n8n-io/n8n:missing-platform';
	const { platform } = hardeningOptions;
	imageExists.mockResolvedValue(false);

	await expect(startStack({ image, n8nContainer: { platform } })).rejects.toThrow(
		`Docker image '${image}' must be present locally for n8nContainer.platform '${platform}'`,
	);
	expect(built.size).toBe(0);
});

test('preserves the Docker error when the local image platform does not match', async () => {
	const message =
		'image platform (linux/amd64) does not match the requested platform (linux/arm64)';
	const error = Object.assign(new Error(message), { statusCode: 404 });
	vi.spyOn(GenericContainer.prototype, 'start').mockRejectedValueOnce(error);

	await expect(
		startStack({ n8nContainer: { platform: hardeningOptions.platform } }),
	).rejects.toMatchObject({ message, cause: error });
});

test('overrides caller storage paths and keeps an explicit binary data mode with sharedStorage', async () => {
	await startStack({
		sharedStorage: true,
		env: {
			N8N_STORAGE_PATH: '/custom/storage',
			N8N_BINARY_DATA_STORAGE_PATH: '/custom/binary',
			N8N_BINARY_DATA_STORAGE_PATH_FILE: '/run/secrets/binary-path',
			N8N_DEFAULT_BINARY_DATA_MODE: 'database',
		},
	});

	const { environment } = built.get(main)!;
	expect(environment).toMatchObject({
		N8N_STORAGE_PATH: ENGINE_SHARED_STORAGE_PATH,
		N8N_DEFAULT_BINARY_DATA_MODE: 'database',
	});
	expect(environment.N8N_BINARY_DATA_STORAGE_PATH).toBeUndefined();
	expect(environment.N8N_BINARY_DATA_STORAGE_PATH_FILE).toBeUndefined();
});

test('prepares nested storage directories and removes the shared storage directory on stop', async () => {
	const { stop } = await startStack({ ...queue, sharedStorage: true, services: ['tracing'] });
	const [{ source }] = built.get(main)!.bindMounts;
	const [mainContainer, workerContainer, webhookContainer] = queueNames.map(
		(name) => started.get(name)!,
	);
	vi.mocked(mainContainer.exec).mockRejectedValue(new Error('container is not running'));

	expect((await stat(source)).isDirectory()).toBe(true);
	await stop();

	const prepareStorage = [
		'find',
		ENGINE_SHARED_STORAGE_PATH,
		'-mindepth',
		'1',
		'-type',
		'd',
		'-exec',
		'chmod',
		'a+rwx',
		'{}',
		'+',
	];
	expect(mainContainer.exec).toHaveBeenCalledWith(prepareStorage);
	// Worker and webhook start in parallel, so either one may answer next. Only one is asked.
	const answered = [workerContainer, webhookContainer].filter(
		(c) => vi.mocked(c.exec).mock.calls.length > 0,
	);
	expect(answered).toHaveLength(1);
	expect(answered[0].exec).toHaveBeenCalledWith(prepareStorage);
	expect(started.get(`${projectName}-n8n-tracer`)!.exec).not.toHaveBeenCalled();
	expect(vi.mocked(answered[0].exec).mock.invocationCallOrder[0]).toBeLessThan(
		vi.mocked(answered[0].stop).mock.invocationCallOrder[0],
	);
	await expect(stat(source)).rejects.toMatchObject({ code: 'ENOENT' });
});

test.each([
	{
		scenario: 'sets the coverage variable on main and worker',
		unsetEnv: undefined,
		coveragePaths: ['/cov', '/cov', null],
	},
	{
		scenario: 'removes the coverage variable even when the stack enables coverage',
		unsetEnv: ['NODE_V8_COVERAGE'],
		coveragePaths: [null, null, null],
	},
])('$scenario', async ({ unsetEnv, coveragePaths }) => {
	const coverageHostDir = await mkdtemp(join(tmpdir(), 'n8n-stack-coverage-'));
	onTestFinished(async () => await rm(coverageHostDir, { recursive: true, force: true }));

	await startStack({ ...queue, coverageHostDir, unsetEnv });

	const paths = queueNames.map((name) => {
		const { environment } = built.get(name)!;
		return Object.hasOwn(environment, 'NODE_V8_COVERAGE') ? environment.NODE_V8_COVERAGE : null;
	});
	expect(paths).toEqual(coveragePaths);
});

test('keeps the file-based configuration when replacing the main', async () => {
	const { replaceN8N } = await startStack({
		files: [keyFile],
		env: { N8N_ENCRYPTION_KEY_FILE: keyFile.target },
		unsetEnv: ['N8N_ENCRYPTION_KEY'],
	});
	built.clear();

	await replaceN8N({ image: 'n8nio/n8n:next', env: { N8N_ENCRYPTION_KEY: 'replacement-key' } });

	const { environment, files } = built.get(main)!;
	expect(Object.hasOwn(environment, 'N8N_ENCRYPTION_KEY')).toBe(false);
	expect(environment.N8N_ENCRYPTION_KEY_FILE).toBe(keyFile.target);
	expect(files).toEqual(expect.arrayContaining([keyFile, serviceFile]));
});
