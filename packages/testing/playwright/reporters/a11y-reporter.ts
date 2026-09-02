import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { createHtmlReport } from 'axe-html-reporter';
import { appendFileSync } from 'fs';

import {
	resolveCiMetricsWebhook,
	sendCiMetrics,
	type CiMetric,
	type CiMetricsWebhook,
} from './ci-metrics';
import {
	A11Y_ATTACHMENT_NAME,
	A11Y_MAX_VIOLATIONS_ENV,
	getA11yViolationBudget,
	type A11yBucket,
	type A11yScan,
	type A11yViolation,
} from '../fixtures/a11y';
import { resolveFromRoot } from '../utils/path-helper';

/** Written next to the Playwright HTML report; uploaded as its own CI artifact. */
const REPORT_DIR = 'a11y-report';
const REPORT_FILE = 'index.html';

const LOG_PREFIX = '[a11y]';

/** Groups the bucket rows in `qa_performance_metrics`. */
const A11Y_BENCHMARK_NAME = 'a11y-buckets';

type NodeResult = A11yViolation['nodes'][number];

/** Identifies a violating element, so retries of the same test don't double-count it. */
function nodeKey(node: NodeResult): string {
	return `${JSON.stringify(node.target)}::${node.html}`;
}

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'] as const;

/** The impacts axe reports, plus a fallback for a rule that carries none. */
export type A11yImpact = (typeof IMPACT_ORDER)[number] | 'unknown';

function impactOf(violation: A11yViolation): A11yImpact {
	return IMPACT_ORDER.find((impact) => impact === violation.impact) ?? 'unknown';
}

function impactRank(violation: A11yViolation): number {
	const index = IMPACT_ORDER.findIndex((impact) => impact === violation.impact);
	return index === -1 ? IMPACT_ORDER.length : index;
}

/**
 * Folds every scan of the run into one violation list, merging the nodes of a rule
 * that tripped on more than one screen. Elements are deduplicated, so a retried
 * test contributes its violations once rather than once per attempt.
 */
export function mergeA11yScans(scans: A11yScan[]): A11yViolation[] {
	const byRule = new Map<string, A11yViolation>();

	for (const scan of scans) {
		for (const violation of scan.violations) {
			const merged = byRule.get(violation.id);
			if (!merged) {
				byRule.set(violation.id, { ...violation, nodes: [...violation.nodes] });
				continue;
			}

			const seen = new Set(merged.nodes.map(nodeKey));
			for (const node of violation.nodes) {
				if (seen.has(nodeKey(node))) continue;
				seen.add(nodeKey(node));
				merged.nodes.push(node);
			}
		}
	}

	return [...byRule.values()].sort(
		(a, b) => impactRank(a) - impactRank(b) || b.nodes.length - a.nodes.length,
	);
}

/**
 * What one violating element adds to a bucket's score. Higher is worse, so a
 * bucket score trends towards zero as the bucket gets fixed, and one critical
 * element outweighs a handful of minor ones. A rule axe reports no impact for
 * scores as a minor one.
 */
export const A11Y_IMPACT_WEIGHTS: Record<A11yImpact, number> = {
	critical: 10,
	serious: 5,
	moderate: 3,
	minor: 1,
	unknown: 1,
};

/** What a run measured for one bucket. Emitted as a log line and as metrics. */
export type A11yBucketScore = {
	bucket: A11yBucket;
	/** How many times the run scanned this bucket. */
	scans: number;
	/** Distinct rules the bucket violated. */
	rules: number;
	/** Distinct violating elements. */
	elements: number;
	/** Weighted element total. See {@link A11Y_IMPACT_WEIGHTS}. */
	score: number;
	elementsByImpact: Record<A11yImpact, number>;
};

/**
 * Scores every bucket a run exercised, worst score first.
 *
 * The scans of one bucket are merged before they are counted, so a bucket a
 * journey scanned twice - or a retried test scanned again - scores the same as
 * one that was scanned once.
 */
