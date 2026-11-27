import { isRecord } from '@n8n/utils/is-record';
import { expect, test } from '@playwright/test';
import type { N8NStack } from 'n8n-containers/stack';
import { nanoid } from 'nanoid';

import { assertN8nImage, runDeploymentCell } from './probe';

const PROBE_HOOK_PATH = '/tmp/outbound-proxy-probe-hook.js';
const MAIN_RESULT_PATH = '/tmp/outbound-proxy-probe-main.json';
const WORKER_RESULT_PATH = '/tmp/outbound-proxy-probe-worker.json';

interface OutboundProbeResult {
	role: string;
	statusCode: number;
	body: Record<string, unknown> | null;
}

/**
 * Builds an external hook file that issues a default-agent `http.get` call
 * from main on `workflow.activate` and from the worker on `workflow.postExecute`.
 *
 * `N8N_OUTBOUND_PROXY_MODE` controls whether non-main processes install the
 * global `http(s).Agent` proxy wrapper, so using Node's default agent exercises
 * the exact setting under test.
 */
function buildOutboundProbeHook(): string {
	return `'use strict';
const fs = require('node:fs');
const http = require('node:http');

const targetBase = process.env.OUTBOUND_PROXY_PROBE_TARGET;
const mainToken = process.env.OUTBOUND_PROXY_PROBE_MAIN_TOKEN;
const workerToken = process.env.OUTBOUND_PROXY_PROBE_WORKER_TOKEN;
const isWorker = process.argv.includes('worker');

function sendProbe(role, token, resultPath) {
	const url = targetBase + '?probe=' + encodeURIComponent(token);
	return new Promise((resolve, reject) => {
		const req = http.get(url, { timeout: 10000 }, (res) => {
			let rawBody = '';
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				rawBody += chunk;
			});
			res.on('end', () => {
				let parsedBody = null;
				try {
					parsedBody = JSON.parse(rawBody);
				} catch {
					parsedBody = null;
				}
				const payload = JSON.stringify({
					role,
					statusCode: res.statusCode ?? 0,
					body: parsedBody,
				});
				const tempPath = resultPath + '.tmp';
				fs.writeFileSync(tempPath, payload, 'utf8');
				fs.renameSync(tempPath, resultPath);
				if (res.statusCode !== 200) {
					reject(new Error('Outbound probe (' + role + ') returned HTTP ' + String(res.statusCode)));
					return;
				}
				resolve();
			});
		});
		req.on('error', reject);
		req.on('timeout', () => {
			req.destroy(new Error('Outbound probe (' + role + ') timed out'));
		});
	});
}

module.exports = {
	workflow: {
		activate: [
			async () => {
				if (!isWorker) {
					await sendProbe('main', mainToken, '${MAIN_RESULT_PATH}');
				}
			},
		],
		postExecute: [
			async () => {
				if (isWorker) {
					await sendProbe('worker', workerToken, '${WORKER_RESULT_PATH}');
				}
			},
		],
	},
};
`;
}

async function readProbeResult(
	container: N8NStack['containers'][number],
	filePath: string,
): Promise<OutboundProbeResult | null> {
	const execResult = await container.exec(['cat', filePath]);
	if (execResult.exitCode !== 0) {
		return null;
	}
	const parsed: unknown = JSON.parse(execResult.output);
	if (!isRecord(parsed)) {
		return null;
	}
	const role = typeof parsed.role === 'string' ? parsed.role : '';
	const statusCode = typeof parsed.statusCode === 'number' ? parsed.statusCode : 0;
	const body = isRecord(parsed.body) ? parsed.body : null;
	return { role, statusCode, body };
}

test(
	'Outbound proxy (main-only)',
	{
		tag: '@cell:ENV-19',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		const projectName = `n8n-env19-${nanoid(8).toLowerCase()}`;
		const mainToken = `main-${nanoid(8).toLowerCase()}`;
		const workerToken = `worker-${nanoid(8).toLowerCase()}`;
		const targetBaseUrl = `http://${projectName}-n8n:5678/healthz`;

		await runDeploymentCell({
			stack: {
				projectName,
				workers: 1,
				services: ['proxy'],
				files: [
					{
						target: PROBE_HOOK_PATH,
						content: buildOutboundProbeHook(),
					},
				],
				env: {
					N8N_OUTBOUND_PROXY_MODE: 'main-only',
					EXTERNAL_HOOK_FILES: PROBE_HOOK_PATH,
					OUTBOUND_PROXY_PROBE_TARGET: targetBaseUrl,
					OUTBOUND_PROXY_PROBE_MAIN_TOKEN: mainToken,
					OUTBOUND_PROXY_PROBE_WORKER_TOKEN: workerToken,
				},
			},
			probe: async ({ stack, probe }) => {
				await stack.services.proxy.reset();
				await stack.services.proxy.createGetExpectation(
					'/healthz',
					{ via: 'proxy', role: 'main' },
					{ probe: mainToken },
				);
				await stack.services.proxy.createGetExpectation(
					'/healthz',
					{ via: 'proxy', role: 'worker' },
					{ probe: workerToken },
				);

				const webhook = await probe.runWebhook();
				const execution = await probe.readExecution(webhook.workflowId);
				return { webhook, execution };
			},
			check: async ({ stack }) => {
				assertN8nImage(stack);

				expect(
					stack.serviceResults.proxy,
					'Expected a MockServer proxy container in the stack',
				).toBeDefined();

				const mainContainer = stack.findContainers(/-n8n(-main-1)?$/)[0];
				const workerContainer = stack.findContainers(/-n8n-worker-1$/)[0];
				expect(mainContainer, 'Expected a main n8n container in the stack').toBeDefined();
				expect(workerContainer, 'Expected a worker n8n container in the stack').toBeDefined();

				const mainResult = await readProbeResult(mainContainer, MAIN_RESULT_PATH);
				expect(mainResult, 'Expected main outbound HTTP probe to run and succeed').toEqual({
					role: 'main',
					statusCode: 200,
					body: { via: 'proxy', role: 'main' },
				});

				expect(
					await stack.services.proxy.wasRequestMade(
						{
							method: 'GET',
							path: '/healthz',
							queryStringParameters: { probe: [mainToken] },
						},
						1,
					),
					'Expected main outbound HTTP call to pass through MockServer proxy',
				).toBe(true);

				let workerResult: OutboundProbeResult | null = null;
				await expect
					.poll(
						async () => {
							workerResult = await readProbeResult(workerContainer, WORKER_RESULT_PATH);
							return workerResult;
						},
						{
							timeout: 15_000,
							message: 'Expected worker outbound HTTP probe to write its result',
						},
					)
					.not.toBeNull();

				expect(
					workerResult,
					'Expected worker outbound HTTP probe to reach main /healthz directly without proxy',
				).toEqual({
					role: 'worker',
					statusCode: 200,
					body: { status: 'ok' },
				});

				expect(
					await stack.services.proxy.wasRequestMade(
						{
							method: 'GET',
							path: '/healthz',
							queryStringParameters: { probe: [workerToken] },
						},
						0,
					),
					'Expected worker outbound HTTP call to bypass MockServer proxy in main-only mode',
				).toBe(true);
			},
		});
	},
);
