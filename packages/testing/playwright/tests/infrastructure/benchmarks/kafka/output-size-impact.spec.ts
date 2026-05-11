import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import type { NodeOutputSize } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

const SHAPES: ReadonlyArray<{ outputSize: NodeOutputSize }> = [
	{ outputSize: 'noop' },
	{ outputSize: '10KB' },
	{ outputSize: '100KB' },
] as const;
const MESSAGE_COUNT = 5_000;

test.use({ capability: benchConfig('output-size-impact', { kafka: true, workers: 1 }) });

test.describe(
	'What is the impact of node output size on throughput?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'output-size-impact' },
		],
	},
	() => {
		test(`Kafka trigger + 10 nodes, 1KB payload, ramp output size ${SHAPES.map((s) => s.outputSize).join('→')} (1 main + 1 worker)`, async ({
			api,
			services,
		}, testInfo) => {
			const results: Array<{
				outputSize: NodeOutputSize;
				throughputPerSecond: number;
				durationMs: number;
				p99DurationMs: number;
			}> = [];

			for (const { outputSize } of SHAPES) {
				console.log(`\n[RAMP] Stage: output size = ${outputSize}`);
				const handle = await kafkaDriver.setup({
					api,
					services,
					scenario: {
						nodeCount: 10,
						payloadSize: '1KB',
						nodeOutputSize: outputSize,
						partitions: 3,
					},
				});
				const metrics = await runLoadTest({
					handle,
					api,
					services,
					testInfo,
					load: { type: 'preloaded', count: MESSAGE_COUNT },
					trigger: 'kafka',
					timeoutMs: 600_000,
					variant: `${outputSize} output`,
				});
				results.push({
					outputSize,
					throughputPerSecond: metrics.throughputPerSecond,
					durationMs: metrics.durationMs,
					p99DurationMs: metrics.p99DurationMs,
				});
			}

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
