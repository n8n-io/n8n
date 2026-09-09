import { AxeBuilder } from '@axe-core/playwright';
import type { Fixtures, Page, TestInfo } from '@playwright/test';
import type { Result, TagValue } from 'axe-core';

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

/** One completed scan, kept so the run can be reported on after the fact. */
export type A11yScan = {
	bucket: A11yBucket;
	/** Where the scan happened, so a report can point back at the screen. */
	url: string;
	violations: A11yViolation[];
};

/** Attachment the a11y reporter reads a test's scans back out of. */
export const A11Y_ATTACHMENT_NAME = 'a11y-scans';

/**
 * Turns violations into failures once a run reports more than this many in a
 * single test. Unset - the default - keeps the checks reporting-only, so the
 * violations that already exist can't turn CI red.
 */
export const A11Y_MAX_VIOLATIONS_ENV = 'PLAYWRIGHT_A11Y_MAX_VIOLATIONS';

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
		/** Shared with every checker {@link for} derives, so one test reports one list. */
		readonly scans: A11yScan[] = [],
	) {}

	/**
	 * Rebinds the checker to another page while keeping the same scan list.
	 * Journeys that act as a second user get a fresh `n8nPage` from
	 * `n8n.start.withUser()`, and that page - not the fixture's - is the one to scan.
	 */
	for(target: n8nPage): A11yChecker {
		return new A11yChecker(target.page, this.analyze, this.scans);
	}

	async check(bucket: A11yBucket, options: A11yCheckOptions = {}): Promise<A11yViolation[]> {
		const include = A11Y_BUCKETS[bucket];

		try {
			const { violations } = await this.analyze({
				page: this.page,
				include,
				tags: options.tags ?? DEFAULT_A11Y_TAGS,
				disableRules: options.disableRules ?? [],
			});
			this.scans.push({ bucket, url: this.page.url(), violations });
			return violations;
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			console.warn(`[a11y] Scan of bucket "${bucket}" did not run: ${reason}`);
			return [];
		}
	}
}

/**
 * How many violations a single test may report before it fails. Unset, empty or
 * malformed all mean "no budget", which is what keeps the default non-blocking.
 */
export function getA11yViolationBudget(env: NodeJS.ProcessEnv = process.env): number | undefined {
	const raw = env[A11Y_MAX_VIOLATIONS_ENV]?.trim();
	if (!raw) return undefined;

	const budget = Number(raw);
	if (!Number.isInteger(budget) || budget < 0) {
		console.warn(
			`[a11y] Ignoring ${A11Y_MAX_VIOLATIONS_ENV}="${raw}", expected a non-negative integer. Checks stay non-blocking.`,
		);
		return undefined;
	}
	return budget;
}

export function countA11yViolations(scans: A11yScan[]): number {
	return scans.reduce((total, scan) => total + scan.violations.length, 0);
}

/** The error a test fails with when it blows its budget, or `undefined` if it didn't. */
export function a11yBudgetError(scans: A11yScan[], budget: number | undefined): Error | undefined {
	if (budget === undefined) return undefined;

	const total = countA11yViolations(scans);
	if (total <= budget) return undefined;

	const perBucket = scans
		.filter((scan) => scan.violations.length > 0)
		.map((scan) => `  ${scan.bucket}: ${scan.violations.map((v) => v.id).join(', ')}`)
		.join('\n');

	return new Error(
		`${total} accessibility violations, ${A11Y_MAX_VIOLATIONS_ENV} allows ${budget}.\n${perBucket}\n` +
			'See the a11y-report artifact for the full report.',
	);
}

export type A11yTestFixtures = {
	a11y: A11yChecker;
};

type A11yFixtureDeps = {
	n8n: n8nPage;
};

/**
 * Hands the scans to the reporter and applies the budget. Enforcement is skipped
 * for a test that already failed - a budget error there would bury the real one.
 */
async function reportA11yScans(scans: A11yScan[], testInfo: TestInfo): Promise<void> {
	if (scans.length === 0) return;

	await testInfo.attach(A11Y_ATTACHMENT_NAME, {
		body: JSON.stringify(scans),
		contentType: 'application/json',
	});

	if (testInfo.errors.length > 0) return;

	const error = a11yBudgetError(scans, getA11yViolationBudget());
	if (error) throw error;
}

/**
 * Accessibility fixture. Spread into `test.extend()` to expose `a11y.check(bucket)`.
 */
export const a11yFixtures: Fixtures<A11yTestFixtures & A11yFixtureDeps> = {
	a11y: async ({ n8n }, use, testInfo) => {
		const checker = new A11yChecker(n8n.page);
		await use(checker);
		await reportA11yScans(checker.scans, testInfo);
	},
};
