import { request } from '@playwright/test';
import { z } from 'zod';

import { test as base, expect } from '../../../fixtures/base';
import { ApiHelpers } from '../../../services/api-helper';
import {
	startFakeSandbox,
	type FakeSandboxService,
} from '../../../services/fake-sandbox/fake-sandbox.server';
import {
	startScriptedLlm,
	type ScriptedLlm,
} from '../../../services/scripted-llm/scripted-llm.server';
import type { ScriptInput } from '../../../services/scripted-llm/scripted-llm.types';
import { TestError } from '../../../Types';
import { getBackendUrl } from '../../../utils/url-helper';

// Same defaults as `scripts/local-linked-config.mjs`. n8n has these ports in its config.
const DEFAULT_SCRIPTED_LLM_PORT = 5799;
const DEFAULT_SANDBOX_SERVICE_PORT = 5798;

// Two n8n processes and the browser share one machine, so pages and tests need more
// time than the defaults of the e2e project (10 s navigation, 60 s test).
const NAVIGATION_TIMEOUT_MS = 30_000;
const TEST_TIMEOUT_MS = 120_000;

export const LINKED_INSTANCES_SKIP_REASON =
	'Needs the two n8n instances of `pnpm test:future-poc` (CLOUD_BASE_URL is not set)';

const portSchema = z
	.string()
	.regex(/^\d{1,5}$/)
	.transform(Number)
	.pipe(z.number().int().min(1).max(65535));
const urlSchema = z.string().url();

/** What `scripts/run-local-linked.mjs` tells Playwright through the environment. */
type LinkedEnv = {
	/** Undefined when the runner did not start the two instances. */
	urls?: { localUrl: string; cloudUrl: string };
	llmPort: number;
	sandboxPort: number;
};

function portFromEnv(name: string, fallback: number): number {
	const raw = process.env[name]?.trim();
	return raw ? portSchema.parse(raw) : fallback;
}

function readLinkedEnv(): LinkedEnv {
	const localUrl = getBackendUrl();
	const cloudUrl = process.env.CLOUD_BASE_URL;
	return {
		urls:
			localUrl && cloudUrl
				? { localUrl: urlSchema.parse(localUrl), cloudUrl: urlSchema.parse(cloudUrl) }
				: undefined,
		llmPort: portFromEnv('SCRIPTED_LLM_PORT', DEFAULT_SCRIPTED_LLM_PORT),
		sandboxPort: portFromEnv('SANDBOX_SERVICE_PORT', DEFAULT_SANDBOX_SERVICE_PORT),
	};
}

/**
 * Skip all tests of the calling spec file when the two instances are not
 * running. Call it at file scope: the skip then happens before any fixture
 * starts, so container projects do not start a stack for these specs.
 */
export function requireLinkedInstances(): void {
	base.skip(readLinkedEnv().urls === undefined, LINKED_INSTANCES_SKIP_REASON);
}

async function withApi(baseURL: string, run: (api: ApiHelpers) => Promise<void>): Promise<void> {
	const context = await request.newContext({ baseURL });
	try {
		await run(new ApiHelpers(context));
	} finally {
		await context.dispose();
	}
}

/**
 * Deactivates the active workflows of "This computer". A published workflow cannot be
 * deleted, so the database reset fails while one is active.
 */
async function deactivateActiveWorkflows(api: ApiHelpers): Promise<void> {
	try {
		await api.signin('owner');
	} catch {
		// No owner yet, for example after the runner's probe reset failed. The reset below creates one.
		return;
	}
	const workflows: Array<{ id: string; active: boolean }> = await api.workflows.getWorkflows();
	for (const workflow of workflows.filter((candidate) => candidate.active)) {
		await api.workflows.deactivate(workflow.id);
	}
}

async function resetLocal(baseURL: string): Promise<void> {
	await withApi(baseURL, async (api) => {
		// An active workflow that an earlier test left on would block the reset below.
		await deactivateActiveWorkflows(api);
		// Clear the in-memory Assistant runs. A database reset does not clear them.
		const response = await api.request.post('/rest/instance-ai/test/reset');
		if (!response.ok()) {
			throw new TestError(
				`Assistant reset failed (${response.status()}): ${await response.text()}`,
			);
		}
		await api.resetDatabase();
		await api.signin('owner');
		// The test has no web search provider, so turn search off. The runner turns the local
		// gateway off too. A test that turns it on must not leave it on for the next test.
		await api.updateInstanceAiSettings({ searchDisabled: true, localGatewayDisabled: true });
	});
}

