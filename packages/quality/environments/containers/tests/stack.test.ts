import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	Network,
	type GenericContainer,
	type StartedNetwork,
	type StartedTestContainer,
} from 'testcontainers';
import { afterEach, beforeEach, expect, onTestFinished, test, vi } from 'vitest';

import { ENGINE_SHARED_STORAGE_PATH } from '../services/engine';
import { createN8NStack, type N8NConfig, type N8NStack } from '../stack';

const projectName = 'test-stack';
const main = `${projectName}-n8n`;
const queue = { workers: 1, webhooks: 1 };
const queueNames = [main, `${projectName}-n8n-worker-1`, `${projectName}-n8n-webhook-1`];
const serviceFile = { target: '/tmp/service-ca.pem', content: 'service certificate' };
const keyFile = { target: '/tmp/encryption-key', content: 'key-from-file' };

type BindMounts = Parameters<GenericContainer['withBindMounts']>[0];

const built = new Map<
	string,
	{
		environment: Record<string, string>;
		files: Parameters<GenericContainer['withCopyContentToContainer']>[0];
		bindMounts: BindMounts;
		reuse: boolean;
	}
>();
let stack: N8NStack | undefined;
const started = new Map<string, StartedTestContainer>();

function startedContainer(name: string): StartedTestContainer {
	const container = {
		getId: () => name,
		getName: () => `/${name}`,
		getMappedPort: () => 5678,
		exec: vi.fn().mockResolvedValue({ exitCode: 0, output: '' }),
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
				reuse: this.reuse,
			});
			return startedContainer(name);
		}
	}
	return { ...actual, GenericContainer };
});

vi.mock('get-port', () => ({ default: vi.fn().mockResolvedValue(5678) }));
vi.mock('../network-stabilization', () => ({ waitForNetworkQuiet: vi.fn() }));
vi.mock('../services/registry', () => ({
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
	},
	helperFactories: {},
}));

beforeEach(() => {
	built.clear();
	started.clear();
	vi.stubEnv('QA_METRICS_WEBHOOK_URL', '');
	vi.stubEnv('CONTAINER_TELEMETRY_VERBOSE', '0');
	vi.stubEnv('N8N_CONTAINERS_KEEPALIVE', 'false');
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

test('copies stack and service files into the main, worker, and webhook', async () => {
	await startStack({ ...queue, files: [keyFile] });

	for (const name of queueNames) {
		const { files, reuse } = built.get(name)!;
		expect(files).toHaveLength(2);
		expect(files).toEqual(expect.arrayContaining([keyFile, serviceFile]));
		expect(reuse).toBe(false);
	}
});

test('keeps the default env and service files when the new options are absent', async () => {
	await startStack(queue);

	for (const name of queueNames) {
		const { environment, files, bindMounts, reuse } = built.get(name)!;
		expect(Object.hasOwn(environment, 'N8N_ENCRYPTION_KEY')).toBe(true);
		expect(environment.N8N_STORAGE_PATH).toBeUndefined();
		expect(environment.N8N_DEFAULT_BINARY_DATA_MODE).toBeUndefined();
		expect(files).toEqual([serviceFile]);
		expect(bindMounts).toEqual([]);
		expect(reuse).toBe(true);
	}
});

test.each([
	{ configuredMode: undefined, expectedMode: 'filesystem' },
	{ configuredMode: 'database', expectedMode: 'database' },
])(
	'shares one storage mount across all queue roles in $expectedMode mode',
	async ({ configuredMode, expectedMode }) => {
		const { stop } = await startStack({
			...queue,
			sharedStorage: true,
			env: {
				N8N_STORAGE_PATH: '/custom/storage',
				N8N_BINARY_DATA_STORAGE_PATH: '/custom/binary',
				N8N_BINARY_DATA_STORAGE_PATH_FILE: '/run/secrets/binary-path',
				...(configuredMode ? { N8N_DEFAULT_BINARY_DATA_MODE: configuredMode } : {}),
			},
		});
		const mainMounts = built.get(main)!.bindMounts;
		expect(mainMounts).toHaveLength(1);
		const [{ source }] = mainMounts;

		for (const name of queueNames) {
			const { environment, bindMounts, reuse } = built.get(name)!;
			expect(environment).toMatchObject({
				N8N_STORAGE_PATH: ENGINE_SHARED_STORAGE_PATH,
				N8N_DEFAULT_BINARY_DATA_MODE: expectedMode,
			});
			expect(environment.N8N_BINARY_DATA_STORAGE_PATH).toBeUndefined();
			expect(environment.N8N_BINARY_DATA_STORAGE_PATH_FILE).toBeUndefined();
			expect(bindMounts).toEqual([{ source, target: ENGINE_SHARED_STORAGE_PATH, mode: 'rw' }]);
			expect(reuse).toBe(false);
		}

		expect((await stat(source)).isDirectory()).toBe(true);
		await stop();
		await expect(stat(source)).rejects.toMatchObject({ code: 'ENOENT' });
	},
);

test('prepares nested storage directories through a container with the mount', async () => {
	const { stop } = await startStack({ ...queue, sharedStorage: true, services: ['tracing'] });
	const [mainContainer, workerContainer, webhookContainer] = queueNames.map(
		(name) => started.get(name)!,
	);
	vi.mocked(mainContainer.exec).mockRejectedValue(new Error('container is not running'));

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
