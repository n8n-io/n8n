import type { N8NConfig } from 'n8n-containers/stack';

import { test } from '../../../../fixtures/base';
import {
	BENCHMARK_BASE_CONFIG,
	STANDARD_QUEUE_ENV,
	STANDARD_WORKER_COUNT,
} from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import type { NodeOutputSize } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

const SHAPES: ReadonlyArray<{ outputSize: NodeOutputSize }> = [
	{ outputSize: 'noop' },
	{ outputSize: '10KB' },
	{ outputSize: '100KB' },
] as const;

const queueConfig: N8NConfig = {
	...BENCHMARK_BASE_CONFIG,
	services: [...BENCHMARK_BASE_CONFIG.services!, 'kafka'],
	workers: STANDARD_WORKER_COUNT,
	env: {
		...BENCHMARK_BASE_CONFIG.env,
		...STANDARD_QUEUE_ENV,
		TEST_ISOLATION: 'q-output-size-impact',
	},
};

test.use({ capability: queueConfig });

test.describe(
	'What is the impact of node output size on throughput?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'output-size-impact' },
		],
	},
	() => {
		const messageCount = 5_000;

		test(`Kafka trigger + 10 nodes, 1KB payload, ramp output size ${SHAPES.map((s) => s.outputSize).join('→')} (1 main + ${STANDARD_WORKER_COUNT} workers)`, async ({
			api,
			services,
		}, testInfo) => {
			const results: Array<{
				outputSize: NodeOutputSize;
				throughputPerSecond: number;
				totalCompleted: number;
				durationMs: number;
				avgDurationMs: number;
				p99DurationMs: number;
			}> = [];

			for (const shape of SHAPES) {
				console.log(`\n[RAMP] Stage: output size = ${shape.outputSize}`);
				const handle = await kafkaDriver.setup({
					api,
					services,
					scenario: {
						nodeCount: 10,
						payloadSize: '1KB',
						nodeOutputSize: shape.outputSize,
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
					outputSize: shape.outputSize,
					throughputPerSecond: metrics.throughputPerSecond,
					totalCompleted: metrics.totalCompleted,
					durationMs: metrics.durationMs,
					avgDurationMs: metrics.avgDurationMs,
					p99DurationMs: metrics.p99DurationMs,
				});
			}

			// Comparative summary across the ramp.
			const baseline = results[0];
			const lines = results.map((r) => {
				const pctOfBaseline = (r.throughputPerSecond / baseline.throughputPerSecond) * 100;
				const delta = r === baseline ? 'baseline' : `${(pctOfBaseline - 100).toFixed(0)}%`;
				return (
					`    ${r.outputSize.padStart(6)}:` +
					` ${r.throughputPerSecond.toFixed(1).padStart(7)} exec/s` +
					` | ${pctOfBaseline.toFixed(0).padStart(3)}% of baseline (${delta})` +
					` | duration ${(r.durationMs / 1000).toFixed(1)}s` +
					` | p99 ${r.p99DurationMs.toFixed(0)}ms`
				);
			});
			console.log(
				`\n[OUTPUT SIZE IMPACT SUMMARY] ${testInfo.title}\n` +
					`  Baseline: ${baseline.outputSize} = ${baseline.throughputPerSecond.toFixed(1)} exec/s\n` +
					lines.join('\n'),
			);
		});
	},
);
