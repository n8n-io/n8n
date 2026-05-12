import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import { kafkaDriver } from '../../../../utils/benchmark';
import { runLoadTest } from '../harness/load-harness';

const SHAPES = [{ nodeCount: 10 }, { nodeCount: 30 }, { nodeCount: 60 }] as const;
const MESSAGE_COUNT = 5_000;

test.use({ capability: benchConfig('node-count-scaling', { kafka: true, workers: 1 }) });

test.describe(
	'How does throughput scale with workflow complexity?',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'node-count-scaling' },
		],
	},
	() => {
		test(`Kafka trigger + noop, 1KB payload, ramp node count ${SHAPES.map((s) => s.nodeCount).join('→')} (1 main + 1 worker)`, async ({
			api,
			services,
		}, testInfo) => {
			const results: Array<{
				nodeCount: number;
				throughputPerSecond: number;
				actionsPerSecond: number;
				durationMs: number;
				p99DurationMs: number;
			}> = [];

			for (const { nodeCount } of SHAPES) {
				console.log(`\n[RAMP] Stage: node count = ${nodeCount}`);
				const handle = await kafkaDriver.setup({
					api,
					services,
					scenario: { nodeCount, payloadSize: '1KB', nodeOutputSize: 'noop', partitions: 3 },
				});
				const metrics = await runLoadTest({
					handle,
					api,
					services,
					testInfo,
					load: { type: 'preloaded', count: MESSAGE_COUNT },
					trigger: 'kafka',
					timeoutMs: 600_000,
					variant: `${nodeCount} nodes`,
				});
				results.push({
					nodeCount,
					throughputPerSecond: metrics.throughputPerSecond,
					actionsPerSecond: metrics.throughputPerSecond * nodeCount,
					durationMs: metrics.durationMs,
					p99DurationMs: metrics.p99DurationMs,
				});
			}

			// Two perspectives: workflows/sec (declines as nodes grow) and
			// actions/sec (workflows × nodes — should stay flat or rise).
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
