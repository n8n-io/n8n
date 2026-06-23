import type { Page, TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

interface HeapSnapshotResult {
	success: boolean;
	filePath?: string;
	sizeBytes?: number;
	sizeMB?: number;
	message?: string;
}

const HEAP_USED_QUERY = 'n8n_nodejs_heap_size_used_bytes / 1024 / 1024';
const HEAP_TOTAL_QUERY = 'n8n_nodejs_heap_size_total_bytes / 1024 / 1024';
const RSS_QUERY = 'n8n_process_resident_memory_bytes / 1024 / 1024';
const PSS_QUERY = 'n8n_process_pss_bytes / 1024 / 1024';

export async function measurePerformance(
	page: Page,
	actionName: string,
	actionFn: () => Promise<void>,
): Promise<number> {
	await page.evaluate((name) => performance.mark(`${name}-start`), actionName);
	await actionFn();
	return await page.evaluate((name) => {
		performance.mark(`${name}-end`);
		performance.measure(name, `${name}-start`, `${name}-end`);
		const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure;
		return measure.duration;
	}, actionName);
}

export async function getAllPerformanceMetrics(page: Page) {
	return await page.evaluate(() => {
		const metrics: Record<string, number> = {};
		const measures = performance.getEntriesByType('measure') as PerformanceMeasure[];
		measures.forEach((m) => (metrics[m.name] = m.duration));
		return metrics;
	});
}

/** Attach a performance metric for collection by the metrics reporter */
export async function attachMetric(
	testInfo: TestInfo,
	metricName: string,
	value: number,
	unit?: string,
	dimensions?: Record<string, string | number>,
): Promise<void> {
	await testInfo.attach(`metric:${metricName}`, {
		body: JSON.stringify({ value, unit, dimensions }),
	});

	// Currents native format — surfaces metrics in their analytics dashboard
	testInfo.annotations.push({
		type: 'currents:metric',
		description: JSON.stringify({
			name: metricName,
			value,
			type: Number.isInteger(value) ? 'integer' : 'float',
			...(unit && { unit: unit.toLowerCase() }),
		}),
	});
}

export interface StableHeapOptions {
	maxWaitMs?: number;
	checkIntervalMs?: number;
	thresholdMB?: number;
	stableReadingsRequired?: number;
	logGC?: boolean;
}

export interface StableHeapResult {
	heapUsedMB: number;
	heapTotalMB: number;
	rssMB: number;
	pssMB: number | null;
	nonHeapOverheadMB: number;
	stabilizationTimeMs: number;
	readingsCount: number;
}

/**
 * Trigger GC and wait for heap memory to stabilize.
 * Collects RSS, PSS, and heap total samples during the stabilization window
 * and returns median values to reduce point-in-time noise.
 */
export async function getStableHeap(
	baseUrl: string,
	metrics: MetricsHelper,
	options: StableHeapOptions = {},
): Promise<StableHeapResult> {
	const {
		maxWaitMs = 60000,
		checkIntervalMs = 5000,
		thresholdMB = 2,
		stableReadingsRequired = 2,
		logGC = true,
	} = options;

	await triggerGC(baseUrl, logGC);
	return await waitForStableMemory(metrics, {
		maxWaitMs,
		checkIntervalMs,
		thresholdMB,
		stableReadingsRequired,
	});
}

async function triggerGC(baseUrl: string, log: boolean): Promise<void> {
	const response = await fetch(`${baseUrl}/rest/e2e/gc`, { method: 'POST' });
	if (!response.ok) {
		throw new Error(`GC endpoint returned ${response.status}: ${response.statusText}`);
	}
	const result = (await response.json()) as { data?: { success: boolean; message: string } };
	if (!result.data?.success) {
		throw new Error(`GC failed: ${result.data?.message ?? 'Unknown error'}`);
	}
	if (log) {
		console.log(`[GC] ${result.data.message}`);
	}
}

interface StabilizationConfig {
	maxWaitMs: number;
	checkIntervalMs: number;
	thresholdMB: number;
	stableReadingsRequired: number;
}

interface MemorySamples {
	heapTotal: number[];
	rss: number[];
	pss: number[];
}

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function collectAdditionalSamples(
	metrics: MetricsHelper,
	samples: MemorySamples,
): Promise<void> {
	try {
		const results = await Promise.all([
			metrics.query(HEAP_TOTAL_QUERY),
			metrics.query(RSS_QUERY),
			metrics.query(PSS_QUERY),
		]);

		if (results[0]?.[0]) samples.heapTotal.push(results[0][0].value);
		if (results[1]?.[0]) samples.rss.push(results[1][0].value);
		if (results[2]?.[0]) samples.pss.push(results[2][0].value);
	} catch {
		// Non-critical, skip this sample
	}
}

async function waitForStableMemory(
	metrics: MetricsHelper,
	config: StabilizationConfig,
): Promise<StableHeapResult> {
	const { maxWaitMs, checkIntervalMs, thresholdMB, stableReadingsRequired } = config;
	const startTime = Date.now();
	let lastValue = 0;
	let stableCount = 0;
	let readingsCount = 0;
	const samples: MemorySamples = { heapTotal: [], rss: [], pss: [] };

	while (Date.now() - startTime < maxWaitMs) {
		const result = await metrics.waitForMetric(HEAP_USED_QUERY, {
			timeoutMs: checkIntervalMs,
			intervalMs: 1000,
		});

		if (result) {
			readingsCount++;
			const currentValue = result.value;

			await collectAdditionalSamples(metrics, samples);

			const delta = Math.abs(currentValue - lastValue);

			if (lastValue > 0 && delta < thresholdMB) {
				stableCount++;
				if (stableCount >= stableReadingsRequired) {
					const stabilizationTimeMs = Date.now() - startTime;
					const heapUsedMB = currentValue;
					const heapTotalMB = median(samples.heapTotal);
					const rssMB = median(samples.rss);
					const pssMB = samples.pss.length > 0 ? median(samples.pss) : null;
					// Can theoretically go negative if RSS/heapTotal medians come from slightly
					// different sample windows. A negative value would indicate a measurement
					// timing issue — don't clamp to 0, surface it for investigation.
					const nonHeapOverheadMB = rssMB - heapTotalMB;

					console.log(
						`[STABILIZATION] Memory stabilized after ${stabilizationTimeMs}ms (${readingsCount} readings)\n` +
							`  Heap Used: ${heapUsedMB.toFixed(2)} MB\n` +
							`  Heap Total: ${heapTotalMB.toFixed(2)} MB (median of ${samples.heapTotal.length})\n` +
							`  RSS: ${rssMB.toFixed(2)} MB (median of ${samples.rss.length})\n` +
							`  PSS: ${pssMB?.toFixed(2) ?? 'N/A'} MB${pssMB !== null ? ` (median of ${samples.pss.length})` : ''}\n` +
							`  Non-Heap Overhead: ${nonHeapOverheadMB.toFixed(2)} MB`,
					);

					return {
						heapUsedMB,
						heapTotalMB,
						rssMB,
						pssMB,
						nonHeapOverheadMB,
						stabilizationTimeMs,
						readingsCount,
					};
				}
			} else {
				stableCount = 0;
			}
			lastValue = currentValue;
		}

		await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
	}

	throw new Error(
		`Memory did not stabilize within ${maxWaitMs}ms. ` +
			`Last: ${lastValue.toFixed(2)} MB (${readingsCount} readings)`,
	);
}

/**
 * Trigger a V8 heap snapshot on the n8n server, download it locally, and
 * return the local file path for programmatic analysis (e.g., memlab).
 */
export async function takeHeapSnapshot(
	baseUrl: string,
	testInfo: TestInfo,
	label: string,
): Promise<string | null> {
	// Step 1: Trigger snapshot on server
	const createRes = await fetch(`${baseUrl}/rest/e2e/heap-snapshot`, { method: 'POST' });
	if (!createRes.ok) {
		console.warn(`[HEAP-SNAPSHOT] Create failed: ${createRes.status}`);
		return null;
	}

	const result = (await createRes.json()) as { data?: HeapSnapshotResult };
	const snapshot = result.data;

	if (!snapshot?.success || !snapshot.filePath) {
		console.warn(`[HEAP-SNAPSHOT] Failed: ${snapshot?.message ?? 'Unknown error'}`);
		return null;
	}

	await attachMetric(testInfo, `heap-snapshot-${label}-size`, snapshot.sizeMB ?? 0, 'MB');

	// Step 2: Download the snapshot file from the server
	const filename = snapshot.filePath.split('/').pop()!;
	const downloadRes = await fetch(`${baseUrl}/rest/e2e/heap-snapshot/${filename}`);
	if (!downloadRes.ok || !downloadRes.body) {
		console.warn(`[HEAP-SNAPSHOT] Download failed: ${downloadRes.status}`);
		return null;
	}

	const localPath = `${testInfo.outputDir}/${label}.heapsnapshot`;
	await mkdir(testInfo.outputDir, { recursive: true });
	await pipeline(
		Readable.fromWeb(downloadRes.body as unknown as NodeReadableStream),
		createWriteStream(localPath),
	);

	console.log(`[HEAP-SNAPSHOT] "${label}" saved: ${localPath} (${snapshot.sizeMB} MB)`);

	return localPath;
}

// ---------------------------------------------------------------------------
// RSS breakdown via /proc/self/smaps
// ---------------------------------------------------------------------------

export interface RssMapping {
	name: string;
	rssMB: number;
	pssMB: number;
	count: number;
}

export interface RssBreakdown {
	processMemoryUsage: {
		rss: number;
		heapTotal: number;
		heapUsed: number;
		external: number;
		arrayBuffers: number;
	};
	rollup: Record<string, number> | null;
	mappings: RssMapping[] | null;
}

export interface RssBreakdownDiff {
	baselineRssMB: number;
	finalRssMB: number;
	deltaRssMB: number;
	topGrowers: Array<{ name: string; baselineRssMB: number; finalRssMB: number; deltaMB: number }>;
	topNew: Array<{ name: string; rssMB: number }>;
	rollupDiff: Record<string, { baseline: number; final: number; delta: number }> | null;
}

/**
 * Fetch the RSS breakdown from the server, save it to the output dir, and return parsed data.
 * Falls back gracefully on macOS / non-Linux (smaps not available).
 */
export async function captureRssBreakdown(
	baseUrl: string,
	outputDir: string,
	label: string,
): Promise<RssBreakdown | null> {
	try {
		const res = await fetch(`${baseUrl}/rest/e2e/memory-maps`);
		if (!res.ok) {
			console.warn(`[RSS] memory-maps endpoint returned ${res.status}`);
			return null;
		}

		const body = (await res.json()) as { data?: RssBreakdown & { raw?: string } };
		const data = body.data;
		if (!data) return null;

		await mkdir(outputDir, { recursive: true });

		// Save raw smaps if available
		if (data.raw) {
			await writeFile(`${outputDir}/${label}-smaps-raw.txt`, data.raw);
		}

		// Save parsed summary (without raw to keep it small)
		const summary: RssBreakdown = {
			processMemoryUsage: data.processMemoryUsage,
			rollup: data.rollup,
			mappings: data.mappings,
		};
		await writeFile(`${outputDir}/${label}-rss-breakdown.json`, JSON.stringify(summary, null, 2));

		// Log top mappings
		if (data.mappings && data.mappings.length > 0) {
			console.log(`[RSS] "${label}" breakdown (top 10 by RSS):`);
			for (const m of data.mappings.slice(0, 10)) {
				console.log(`  ${m.rssMB.toFixed(1)} MB  ${m.name} (${m.count} mappings)`);
			}
		}
		if (data.rollup) {
			console.log(
				`[RSS] "${label}" rollup: RSS=${data.rollup.RssMB ?? '?'} MB, ` +
					`Anon=${data.rollup.AnonymousMB ?? '?'} MB, ` +
					`Shared=${(data.rollup.Shared_CleanMB ?? 0) + (data.rollup.Shared_DirtyMB ?? 0)} MB`,
			);
		}

		return summary;
	} catch (error) {
		console.warn(`[RSS] Failed to capture breakdown: ${(error as Error).message}`);
		return null;
	}
}

/**
 * Diff two RSS breakdowns and return the top growers and new mappings.
 */
export function diffRssBreakdowns(baseline: RssBreakdown, final: RssBreakdown): RssBreakdownDiff {
	const baselineRssMB = baseline.processMemoryUsage.rss;
	const finalRssMB = final.processMemoryUsage.rss;

	// Diff per-mapping RSS
	const baseMap = new Map<string, number>();
	if (baseline.mappings) {
		for (const m of baseline.mappings) baseMap.set(m.name, m.rssMB);
	}

	const topGrowers: RssBreakdownDiff['topGrowers'] = [];
	const topNew: RssBreakdownDiff['topNew'] = [];

	if (final.mappings) {
		for (const m of final.mappings) {
			const baseRss = baseMap.get(m.name);
			if (baseRss !== undefined) {
				const delta = m.rssMB - baseRss;
				if (delta > 0.5) {
					topGrowers.push({
						name: m.name,
						baselineRssMB: baseRss,
						finalRssMB: m.rssMB,
						deltaMB: Math.round(delta * 10) / 10,
					});
				}
			} else if (m.rssMB > 0.5) {
				topNew.push({ name: m.name, rssMB: m.rssMB });
			}
		}
	}

	topGrowers.sort((a, b) => b.deltaMB - a.deltaMB);
	topNew.sort((a, b) => b.rssMB - a.rssMB);

	// Diff rollup categories
	let rollupDiff: RssBreakdownDiff['rollupDiff'] = null;
	if (baseline.rollup && final.rollup) {
		rollupDiff = {};
		const allKeys = new Set([...Object.keys(baseline.rollup), ...Object.keys(final.rollup)]);
		for (const key of allKeys) {
			const b = baseline.rollup[key] ?? 0;
			const f = final.rollup[key] ?? 0;
			if (Math.abs(f - b) > 0) {
				rollupDiff[key] = { baseline: b, final: f, delta: f - b };
			}
		}
	}

	return {
		baselineRssMB,
		finalRssMB,
		deltaRssMB: finalRssMB - baselineRssMB,
		topGrowers,
		topNew,
		rollupDiff,
	};
}
