import { isRecord } from '@n8n/utils/is-record';
import { expect, test } from '@playwright/test';
import type { N8NStack } from 'n8n-containers/stack';
import { execFileSync } from 'node:child_process';

import { assertDistrolessRunner, assertPointerCompression, runDeploymentCell } from './probe';

type StackContainer = N8NStack['containers'][number];

const CLOUD_LAUNCH_UID = 1000;
const CLOUD_LAUNCH_GID = 1000;
const CLOUD_LAUNCH_USER = `${CLOUD_LAUNCH_UID}:${CLOUD_LAUNCH_GID}`;
const CLOUD_NODE_BIN = '/usr/local/bin/node';
const CLOUD_N8N_BIN = '/usr/local/bin/n8n';
const EXPECTED_N8N_BIN_TARGET = '/usr/local/lib/node_modules/n8n/bin/n8n';
const EXPECTED_NODE_PATH = '/usr/local/lib/node_modules';

interface ContainerLaunchInspection {
	user: string;
	entrypoint: string[];
	cmd: string[];
	nodePath: string | null;
}

interface ContainerRuntimeProbe {
	uid: number;
	gid: number;
	pid1Uid: number | null;
	pid1Gid: number | null;
	pid1Exe: string | null;
	pid1Cmdline: string[];
	pid1NodePath: string | null;
	execPath: string;
	n8nBinRealpath: string | null;
	nodePath: string | null;
}

const RUNTIME_PROBE_SCRIPT = `
const fs = require('node:fs');

function parseProcId(status, prefix) {
	const line = status.split('\\n').find((entry) => entry.startsWith(prefix));
	const raw = line ? line.trim().split(/\\s+/)[1] : null;
	if (raw === null || raw === undefined) return null;
	const parsed = Number.parseInt(raw, 10);
	return Number.isNaN(parsed) ? null : parsed;
}

let pid1Uid = null;
let pid1Gid = null;
try {
	const status = fs.readFileSync('/proc/1/status', 'utf8');
	pid1Uid = parseProcId(status, 'Uid:');
	pid1Gid = parseProcId(status, 'Gid:');
} catch {
	pid1Uid = null;
	pid1Gid = null;
}

let pid1Exe = null;
try {
	pid1Exe = fs.readlinkSync('/proc/1/exe');
} catch {
	pid1Exe = null;
}

let pid1Cmdline = [];
try {
	pid1Cmdline = fs.readFileSync('/proc/1/cmdline', 'utf8').split('\\0').filter(Boolean);
} catch {
	pid1Cmdline = [];
}

let pid1NodePath = null;
try {
	const envEntries = fs.readFileSync('/proc/1/environ', 'utf8').split('\\0');
	const nodePathEntry = envEntries.find((entry) => entry.startsWith('NODE_PATH='));
	pid1NodePath = nodePathEntry ? nodePathEntry.slice('NODE_PATH='.length) : null;
} catch {
	pid1NodePath = null;
}

let n8nBinRealpath = null;
try {
	n8nBinRealpath = fs.realpathSync('${CLOUD_N8N_BIN}');
} catch {
	n8nBinRealpath = null;
}

process.stdout.write(JSON.stringify({
	uid: process.getuid(),
	gid: process.getgid(),
	pid1Uid,
	pid1Gid,
	pid1Exe,
	pid1Cmdline,
	pid1NodePath,
	execPath: process.execPath,
	n8nBinRealpath,
	nodePath: process.env.NODE_PATH ?? null,
}));
`;

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((entry): entry is string => typeof entry === 'string');
}

function inspectContainerLaunch(containerId: string): ContainerLaunchInspection {
	const rawContainer = execFileSync('docker', ['inspect', containerId], { encoding: 'utf8' });
	const containerList: unknown = JSON.parse(rawContainer);
	const containerEntry = Array.isArray(containerList) ? containerList[0] : null;
	if (!isRecord(containerEntry)) {
		throw new Error(`docker inspect returned no container entry for ${containerId}`);
	}

	const config = isRecord(containerEntry.Config) ? containerEntry.Config : {};
	const envEntries = toStringArray(config.Env);
	const nodePathEntry = envEntries.find((entry) => entry.startsWith('NODE_PATH='));

	return {
		user: typeof config.User === 'string' ? config.User : '',
		entrypoint: toStringArray(config.Entrypoint),
		cmd: toStringArray(config.Cmd),
		nodePath: nodePathEntry ? nodePathEntry.slice('NODE_PATH='.length) : null,
	};
}

