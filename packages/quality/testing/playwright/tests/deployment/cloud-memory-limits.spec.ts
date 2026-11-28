import { isRecord } from '@n8n/utils/is-record';
import { expect, test } from '@playwright/test';
import type { N8NStack } from 'n8n-containers/stack';
import { nanoid } from 'nanoid';
import { execFileSync } from 'node:child_process';

import {
	assertDistrolessRunner,
	assertPointerCompression,
	runDeploymentCell,
	type DeploymentProbe,
} from './probe';

type StackContainer = N8NStack['containers'][number];

const MIB = 1024 * 1024;
// Matches the smallest Cloud plan quota used in tests/performance/ (0.75 GiB RAM, 0.5 CPU).
const CLOUD_STARTER_MEMORY_MIB = 768;
const CLOUD_STARTER_MEMORY_BYTES = CLOUD_STARTER_MEMORY_MIB * MIB;
const CLOUD_STARTER_CPU = 0.5;
const CLOUD_STARTER_NANO_CPUS = Math.ceil(CLOUD_STARTER_CPU * 1_000_000_000);

// ~4.3 MiB JSON request expanded to 4,000 items across main and the distroless runner,
// staying below Express's default 16 MiB N8N_PAYLOAD_SIZE_MAX while exercising large-payload execution.
const LARGE_RECORD_COUNT = 4_000;
const MATCH_THRESHOLD = 2_000;
const RECORD_PAYLOAD_BYTES = 1_024;

interface ContainerMemoryInspection {
	memoryBytes: number;
	memorySwapBytes: number;
	nanoCpus: number;
	running: boolean;
	oomKilled: boolean;
	restartCount: number;
	pid: number;
	startedAt: string;
}

interface ContainerMemoryRuntimeProbe {
	pointerCompression: boolean;
	heapSizeLimitBytes: number;
	cgroupMemoryLimitBytes: number | null;
	cgroupOomKills: number | null;
}

interface LargePayloadRunResult {
	workflowId: string;
	token: string;
	requestBytes: number;
	status: number;
	responseBody: unknown;
	responseText: string;
}

const RUNTIME_MEMORY_PROBE_SCRIPT = `
const fs = require('node:fs');
const v8 = require('node:v8');

function readTrimmed(filePath) {
	try {
		return fs.readFileSync(filePath, 'utf8').trim();
	} catch {
		return null;
	}
}

function parsePositiveInteger(raw) {
	if (!raw || !/^\\d+$/.test(raw)) return null;
	const parsed = Number(raw);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

const cgroupLimitRaw =
	readTrimmed('/sys/fs/cgroup/memory.max') ??
	readTrimmed('/sys/fs/cgroup/memory/memory.limit_in_bytes');
const cgroupMemoryLimitBytes = parsePositiveInteger(cgroupLimitRaw);

let cgroupOomKills = null;
const memoryEvents = readTrimmed('/sys/fs/cgroup/memory.events');
if (memoryEvents) {
	const line = memoryEvents.split('\\n').find((entry) => entry.startsWith('oom_kill '));
	if (line) {
		const parsed = Number.parseInt(line.slice('oom_kill '.length).trim(), 10);
		cgroupOomKills = Number.isNaN(parsed) ? null : parsed;
	}
}

const heapStats = v8.getHeapStatistics();
process.stdout.write(JSON.stringify({
	pointerCompression: Boolean(process.config.variables.v8_enable_pointer_compression),
	heapSizeLimitBytes: heapStats.heap_size_limit,
	cgroupMemoryLimitBytes,
	cgroupOomKills,
}));
`;

function requireMainContainer(stack: N8NStack): StackContainer {
	const main = stack.findContainers(/-n8n(-main-1)?$/)[0];
	if (!main) {
		throw new Error('Expected a main n8n container in the stack');
	}
	return main;
}

function inspectContainerMemory(containerId: string): ContainerMemoryInspection {
	const rawContainer = execFileSync('docker', ['inspect', containerId], { encoding: 'utf8' });
	const containerList: unknown = JSON.parse(rawContainer);
	const containerEntry = Array.isArray(containerList) ? containerList[0] : null;
	if (!isRecord(containerEntry)) {
		throw new Error(`docker inspect returned no container entry for ${containerId}`);
	}

	const hostConfig = isRecord(containerEntry.HostConfig) ? containerEntry.HostConfig : {};
	const state = isRecord(containerEntry.State) ? containerEntry.State : {};

	return {
		memoryBytes: typeof hostConfig.Memory === 'number' ? hostConfig.Memory : -1,
		memorySwapBytes: typeof hostConfig.MemorySwap === 'number' ? hostConfig.MemorySwap : -1,
		nanoCpus: typeof hostConfig.NanoCpus === 'number' ? hostConfig.NanoCpus : -1,
		running: state.Running === true,
		oomKilled: state.OOMKilled === true,
		restartCount:
			typeof containerEntry.RestartCount === 'number' ? containerEntry.RestartCount : -1,
		pid: typeof state.Pid === 'number' ? state.Pid : -1,
		startedAt: typeof state.StartedAt === 'string' ? state.StartedAt : '',
	};
}