export function scoreA11yBuckets(scans: A11yScan[]): A11yBucketScore[] {
	const byBucket = new Map<A11yBucket, A11yScan[]>();
	for (const scan of scans) {
		const group = byBucket.get(scan.bucket) ?? [];
		group.push(scan);
		byBucket.set(scan.bucket, group);
	}

	return [...byBucket]
		.map(([bucket, bucketScans]) => {
			const elementsByImpact: Record<A11yImpact, number> = {
				critical: 0,
				serious: 0,
				moderate: 0,
				minor: 0,
				unknown: 0,
			};
			let elements = 0;
			let score = 0;

			const violations = mergeA11yScans(bucketScans);
			for (const violation of violations) {
				const impact = impactOf(violation);
				elementsByImpact[impact] += violation.nodes.length;
				elements += violation.nodes.length;
				score += A11Y_IMPACT_WEIGHTS[impact] * violation.nodes.length;
			}

			return {
				bucket,
				scans: bucketScans.length,
				rules: violations.length,
				elements,
				score,
				elementsByImpact,
			};
		})
		.sort((a, b) => b.score - a.score || a.bucket.localeCompare(b.bucket));
}

/**
 * One `key=value` line for a bucket. A CI log can be grepped for a bucket score
 * without opening the report, and the numbers parse without a schema.
 */
export function formatA11yScoreLine(score: A11yBucketScore): string {
	const impacts = [...IMPACT_ORDER, 'unknown' as const]
		// 'unknown' is only interesting when axe left an impact out.
		.filter((impact) => impact !== 'unknown' || score.elementsByImpact.unknown > 0)
		.map((impact) => `${impact}=${score.elementsByImpact[impact]}`);

	return [
		`${LOG_PREFIX} score`,
		`bucket=${score.bucket}`,
		`scans=${score.scans}`,
		`rules=${score.rules}`,
		`elements=${score.elements}`,
		`score=${score.score}`,
		...impacts,
	].join(' ');
}

/** Bucket rows for `qa_performance_metrics`, the table the perf metrics use. */
export function a11yBucketMetrics(scores: A11yBucketScore[]): CiMetric[] {
	return scores.flatMap(({ bucket, scans, rules, elements, score }) => {
		const dimensions = { bucket, scans };
		return [
			{ metric_name: 'a11y-score', value: score, unit: 'points', dimensions },
			{ metric_name: 'a11y-violated-rules', value: rules, unit: 'rules', dimensions },
			{ metric_name: 'a11y-violating-elements', value: elements, unit: 'elements', dimensions },
		];
	});
}

export function parseA11yAttachment(body: Buffer | undefined): A11yScan[] {
	if (!body) return [];
	try {
		const parsed: unknown = JSON.parse(body.toString());
		return Array.isArray(parsed) ? (parsed as A11yScan[]) : [];
	} catch {
		return [];
	}
}

/**
 * Aggregates the axe scans every test attached into a single HTML report per run.
 *
 * Opt-in: `playwright.config.ts` only registers this reporter when
 * `PLAYWRIGHT_A11Y_REPORT` is set. The per-test scans are attached either way, so
 * a run without it still carries its raw axe results on the tests themselves.
 *
 * The report is written whether or not the run found violations - the budget
 * ({@link A11Y_MAX_VIOLATIONS_ENV}) is what decides if they fail the build, and it
 * is unset by default. Under sharding each shard writes the report for the specs
 * it ran.
 *
 * The run also gets a per-bucket score: one log line for each bucket it
 * exercised, plus the same numbers as metrics on the QA metrics webhook the perf
 * reporter uses. The metrics need `QA_METRICS_WEBHOOK_*`; without them the log
 * lines are still written.
 */
export class A11yReporter implements Reporter {
	/** Keyed by test so a retry replaces its earlier attempt instead of adding to it. */
	private readonly scansByTest = new Map<string, A11yScan[]>();

