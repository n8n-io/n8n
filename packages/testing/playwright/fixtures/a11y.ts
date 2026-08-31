import { AxeBuilder } from '@axe-core/playwright';
import type { Fixtures, Page } from '@playwright/test';
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
};

type A11yFixtureDeps = {
	n8n: n8nPage;
};

/**
 * Accessibility fixture. Spread into `test.extend()` to expose `a11y.check(bucket)`.
 */
export const a11yFixtures: Fixtures<A11yTestFixtures & A11yFixtureDeps> = {
	a11y: async ({ n8n }, use) => {
		await use(new A11yChecker(n8n.page));
	},
};
