import type { N8NConfig } from 'n8n-containers/stack';

import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_BASE_CONFIG,
	STANDARD_QUEUE_ENV,
	STANDARD_WORKER_COUNT,
} from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

const SHAPES = [{ nodeCount: 10 }, { nodeCount: 30 }, { nodeCount: 60 }] as const;

const queueConfig: N8NConfig = {
	...BENCHMARK_BASE_CONFIG,
	services: [...BENCHMARK_BASE_CONFIG.services!, 'kafka'],
	workers: STANDARD_WORKER_COUNT,
	env: {
		...BENCHMARK_BASE_CONFIG.env,
		...STANDARD_QUEUE_ENV,
		TEST_ISOLATION: 'q-node-count-scaling',
	},
};

test.use({ capability: queueConfig });

test.describe(
	'How does throughput scale with workflow complexity?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'node-count-scaling' },
		],
	},
	() => {
		const messageCount = 5_000;

		test(`Kafka trigger + noop, 1KB payload, ramp node count ${SHAPES.map((s) => s.nodeCount).join('→')} (1 main + ${STANDARD_WORKER_COUNT} workers)`, async ({
			api,
			services,
		}, testInfo) => {
			const results: Array<{
				nodeCount: number;
				throughputPerSecond: number;
				actionsPerSecond: number;
				totalCompleted: number;
				durationMs: number;
				p99DurationMs: number;
			}> = [];

			for (const shape of SHAPES) {
				console.log(`\n[RAMP] Stage: node count = ${shape.nodeCount}`);
				const handle = await kafkaDriver.setup({
					api,
					services,
					scenario: {
						nodeCount: shape.nodeCount,
						payloadSize: '1KB',
						nodeOutputSize: 'noop',
						partitions: 3,
					},
				});
				const metrics = await runLoadTest({
					handle,
					api,
					services,
					testInfo,
					load: { type: 'preloaded', count: messageCount },
					trigger: 'kafka',
					timeoutMs: 600_000,
				});
				results.push({
					nodeCount: shape.nodeCount,
					throughputPerSecond: metrics.throughputPerSecond,
					actionsPerSecond: metrics.throughputPerSecond * shape.nodeCount,
					totalCompleted: metrics.totalCompleted,
					durationMs: metrics.durationMs,
					p99DurationMs: metrics.p99DurationMs,
				});
			}

			// Comparative summary across the ramp.
			// Two perspectives: workflows/sec (declines as nodes grow) and
			// actions/sec (workflows × nodes — should stay roughly flat or rise).
			const baseline = results[0];
			const lines = results.map((r) => {
				const pctOfBaseline = (r.throughputPerSecond / baseline.throughputPerSecond) * 100;
				const delta = r === baseline ? 'baseline' : `${(pctOfBaseline - 100).toFixed(0)}%`;
				return (
					`    ${String(r.nodeCount).padStart(2)} nodes:` +
					` ${r.throughputPerSecond.toFixed(1).padStart(7)} exec/s` +
					` | ${r.actionsPerSecond.toFixed(0).padStart(6)} actions/s` +
					` | ${pctOfBaseline.toFixed(0).padStart(3)}% of baseline (${delta})` +
					` | duration ${(r.durationMs / 1000).toFixed(1)}s` +
					` | p99 ${r.p99DurationMs.toFixed(0)}ms`
				);
			});
			console.log(
				`\n[NODE COUNT SCALING SUMMARY] ${testInfo.title}\n` +
					`  Baseline: ${baseline.nodeCount} nodes = ${baseline.throughputPerSecond.toFixed(1)} exec/s (${baseline.actionsPerSecond.toFixed(0)} actions/s)\n` +
					lines.join('\n'),
			);
		});
	},
);
