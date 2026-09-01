import { AxeBuilder } from '@axe-core/playwright';
import type { Fixtures, Page, TestInfo } from '@playwright/test';
import type { Result, TagValue } from 'axe-core';
import { createHtmlReport, type CreateReport } from 'axe-html-reporter';

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
	/** Override the fixture page, for example when a journey creates a context for another user. */
	page?: Page;
};

type AnalyzeParams = {
	page: Page;
	include?: string;
	tags: TagValue[];
	disableRules: string[];
};

/** Seam so the checker can be unit tested without driving a real browser. */
export type A11yAnalyzer = (params: AnalyzeParams) => Promise<{ violations: A11yViolation[] }>;

export type A11yReporter = (report: CreateReport) => string;

type A11yCheckerOptions = {
	analyze?: A11yAnalyzer;
	report?: A11yReporter;
	reportOutputDir?: string;
	violationThreshold?: number;
};

const analyzeWithAxe: A11yAnalyzer = async ({ page, include, tags, disableRules }) => {
	let builder = new AxeBuilder({ page }).withTags(tags);
	if (include) builder = builder.include(include);
	if (disableRules.length > 0) builder = builder.disableRules(disableRules);
	return await builder.analyze();
};

/**
 * Runs axe-core against the page, scoped to a {@link A11yBucket}.
 *
 * A scan that couldn't run returns an empty array and logs a warning. Violations only
 * throw when they exceed a configured threshold.
 */
export class A11yChecker {
	private readonly analyze: A11yAnalyzer;
	private readonly report: A11yReporter;
	private readonly reportOutputDir?: string;
	private readonly violationThreshold?: number;
	private reportIndex = 0;

	constructor(
		private readonly page: Page,
		options: A11yCheckerOptions = {},
	) {
		this.analyze = options.analyze ?? analyzeWithAxe;
		this.report = options.report ?? createHtmlReport;
		this.reportOutputDir = options.reportOutputDir;
		this.violationThreshold = options.violationThreshold;
	}

	async check(bucket: A11yBucket, options: A11yCheckOptions = {}): Promise<A11yViolation[]> {
		const include = A11Y_BUCKETS[bucket];
		const page = options.page ?? this.page;

		let violations: A11yViolation[];
		try {
			({ violations } = await this.analyze({
				page,
				include,
				tags: options.tags ?? DEFAULT_A11Y_TAGS,
				disableRules: options.disableRules ?? [],
			}));
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			console.warn(`[a11y] Scan of bucket "${bucket}" did not run: ${reason}`);
			return [];
		}

		this.report({
			results: { violations, url: page.url() },
			options: this.reportOutputDir
				? {
						outputDirPath: this.reportOutputDir,
						outputDir: 'a11y',
						reportFileName: `${++this.reportIndex}-${bucket}.html`,
					}
				: undefined,
		});

		if (this.violationThreshold !== undefined && violations.length > this.violationThreshold) {
			throw new Error(
				`Accessibility scan of bucket "${bucket}" found ${violations.length} violations, exceeding the configured threshold of ${this.violationThreshold}`,
			);
		}

		return violations;
	}
}

function getViolationThreshold(): number | undefined {
	const configuredThreshold = process.env.A11Y_VIOLATION_THRESHOLD;
	if (configuredThreshold === undefined || configuredThreshold === '') return undefined;

	const threshold = Number(configuredThreshold);
	if (!Number.isInteger(threshold) || threshold < 0) {
		throw new Error('A11Y_VIOLATION_THRESHOLD must be a non-negative integer');
	}

	return threshold;
}

export type A11yTestFixtures = {
	a11y: A11yChecker;
};

type A11yFixtureDeps = {
	n8n: n8nPage;
};

/**
 * Accessibility fixture. Spread into `test.extend()` to expose `a11y.check(bucket)`.
 */
export const a11yFixtures: Fixtures<A11yTestFixtures & A11yFixtureDeps> = {
	a11y: async ({ n8n }, use, testInfo: TestInfo) => {
		await use(
			new A11yChecker(n8n.page, {
				reportOutputDir: testInfo.outputDir,
				violationThreshold: getViolationThreshold(),
			}),
		);
	},
};