async function probeContainerMemoryRuntime(
	container: StackContainer,
): Promise<ContainerMemoryRuntimeProbe> {
	const result = await container.exec(['node', '-e', RUNTIME_MEMORY_PROBE_SCRIPT]);
	if (result.exitCode !== 0) {
		throw new Error(
			`Container memory runtime probe failed on ${container.getName()}: ${result.output}`,
		);
	}

	const parsed: unknown = JSON.parse(result.stdout);
	if (!isRecord(parsed)) {
		throw new Error(
			`Unexpected memory runtime probe output on ${container.getName()}: ${result.output}`,
		);
	}

	return {
		pointerCompression: parsed.pointerCompression === true,
		heapSizeLimitBytes:
			typeof parsed.heapSizeLimitBytes === 'number' ? parsed.heapSizeLimitBytes : -1,
		cgroupMemoryLimitBytes:
			typeof parsed.cgroupMemoryLimitBytes === 'number' ? parsed.cgroupMemoryLimitBytes : null,
		cgroupOomKills: typeof parsed.cgroupOomKills === 'number' ? parsed.cgroupOomKills : null,
	};
}

async function runLargePayloadWorkflow(probe: DeploymentProbe): Promise<LargePayloadRunResult> {
	const token = nanoid(10);
	const webhookId = nanoid(12);
	const webhookPath = `probe-large-payload-${nanoid(8).toLowerCase()}`;

	const { id: workflowId, versionId } = await probe.createWorkflow({
		name: `Deployment Probe Large Payload (${token})`,
		active: false,
		nodes: [
			{
				id: 'webhook',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				webhookId,
				parameters: {
					httpMethod: 'POST',
					path: webhookPath,
					responseMode: 'lastNode',
					responseData: 'firstEntryJson',
					options: {},
				},
			},
			{
				id: 'expand',
				name: 'Expand Records',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [220, 0],
				parameters: {
					mode: 'runOnceForAllItems',
					language: 'javaScript',
					jsCode: [
						'const body = $input.first().json.body;',
						'return body.records.map((record) => ({',
						'  json: {',
						'    token: body.token,',
						'    index: record.index,',
						'    payload: record.content,',
						'    length: record.content.length,',
						'  },',
						'}));',
					].join('\n'),
				},
			},
			{
				id: 'filter',
				name: 'Filter First Half',
				type: 'n8n-nodes-base.if',
				typeVersion: 2.2,
				position: [440, 0],
				parameters: {
					conditions: {
						options: {
							caseSensitive: true,
							leftValue: '',
							typeValidation: 'strict',
							version: 2,
						},
						conditions: [
							{
								id: 'index-threshold',
								leftValue: '={{ $json.index }}',
								rightValue: MATCH_THRESHOLD,
								operator: {
									type: 'number',
									operation: 'lt',
								},
							},
						],
						combinator: 'and',
					},
					options: {},
				},
			},
			{
				id: 'summarize',
				name: 'Summarize Payload',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [660, 0],
				parameters: {
					mode: 'runOnceForAllItems',
					language: 'javaScript',
					jsCode: [
						'const items = $input.all();',
						'let matchedPayloadBytes = 0;',
						'for (const item of items) {',
						'  matchedPayloadBytes += item.json.length;',
						'}',
						'return [{',
						'  json: {',
						'    token: items[0]?.json.token ?? "",',
						'    matchedCount: items.length,',
						'    matchedPayloadBytes,',
						'  },',
						'}];',
					].join('\n'),
				},
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Expand Records', type: 'main', index: 0 }]] },
			'Expand Records': { main: [[{ node: 'Filter First Half', type: 'main', index: 0 }]] },
			'Filter First Half': { main: [[{ node: 'Summarize Payload', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	});

	await probe.activateWorkflow(workflowId, versionId);

	const filler = 'x'.repeat(RECORD_PAYLOAD_BYTES - 8);
	const records = Array.from({ length: LARGE_RECORD_COUNT }, (_, index) => ({
		index,
		// Prefix each record so string deduplication in V8 / flatted cannot collapse the payload.
		content: `${String(index).padStart(7, '0')}:${filler}`,
	}));
	const bodyBuffer = Buffer.from(JSON.stringify({ token, records }), 'utf8');

	const response = await probe.triggerWebhook(webhookPath, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		data: bodyBuffer,
		timeout: 60_000,
	});
	const responseText = await response.text();
	let responseBody: unknown = null;
	try {
		responseBody = JSON.parse(responseText);
	} catch {
		responseBody = null;
	}

	return {
		workflowId,
		token,
		requestBytes: bodyBuffer.byteLength,
		status: response.status(),
		responseBody,
		responseText,
	};
}

test(
	'Cloud plan memory limits (-pc + distroless under large payload)',
	{
		tag: '@cell:CRT-04',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: {
				resourceQuota: {
					cpu: CLOUD_STARTER_CPU,
				},
				n8nContainer: {
					memoryBytes: CLOUD_STARTER_MEMORY_BYTES,
					memorySwapBytes: CLOUD_STARTER_MEMORY_BYTES,
				},
			},
			probe: async ({ stack, probe }) => {
				const main = requireMainContainer(stack);
				const beforeState = inspectContainerMemory(main.getId());

				const largePayload = await runLargePayloadWorkflow(probe);
				const postWebhook = await probe.runWebhook();
				const health = await probe.checkHealth();
				const postSignIn = await probe.signIn();

				return {
					beforeState,
					largePayload,
					postWebhook,
					health,
					postSignIn,
				};
			},
			check: async ({ stack, version, probeOutput }) => {
				assertDistrolessRunner(stack);
				await assertPointerCompression(stack);

				const main = requireMainContainer(stack);
				const afterState = inspectContainerMemory(main.getId());

				expect(
					afterState.memoryBytes,
					`Expected n8n container HostConfig.Memory to enforce the Cloud starter ${CLOUD_STARTER_MEMORY_MIB} MiB limit (${CLOUD_STARTER_MEMORY_BYTES} bytes)`,
				).toBe(CLOUD_STARTER_MEMORY_BYTES);
				expect(
					afterState.memorySwapBytes,
					`Expected n8n container HostConfig.MemorySwap to equal HostConfig.Memory (${CLOUD_STARTER_MEMORY_BYTES} bytes) so swap is disabled`,
				).toBe(CLOUD_STARTER_MEMORY_BYTES);
				expect(
					afterState.nanoCpus,
					`Expected n8n container HostConfig.NanoCpus to enforce the ${CLOUD_STARTER_CPU} CPU quota`,
				).toBe(CLOUD_STARTER_NANO_CPUS);

				expect(
					afterState.running,
					'Expected n8n container to stay running after the large-payload workflow',
				).toBe(true);
				expect(afterState.oomKilled, 'Expected n8n container State.OOMKilled to remain false').toBe(
					false,
				);
				expect(afterState.restartCount, 'Expected n8n container RestartCount to remain 0').toBe(0);
				expect(
					afterState.pid,
					'Expected n8n container PID to remain unchanged (no crash or restart)',
				).toBe(probeOutput.beforeState.pid);
				expect(
					afterState.startedAt,
					'Expected n8n container StartedAt timestamp to remain unchanged',
				).toBe(probeOutput.beforeState.startedAt);

				const runtime = await probeContainerMemoryRuntime(main);
				expect(
					runtime.pointerCompression,
					'Expected V8 pointer compression to be enabled in the -pc container',
				).toBe(true);
				expect(
					runtime.cgroupMemoryLimitBytes,
					`Expected container cgroup memory limit to equal ${CLOUD_STARTER_MEMORY_BYTES} bytes`,
				).toBe(CLOUD_STARTER_MEMORY_BYTES);
				expect(
					runtime.heapSizeLimitBytes,
					'Expected V8 heap_size_limit to be positive',
				).toBeGreaterThan(0);
				expect(
					runtime.heapSizeLimitBytes,
					`Expected V8 heap_size_limit (${runtime.heapSizeLimitBytes} bytes) to stay within the ${CLOUD_STARTER_MEMORY_BYTES}-byte container cap`,
				).toBeLessThanOrEqual(CLOUD_STARTER_MEMORY_BYTES);
				if (runtime.cgroupOomKills !== null) {
					expect(
						runtime.cgroupOomKills,
						'Expected zero kernel OOM kills in cgroup memory.events',
					).toBe(0);
				}

				expect(
					probeOutput.largePayload.requestBytes,
					'Expected large-payload request body to exceed 4 MiB',
				).toBeGreaterThan(4 * MIB);
				expect(
					probeOutput.largePayload.status,
					`Expected large-payload webhook to complete cleanly with HTTP 200, got ${probeOutput.largePayload.status}: ${probeOutput.largePayload.responseText.slice(0, 400)}`,
				).toBe(200);
				expect(
					probeOutput.largePayload.responseBody,
					'Expected large-payload workflow to return the verified item summary',
				).toEqual({
					token: probeOutput.largePayload.token,
					matchedCount: MATCH_THRESHOLD,
					matchedPayloadBytes: MATCH_THRESHOLD * RECORD_PAYLOAD_BYTES,
				});

				expect(
					probeOutput.postWebhook.responseBody.echo,
					'Expected follow-up webhook probe to succeed after the large-payload workflow',
				).toBe(`probe:${probeOutput.postWebhook.token}`);
				expect(
					probeOutput.health.status,
					'Expected GET /healthz to return HTTP 200 after the large-payload workflow',
				).toBe(200);
				expect(probeOutput.health.body, 'Expected GET /healthz to report status ok').toEqual({
					status: 'ok',
				});
				expect(
					probeOutput.health.readinessStatus,
					'Expected GET /healthz/readiness to return HTTP 200 after the large-payload workflow',
				).toBe(200);
				expect(
					probeOutput.postSignIn.version,
					'Expected probe.signIn() to pass and report the same n8n version after the large-payload workflow',
				).toBe(version);
			},
		});
	},
);
