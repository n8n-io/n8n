import { AxeBuilder } from '@axe-core/playwright';
import type { Fixtures, Page, TestInfo } from '@playwright/test';
import type { Result, TagValue } from 'axe-core';
import { createHtmlReport } from 'axe-html-reporter';
import { existsSync } from 'node:fs';

import type { n8nPage } from '../pages/n8nPage';

/** A single axe-core violation, re-exported so callers don't depend on axe-core directly. */
export type A11yViolation = Result;

/**
 * Named slices of the UI an accessibility scan can be pointed at. Scoping keeps a
 * scan focused on the surface a journey just exercised, instead of re-reporting
 * the same shell violations on every page.
 *
 * `page` has no selector on purpose: axe then scans the whole document, including
 * the `<html>` element that document-level rules (lang, page-has-heading-one) need.
 */
export const A11Y_BUCKETS = {
	page: undefined,
	canvas: '[data-test-id="canvas-wrapper"]',
	ndv: '[data-test-id="ndv"]',
	'node-creator': '[data-test-id="node-creator"]',
	sidebar: '#side-menu',
	modal: '[role="dialog"]',
} as const satisfies Record<string, string | undefined>;

export type A11yBucket = keyof typeof A11Y_BUCKETS;

/** WCAG 2.1 A + AA, the level n8n targets. */
export const DEFAULT_A11Y_TAGS: TagValue[] = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export type A11yCheckOptions = {
	/** Override the rule tags axe runs with. Defaults to {@link DEFAULT_A11Y_TAGS}. */
	tags?: TagValue[];
	/** Rule ids to skip for this scan, e.g. a known-broken third party widget. */
	disableRules?: string[];
};

type AnalyzeParams = {
	page: Page;
	include?: string;
	tags: TagValue[];
	disableRules: string[];
};

/** Seam so the checker can be unit tested without driving a real browser. */
export type A11yAnalyzer = (params: AnalyzeParams) => Promise<{ violations: A11yViolation[] }>;

const analyzeWithAxe: A11yAnalyzer = async ({ page, include, tags, disableRules }) => {
	let builder = new AxeBuilder({ page }).withTags(tags);
	if (include) builder = builder.include(include);
	if (disableRules.length > 0) builder = builder.disableRules(disableRules);
	return await builder.analyze();
};

/**
 * Runs axe-core against the page, scoped to a {@link A11yBucket}.
 *
 * `check` never throws - not when the bucket isn't on screen, not when axe itself
 * fails. A scan that couldn't run returns an empty array and logs a warning, so an
 * accessibility check bolted onto an existing journey can't turn that journey red.
 * Callers decide what to do with the violations they get back.
 */
export class A11yChecker {
	constructor(
		private readonly page: Page,
		private readonly analyze: A11yAnalyzer = analyzeWithAxe,
	) {}

	async check(bucket: A11yBucket, options: A11yCheckOptions = {}): Promise<A11yViolation[]> {
		const include = A11Y_BUCKETS[bucket];

		try {
			const { violations } = await this.analyze({
				page: this.page,
				include,
				tags: options.tags ?? DEFAULT_A11Y_TAGS,
				disableRules: options.disableRules ?? [],
			});
			return violations;
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			console.warn(`[a11y] Scan of bucket "${bucket}" did not run: ${reason}`);
			return [];
		}
	}
}

export type A11yTestFixtures = {
	a11y: A11yChecker;
	/** Per-test gate that pairs `a11y.check` with HTML reporting and an optional violation budget. */
	a11yGate: A11yGate;
};

type A11yFixtureDeps = {
	n8n: n8nPage;
};

/**
 * Maximum number of violations an a11y-gated journey may accumulate before its
 * test fails. Unset (the default) keeps journeys non-blocking so existing
 * violations never break CI; set it to a non-negative integer to enforce a
 * budget (the test fails once the running total exceeds it).
 */
export const A11Y_MAX_VIOLATIONS_ENV = 'A11Y_MAX_VIOLATIONS';

