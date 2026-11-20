import {
	Network,
	type GenericContainer,
	type StartedNetwork,
	type StartedTestContainer,
} from 'testcontainers';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { createN8NStack, type N8NConfig, type N8NStack } from '../stack';

const projectName = 'test-stack';
const main = `${projectName}-n8n`;
const queue = { workers: 1, webhooks: 1 };
const queueNames = [main, `${projectName}-n8n-worker-1`, `${projectName}-n8n-webhook-1`];
const serviceFile = { target: '/tmp/service-ca.pem', content: 'service certificate' };
const keyFile = { target: '/tmp/encryption-key', content: 'key-from-file' };

const built = new Map<
	string,
	{
		environment: Record<string, string>;
		files: Parameters<GenericContainer['withCopyContentToContainer']>[0];
		reuse: boolean;
	}
>();
let stack: N8NStack | undefined;

function startedContainer(name: string): StartedTestContainer {
	return {
		getId: () => name,
		getName: () => name,
		getMappedPort: () => 5678,
		stop: vi.fn().mockResolvedValue(undefined),
	} as unknown as StartedTestContainer;
}

vi.mock('testcontainers', async (importOriginal) => {
	const actual = await importOriginal<typeof import('testcontainers')>();
	class GenericContainer extends actual.GenericContainer {
		override async start(): Promise<StartedTestContainer> {
			const name = this.createOpts.name!;
			built.set(name, {
				environment: this.environment,
				files: this.contentsToCopy,
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
	},
	helperFactories: {},
}));

beforeEach(() => {
	built.clear();
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
	await startStack();

	const { environment, files, reuse } = built.get(main)!;
	expect(Object.hasOwn(environment, 'N8N_ENCRYPTION_KEY')).toBe(true);
	expect(files).toEqual([serviceFile]);
	expect(reuse).toBe(true);
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
