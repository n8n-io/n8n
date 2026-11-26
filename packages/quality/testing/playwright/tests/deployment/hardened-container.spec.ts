import { isRecord } from '@n8n/utils/is-record';
import { expect, test } from '@playwright/test';
import type { N8NStack } from 'n8n-containers/stack';
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';

import { assertN8nImage, runDeploymentCell } from './probe';

type StackContainer = N8NStack['containers'][number];

const HARDENED_GID = 0;
// Stay clear of system UIDs, the image's node user (1000), and nobody/nonroot (65532-65534).
const MIN_RANDOM_UID = 10_000;
const MAX_RANDOM_UID = 60_000;
const USER_FOLDER = '/home/node';

interface ContainerHardeningInspection {
	readonlyRootfs: boolean;
	user: string;
	tmpfs: Record<string, string>;
}

interface ContainerRuntimeProbe {
	uid: number;
	gid: number;
	pid1Uid: number | null;
	rootWriteErrorCode: string | null;
	homeWritable: boolean;
}

const RUNTIME_PROBE_SCRIPT = `
const fs = require('node:fs');

const status = fs.readFileSync('/proc/1/status', 'utf8');
const uidLine = status.split('\\n').find((line) => line.startsWith('Uid:'));
const pid1UidRaw = uidLine ? uidLine.trim().split(/\\s+/)[1] : null;
const pid1Uid = pid1UidRaw !== null && pid1UidRaw !== undefined ? Number.parseInt(pid1UidRaw, 10) : null;

let rootWriteErrorCode = null;
const rootProbePath = '/n8n-readonly-rootfs-probe';
try {
	fs.writeFileSync(rootProbePath, 'probe');
	fs.unlinkSync(rootProbePath);
} catch (error) {
	rootWriteErrorCode = error && typeof error.code === 'string' ? error.code : String(error);
}

let homeWritable = false;
const homeProbePath = '${USER_FOLDER}/.n8n-hardened-write-probe';
try {
	fs.writeFileSync(homeProbePath, 'probe');
	fs.unlinkSync(homeProbePath);
	homeWritable = true;
} catch {
	homeWritable = false;
}

process.stdout.write(JSON.stringify({
	uid: process.getuid(),
	gid: process.getgid(),
	pid1Uid: Number.isNaN(pid1Uid) ? null : pid1Uid,
	rootWriteErrorCode,
	homeWritable,
}));
`;

function inspectContainerHardening(containerId: string): ContainerHardeningInspection {
	const rawContainer = execFileSync('docker', ['inspect', containerId], { encoding: 'utf8' });
	const containerList: unknown = JSON.parse(rawContainer);
	const containerEntry = Array.isArray(containerList) ? containerList[0] : null;
	if (!isRecord(containerEntry)) {
		throw new Error(`docker inspect returned no container entry for ${containerId}`);
	}

	const hostConfig = isRecord(containerEntry.HostConfig) ? containerEntry.HostConfig : {};
	const config = isRecord(containerEntry.Config) ? containerEntry.Config : {};

	const tmpfs: Record<string, string> = {};
	if (isRecord(hostConfig.Tmpfs)) {
		for (const [mountPath, options] of Object.entries(hostConfig.Tmpfs)) {
			if (typeof options === 'string') {
				tmpfs[mountPath] = options;
			}
		}
	}

	return {
		readonlyRootfs: hostConfig.ReadonlyRootfs === true,
		user: typeof config.User === 'string' ? config.User : '',
		tmpfs,
	};
}

async function probeContainerRuntime(container: StackContainer): Promise<ContainerRuntimeProbe> {
	const result = await container.exec(['node', '-e', RUNTIME_PROBE_SCRIPT]);
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
		rootWriteErrorCode:
			typeof parsed.rootWriteErrorCode === 'string' ? parsed.rootWriteErrorCode : null,
		homeWritable: parsed.homeWritable === true,
	};
}

test(
	'Hardened container (non-root UID + read-only rootfs)',
	{
		tag: '@cell:PLT-01',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		const uid = randomInt(MIN_RANDOM_UID, MAX_RANDOM_UID);
		const user = `${uid}:${HARDENED_GID}`;

		await runDeploymentCell({
			stack: {
				user,
				env: {
					N8N_USER_FOLDER: USER_FOLDER,
				},
				n8nContainer: {
					readOnlyRootfs: true,
					tmpfs: {
						[USER_FOLDER]: `rw,uid=${uid},gid=${HARDENED_GID},mode=0700`,
						'/tmp': 'rw,mode=1777',
					},
				},
			},
			probe: async ({ probe }) => {
				const webhook = await probe.runWebhook();
				const execution = await probe.readExecution(webhook.workflowId);
				return { webhook, execution };
			},
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);

				const main = stack.findContainers(/-n8n(-main-1)?$/)[0];
				expect(main, 'Expected a main n8n container in the stack').toBeDefined();

				const inspection = inspectContainerHardening(main.getId());
				expect(
					inspection.readonlyRootfs,
					'Expected n8n container HostConfig.ReadonlyRootfs to be true',
				).toBe(true);
				expect(inspection.user, `Expected n8n container Config.User to be "${user}"`).toBe(user);
				expect(
					Object.keys(inspection.tmpfs),
					'Expected n8n container to mount /home/node and /tmp as tmpfs',
				).toEqual(expect.arrayContaining([USER_FOLDER, '/tmp']));

				const runtime = await probeContainerRuntime(main);
				expect(runtime.uid, 'Expected n8n container process UID to be non-root').toBeGreaterThan(0);
				expect(runtime.uid, `Expected n8n container process UID to be ${uid}`).toBe(uid);
				expect(runtime.gid, `Expected n8n container process GID to be ${HARDENED_GID}`).toBe(
					HARDENED_GID,
				);
				expect(runtime.pid1Uid, `Expected PID 1 in n8n container to run as UID ${uid}`).toBe(uid);
				expect(
					runtime.rootWriteErrorCode,
					'Expected writing to the root filesystem to fail with EROFS',
				).toBe('EROFS');
				expect(
					runtime.homeWritable,
					'Expected /home/node tmpfs mount to be writable by the non-root UID',
				).toBe(true);
				expect(
					probeOutput.execution.status,
					'Expected webhook execution to finish with success',
				).toBe('success');
			},
		});
	},
);