export function getMaxA11yViolations(
	env: Record<string, string | undefined> = process.env,
): number | undefined {
	const raw = env[A11Y_MAX_VIOLATIONS_ENV];
	if (raw === undefined || raw.trim() === '') return undefined;

	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 0) {
		console.warn(
			`[a11y] Ignoring ${A11Y_MAX_VIOLATIONS_ENV}="${raw}": expected a non-negative integer. Accessibility checks stay non-blocking.`,
		);
		return undefined;
	}
	return parsed;
}

type A11yCheckpointRecord = { bucket: A11yBucket; violations: A11yViolation[] };

/**
 * Journey-facing counterpart to {@link A11yChecker}: runs `a11y.check` at a
 * checkpoint, always writes an axe HTML report for the scan, and enforces the
 * violation budget from {@link A11Y_MAX_VIOLATIONS_ENV}.
 *
 * The budget is cumulative across one gate's checkpoints (one gate per test),
 * so a journey counts everything it found, not per-scan spikes. Reports live in
 * the test's output directory and are attached to the test result, which means
 * Playwright keeps them exactly when the run fails (`preserve-output:
 * failures-only`) and they ride along in the CI `test-results/` artifact.
 */
export class A11yGate {
	private readonly checkpoints: A11yCheckpointRecord[] = [];

	constructor(
		private readonly a11y: A11yChecker,
		private readonly testInfo: TestInfo,
		private readonly maxViolations?: number,
	) {}

	async checkpoint(bucket: A11yBucket, options: A11yCheckOptions = {}): Promise<void> {
		const violations = await this.a11y.check(bucket, options);
		this.checkpoints.push({ bucket, violations });

		if (violations.length > 0) {
			console.warn(
				`[a11y] ${this.testInfo.title} — bucket "${bucket}" has ${violations.length} violation(s):\n${describeViolations(violations)}`,
			);
		}

		await this.attachHtmlReport(bucket, violations);

		const total = this.totalViolations();
		if (this.maxViolations !== undefined && total > this.maxViolations) {
			throw new Error(
				`[a11y] "${this.testInfo.title}" found ${total} accessibility violation(s) across its checkpoints ` +
					`(${this.checkpoints.map((c) => `${c.bucket}: ${c.violations.length}`).join(', ')}), exceeding the ` +
					`${A11Y_MAX_VIOLATIONS_ENV} budget of ${this.maxViolations}. ` +
					'HTML reports are attached to this test result.',
			);
		}
	}

	private totalViolations(): number {
		return this.checkpoints.reduce((sum, checkpoint) => sum + checkpoint.violations.length, 0);
	}

	private async attachHtmlReport(bucket: A11yBucket, violations: A11yViolation[]): Promise<void> {
		const reportFileName = `a11y-${bucket}-report.html`;
		const reportPath = this.testInfo.outputPath('a11y', reportFileName);
		createHtmlReport({
			results: { violations },
			options: {
				reportFileName,
				outputDir: 'a11y',
				outputDirPath: this.testInfo.outputDir,
				projectKey: this.testInfo.title,
				customSummary: `Bucket: ${bucket}`,
			},
		});

		// axe-html-reporter swallows its own errors and only warns, so the file
		// may be missing - reporting must never turn a journey red.
		if (!existsSync(reportPath)) {
			console.warn(
				`[a11y] No HTML report was written for bucket "${bucket}" in "${this.testInfo.title}"; skipping attachment.`,
			);
			return;
		}

		await this.testInfo.attach(`a11y-report-${bucket}`, {
			path: reportPath,
			contentType: 'text/html',
		});
	}
}

function describeViolations(violations: A11yViolation[]): string {
	return violations
		.map((violation) => `  - ${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help}`)
		.join('\n');
}

/**
 * Accessibility fixture. Spread into `test.extend()` to expose `a11y.check(bucket)`
 * plus the journey-facing `a11yGate.checkpoint(bucket)`.
 */
export const a11yFixtures: Fixtures<A11yTestFixtures & A11yFixtureDeps> = {
	a11y: async ({ n8n }, use) => {
		await use(new A11yChecker(n8n.page));
	},
	a11yGate: async ({ a11y }, use, testInfo) => {
		await use(new A11yGate(a11y, testInfo, getMaxA11yViolations()));
	},
};