async function resetCloud(baseURL: string): Promise<void> {
	await withApi(baseURL, async (api) => await api.resetDatabase());
}

type LinkedInstancesFixtures = {
	/** Script of `llm`. Set it with `test.use({ script })`. The default answers every request with "Done.". */
	script: ScriptInput;
	/** The scripted LLM, started from `script` on SCRIPTED_LLM_PORT. Stopped after the test. */
	llm: ScriptedLlm;
	/**
	 * Start the scripted LLM in the test, for a script that holds ids the test
	 * created. Do not use it together with `llm`: both bind SCRIPTED_LLM_PORT.
	 */
	startLlm: (script: ScriptInput) => Promise<ScriptedLlm>;
	/** Origin of "Cloud", for example `http://127.0.0.1:5680`. */
	cloudUrl: string;
	/** API helpers for "Cloud", signed in as its owner after the reset. */
	cloudApi: ApiHelpers;
	/** Resets both instances before each test. */
	linkedInstancesReset: undefined;
};

type LinkedInstancesWorkerFixtures = {
	/** URLs and ports from the runner. Read once when the file loads. */
	linkedEnv: LinkedEnv;
	/**
	 * The fake sandbox service of "This computer", on SANDBOX_SERVICE_PORT. Each
	 * Assistant turn writes its skills to a sandbox, so the service must run.
	 */
	sandbox: FakeSandboxService;
};

export const test = base.extend<LinkedInstancesFixtures, LinkedInstancesWorkerFixtures>({
	script: [{ rules: [] }, { option: true }],

	linkedEnv: [readLinkedEnv(), { scope: 'worker', option: true }],

	sandbox: [
		async ({ linkedEnv }, use) => {
			const sandbox = await startFakeSandbox({ port: linkedEnv.sandboxPort });
			await use(sandbox);
			await sandbox.stop();
		},
		{ scope: 'worker' },
	],

	linkedInstancesReset: [
		async ({ linkedEnv, sandbox }, use, testInfo) => {
			void sandbox; // Start the sandbox service before the first Assistant turn.
			const { urls } = linkedEnv;
			if (!urls) {
				testInfo.skip(true, LINKED_INSTANCES_SKIP_REASON);
				return;
			}
			// A timeout of 0 means no timeout, so keep it.
			if (testInfo.timeout !== 0) testInfo.setTimeout(Math.max(testInfo.timeout, TEST_TIMEOUT_MS));
			await Promise.all([resetLocal(urls.localUrl), resetCloud(urls.cloudUrl)]);
			await use(undefined);
		},
		{ auto: true },
	],

	// The Assistant home animates. Reduced motion keeps its frames still in every browser
	// context of the future-poc specs. An override here reaches every spec file, while
	// `test.use` at module scope reaches only the file that loads this module first.
	contextOptions: async ({ contextOptions }, use) => {
		await use({ ...contextOptions, reducedMotion: 'reduce' });
	},

	context: async ({ context }, use) => {
		context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
		// The sidebar experiment has no PostHog variant in e2e, so the control group starts the
		// sidebar collapsed. Expand it before the first load. A stored choice stays as it is.
		await context.addInitScript(() => {
			try {
				if (window.localStorage.getItem('sidebar.collapsed') === null) {
					window.localStorage.setItem('sidebar.collapsed', 'false');
				}
			} catch {
				// Blocked storage: the sidebar keeps its default.
			}
		});
		await use(context);
	},

	startLlm: async ({ linkedEnv }, use) => {
		const started: ScriptedLlm[] = [];
		await use(async (script) => {
			const llm = await startScriptedLlm({ script, port: linkedEnv.llmPort });
			started.push(llm);
			return llm;
		});
		await Promise.all(started.map(async (llm) => await llm.stop()));
	},

	llm: async ({ script, startLlm }, use) => {
		await use(await startLlm(script));
	},

	cloudUrl: async ({ linkedEnv }, use) => {
		if (!linkedEnv.urls) throw new TestError(LINKED_INSTANCES_SKIP_REASON);
		await use(linkedEnv.urls.cloudUrl);
	},

	cloudApi: async ({ cloudUrl, linkedInstancesReset }, use) => {
		void linkedInstancesReset; // Sign in only after the reset.
		const context = await request.newContext({ baseURL: cloudUrl });
		const api = new ApiHelpers(context);
		await api.signin('owner');
		await use(api);
		await context.dispose();
	},
});

export { expect };