async function probeContainerRuntime(container: StackContainer): Promise<ContainerRuntimeProbe> {
	const result = await container.exec([CLOUD_NODE_BIN, '-e', RUNTIME_PROBE_SCRIPT]);
	if (result.exitCode !== 0) {
		throw new Error(`Container runtime probe failed on ${container.getName()}: ${result.output}`);
	}

	const parsed: unknown = JSON.parse(result.stdout);
	if (!isRecord(parsed)) {
		throw new Error(`Unexpected runtime probe output on ${container.getName()}: ${result.output}`);
	}

	return {
		uid: typeof parsed.uid === 'number' ? parsed.uid : -1,
		gid: typeof parsed.gid === 'number' ? parsed.gid : -1,
		pid1Uid: typeof parsed.pid1Uid === 'number' ? parsed.pid1Uid : null,
		pid1Gid: typeof parsed.pid1Gid === 'number' ? parsed.pid1Gid : null,
		pid1Exe: typeof parsed.pid1Exe === 'string' ? parsed.pid1Exe : null,
		pid1Cmdline: toStringArray(parsed.pid1Cmdline),
		pid1NodePath: typeof parsed.pid1NodePath === 'string' ? parsed.pid1NodePath : null,
		execPath: typeof parsed.execPath === 'string' ? parsed.execPath : '',
		n8nBinRealpath: typeof parsed.n8nBinRealpath === 'string' ? parsed.n8nBinRealpath : null,
		nodePath: typeof parsed.nodePath === 'string' ? parsed.nodePath : null,
	};
}

test(
	'Cloud launch settings (user, direct node entrypoint, node path)',
	{
		tag: '@cell:CRT-02',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: {
				user: CLOUD_LAUNCH_USER,
				n8nContainer: {
					entrypoint: [CLOUD_NODE_BIN],
					command: [CLOUD_N8N_BIN],
				},
			},
			probe: async ({ probe }) => {
				const webhook = await probe.runWebhook();
				const code = await probe.runCodeNodes({ python: true });
				return { webhook, code };
			},
			check: async ({ stack, probeOutput }) => {
				assertDistrolessRunner(stack);
				await assertPointerCompression(stack);

				const main = stack.findContainers(/-n8n(-main-1)?$/)[0];
				expect(main, 'Expected a main n8n container in the stack').toBeDefined();

				const inspection = inspectContainerLaunch(main.getId());
				expect(
					inspection.user,
					`Expected n8n container Config.User to be "${CLOUD_LAUNCH_USER}"`,
				).toBe(CLOUD_LAUNCH_USER);
				expect(
					inspection.entrypoint,
					`Expected n8n container Config.Entrypoint to invoke "${CLOUD_NODE_BIN}" directly`,
				).toEqual([CLOUD_NODE_BIN]);
				expect(
					inspection.cmd,
					`Expected n8n container Config.Cmd to launch "${CLOUD_N8N_BIN}"`,
				).toEqual([CLOUD_N8N_BIN]);
				expect(
					inspection.nodePath,
					`Expected n8n container Config.Env NODE_PATH to be "${EXPECTED_NODE_PATH}"`,
				).toBe(EXPECTED_NODE_PATH);

				const runtime = await probeContainerRuntime(main);
				expect(runtime.uid, `Expected container process UID to be ${CLOUD_LAUNCH_UID}`).toBe(
					CLOUD_LAUNCH_UID,
				);
				expect(runtime.gid, `Expected container process GID to be ${CLOUD_LAUNCH_GID}`).toBe(
					CLOUD_LAUNCH_GID,
				);
				expect(runtime.pid1Uid, `Expected PID 1 UID to be ${CLOUD_LAUNCH_UID}`).toBe(
					CLOUD_LAUNCH_UID,
				);
				expect(runtime.pid1Gid, `Expected PID 1 GID to be ${CLOUD_LAUNCH_GID}`).toBe(
					CLOUD_LAUNCH_GID,
				);
				expect(
					runtime.pid1Exe,
					`Expected PID 1 executable to be "${CLOUD_NODE_BIN}" (bypassing tini and /docker-entrypoint.sh)`,
				).toBe(CLOUD_NODE_BIN);
				// bin/n8n sets process.title to "n8n", so PID 1 cmdline is ["n8n"] when Node runs directly without tini.
				expect(
					runtime.pid1Cmdline,
					'Expected PID 1 cmdline to be ["n8n"] (direct n8n process, not tini)',
				).toEqual(['n8n']);
				expect(runtime.pid1NodePath, `Expected PID 1 NODE_PATH to be "${EXPECTED_NODE_PATH}"`).toBe(
					EXPECTED_NODE_PATH,
				);
				expect(runtime.execPath, `Expected Node execPath to be "${CLOUD_NODE_BIN}"`).toBe(
					CLOUD_NODE_BIN,
				);
				expect(
					runtime.n8nBinRealpath,
					`Expected "${CLOUD_N8N_BIN}" to resolve to "${EXPECTED_N8N_BIN_TARGET}"`,
				).toBe(EXPECTED_N8N_BIN_TARGET);
				expect(runtime.nodePath, `Expected runtime NODE_PATH to be "${EXPECTED_NODE_PATH}"`).toBe(
					EXPECTED_NODE_PATH,
				);

				expect(
					probeOutput.webhook.responseBody.echo,
					'Expected webhook probe response to echo token',
				).toBe(`probe:${probeOutput.webhook.token}`);
				expect(
					probeOutput.code.js.responseBody,
					'Expected JavaScript Code node to complete',
				).toMatchObject({ runtime: 'js', result: 42 });
				expect(
					probeOutput.code.python?.responseBody,
					'Expected Python Code node to complete',
				).toMatchObject({ runtime: 'python', result: 42 });
			},
		});
	},
);
