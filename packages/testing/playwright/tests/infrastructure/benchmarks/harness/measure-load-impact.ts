import type { TestInfo } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';

import { DockerStatsSampler } from './docker-stats-fallback';
import type { UiScenarioResult } from './loop-ui-scenario';
import {
	attachReportMetrics,
	buildAndAttachRunReport,
	renderRunReport,
	reportContainerStats,
	reportDiagnostics,
	reportJaegerTraces,
	reportPgQueryBreakdown,
	reportPgSaturation,
} from './orchestration';
import type { BenchmarkDimensions, ThroughputInfo } from '../../../../utils/benchmark';

export interface LoadDriver<T = unknown> {
	name: string;
	run: (signal: AbortSignal) => Promise<T>;
}

export interface MeasureLoadImpactOptions {
	services: ServiceHelpers;
	testInfo: TestInfo;
	drivers: LoadDriver[];
	dimensions?: BenchmarkDimensions;
}

export async function measureLoadImpact(options: MeasureLoadImpactOptions): Promise<void> {
	const { services, testInfo, drivers, dimensions: extraDims = {} } = options;
	if (drivers.length === 0) throw new Error('measureLoadImpact requires at least one driver');
	testInfo.setTimeout(15 * 60 * 1000);

	const dimensions: BenchmarkDimensions = {
		...extraDims,
		drivers: drivers.map((d) => d.name).join('+'),
	};

	await services.postgres.resetStatStatements();
	const walBaseline = await services.postgres.pgStatWal();
	const sampler = new DockerStatsSampler();
	sampler.start();

	console.log(`[MEASURE] ${drivers.map((d) => d.name).join(' + ')}`);
	const controller = new AbortController();
	const start = Date.now();
	const driverPromises = drivers.map(async (d) => await d.run(controller.signal));
	await Promise.race(driverPromises);
	controller.abort();
	const settled = await Promise.allSettled(driverPromises);
	const durationMs = Date.now() - start;
	const elapsedSec = durationMs / 1000;

	const results = settled.map((s, i) => ({
		name: drivers[i].name,
		result: s.status === 'fulfilled' ? s.value : undefined,
	}));

	const diagnostics = await reportDiagnostics({ testInfo, services, durationMs, dimensions });
	const { containers, source: containersSource } = await reportContainerStats(diagnostics, sampler);
	const pgQueries = await reportPgQueryBreakdown({ services, durationMs });
	const pgSaturation = await reportPgSaturation({ services, durationMs });
	await reportJaegerTraces({ testInfo, services, since: start });

	const throughput = throughputFromUi(results, elapsedSec);
	const report = await buildAndAttachRunReport({
		testInfo,
		scenario: { spec: testInfo.title, dimensions },
		duration: { totalMs: durationMs, wallClockMs: durationMs },
		throughput,
		containers,
		containersSource,
		diagnostics,
		pgQueries,
		pgSaturation,
		walBaseline,
	});
	await attachReportMetrics(testInfo, report, dimensions);
	renderRunReport(report);
}

function isUiScenarioResult(x: unknown): x is UiScenarioResult {
	return typeof x === 'object' && x !== null && (x as { kind?: string }).kind === 'ui-scenario';
}

function throughputFromUi(
	results: Array<{ name: string; result: unknown }>,
	elapsedSec: number,
): ThroughputInfo {
	const ui = results.find((r) => isUiScenarioResult(r.result))?.result as
		| UiScenarioResult
		| undefined;
	if (!ui || ui.latenciesMs.length === 0) return {};
	const sorted = [...ui.latenciesMs].sort((a, b) => a - b);
	const pct = (p: number) =>
		sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
	return {
		execPerSec: ui.latenciesMs.length / elapsedSec,
		totalCompleted: ui.latenciesMs.length,
		p50Ms: pct(0.5),
		p99Ms: pct(0.95),
	};
}