	private readonly webhook: CiMetricsWebhook;

	constructor(options: CiMetricsWebhook = {}) {
		this.webhook = resolveCiMetricsWebhook(options);
	}

	get scans(): A11yScan[] {
		return [...this.scansByTest.values()].flat();
	}

	onTestEnd(test: TestCase, result: TestResult): void {
		// Replaced unconditionally, empty list included: the last attempt is the
		// authoritative one, so a retry that recorded no scan must not leave the
		// earlier attempt's violations in the report.
		this.scansByTest.set(
			test.id,
			result.attachments
				.filter((attachment) => attachment.name === A11Y_ATTACHMENT_NAME)
				.flatMap((attachment) => parseA11yAttachment(attachment.body)),
		);
	}

	async onEnd(): Promise<void> {
		const scans = this.scans;
		if (scans.length === 0) return;

		const violations = mergeA11yScans(scans);
		const scores = scoreA11yBuckets(scans);
		const buckets = [...new Set(scans.map((scan) => scan.bucket))].sort();
		const budget = getA11yViolationBudget();
		const budgetLabel =
			budget === undefined ? `not set (${A11Y_MAX_VIOLATIONS_ENV})` : `${budget} per test`;

		const preamble = `${scans.length} scans across buckets: ${buckets.join(', ')}. Failure budget: ${budgetLabel}.`;

		createHtmlReport({
			results: { violations, url: scans[0]?.url },
			options: {
				outputDirPath: resolveFromRoot(),
				outputDir: REPORT_DIR,
				reportFileName: REPORT_FILE,
				projectKey: 'n8n',
				customSummary: preamble,
			},
		});

		console.log(
			`\n${LOG_PREFIX} ${violations.length} distinct rules violated across ${scans.length} scans ` +
				`- report: ${REPORT_DIR}/${REPORT_FILE}`,
		);

		for (const score of scores) {
			console.log(formatA11yScoreLine(score));
		}

		this.writeGitHubSummary(violations, preamble, scores);

		await this.sendBucketScores(scores);
	}

	/** Best-effort telemetry: a failed send warns and the run carries on. */
	private async sendBucketScores(scores: A11yBucketScore[]): Promise<void> {
		const sent = await sendCiMetrics({
			benchmarkName: A11Y_BENCHMARK_NAME,
			metrics: a11yBucketMetrics(scores),
			webhook: this.webhook,
			logPrefix: LOG_PREFIX,
		});

		if (sent > 0) {
			console.log(`${LOG_PREFIX} Sent ${sent} metrics for ${scores.length} buckets`);
		}
	}

	private writeGitHubSummary(
		violations: A11yViolation[],
		preamble: string,
		scores: A11yBucketScore[],
	): void {
		const summaryPath = process.env.GITHUB_STEP_SUMMARY;
		if (!summaryPath) return;

		const lines = ['## Accessibility', '', preamble, ''];

		lines.push('| Bucket | Scans | Rules | Elements | Score |', '| --- | --- | --- | --- | --- |');
		for (const score of scores) {
			lines.push(
				`| ${score.bucket} | ${score.scans} | ${score.rules} | ${score.elements} | ${score.score} |`,
			);
		}
		lines.push('');

		if (violations.length === 0) {
			lines.push('No violations found.');
		} else {
			lines.push('| Rule | Impact | Elements |', '| --- | --- | --- |');
			for (const violation of violations) {
				lines.push(`| ${violation.id} | ${violation.impact ?? '—'} | ${violation.nodes.length} |`);
			}
			lines.push('', 'Full report: `a11y-report` artifact.');
		}
		lines.push('');

		// Leading newline so we don't concatenate against whatever a previous
		// reporter wrote earlier in the same job.
		appendFileSync(summaryPath, `\n${lines.join('\n')}`);
	}
}

// eslint-disable-next-line import-x/no-default-export
export default A11yReporter;
