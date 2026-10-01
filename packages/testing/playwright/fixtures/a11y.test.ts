import type { Page } from '@playwright/test';
import { describe, expect, test, vi } from 'vitest';

import {
	A11Y_BUCKETS,
	A11Y_MAX_VIOLATIONS_ENV,
	A11yChecker,
	DEFAULT_A11Y_TAGS,
	a11yBudgetError,
	countA11yViolations,
	getA11yViolationBudget,
	type A11yAnalyzer,
	type A11yViolation,
} from './a11y';
import type { n8nPage } from '../pages/n8nPage';

const PAGE_URL = 'http://localhost:5678/home/workflows';

const page = { url: () => PAGE_URL } as Page;

function violation(id: string): A11yViolation {
	return { id, impact: 'serious', tags: [], description: '', help: '', helpUrl: '', nodes: [] };
}

describe('A11yChecker', () => {
	test('returns the violations axe found for the bucket', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [violation('label')] });

		const violations = await new A11yChecker(page, analyze).check('canvas');

		expect(violations).toEqual([violation('label')]);
	});

	test('scopes the scan to the bucket selector and the default WCAG tags', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [] });

		await new A11yChecker(page, analyze).check('ndv');

		expect(analyze).toHaveBeenCalledWith({
			page,
			include: A11Y_BUCKETS.ndv,
			tags: DEFAULT_A11Y_TAGS,
			disableRules: [],
		});
	});

	test('scans the whole document for the page bucket', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [] });

		await new A11yChecker(page, analyze).check('page');

		expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ include: undefined }));
	});

	test('passes through tag and rule overrides', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [] });

		await new A11yChecker(page, analyze).check('modal', {
			tags: ['wcag2a'],
			disableRules: ['color-contrast'],
		});

		expect(analyze).toHaveBeenCalledWith(
			expect.objectContaining({ tags: ['wcag2a'], disableRules: ['color-contrast'] }),
		);
	});

	test('returns an empty array instead of throwing when the scan fails', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const analyze = vi
			.fn<A11yAnalyzer>()
			.mockRejectedValue(new Error('No elements found for include'));

		const violations = await new A11yChecker(page, analyze).check('canvas');

		expect(violations).toEqual([]);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('canvas'));
		warn.mockRestore();
	});

	test('records each scan with its bucket and url', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [violation('label')] });
		const checker = new A11yChecker(page, analyze);

		await checker.check('canvas');
		await checker.check('sidebar');

		expect(checker.scans).toEqual([
			{ bucket: 'canvas', url: PAGE_URL, violations: [violation('label')] },
			{ bucket: 'sidebar', url: PAGE_URL, violations: [violation('label')] },
		]);
	});

	test('does not record a scan that could not run', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const analyze = vi.fn<A11yAnalyzer>().mockRejectedValue(new Error('axe failed'));
		const checker = new A11yChecker(page, analyze);

		await checker.check('canvas');

		expect(checker.scans).toEqual([]);
		vi.restoreAllMocks();
	});

	test('scans another user page while reporting into the same scan list', async () => {
		const otherUrl = 'http://localhost:5678/projects/1/executions';
		const otherPage = { url: () => otherUrl } as Page;
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [] });
		const checker = new A11yChecker(page, analyze);

		await checker.for({ page: otherPage } as n8nPage).check('page');

		expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ page: otherPage }));
		expect(checker.scans).toEqual([{ bucket: 'page', url: otherUrl, violations: [] }]);
	});
});

describe('getA11yViolationBudget', () => {
	test('is undefined when the env var is unset, so checks stay non-blocking', () => {
		expect(getA11yViolationBudget({})).toBeUndefined();
		expect(getA11yViolationBudget({ [A11Y_MAX_VIOLATIONS_ENV]: '  ' })).toBeUndefined();
	});

	test('reads a non-negative integer budget', () => {
		expect(getA11yViolationBudget({ [A11Y_MAX_VIOLATIONS_ENV]: '0' })).toBe(0);
		expect(getA11yViolationBudget({ [A11Y_MAX_VIOLATIONS_ENV]: '12' })).toBe(12);
	});

	test('falls back to non-blocking on a malformed value', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		expect(getA11yViolationBudget({ [A11Y_MAX_VIOLATIONS_ENV]: 'strict' })).toBeUndefined();
		expect(getA11yViolationBudget({ [A11Y_MAX_VIOLATIONS_ENV]: '-1' })).toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(2);

		warn.mockRestore();
	});
});

describe('a11yBudgetError', () => {
	const scans = [
		{
			bucket: 'page' as const,
			url: PAGE_URL,
			violations: [violation('label'), violation('region')],
		},
		{ bucket: 'sidebar' as const, url: PAGE_URL, violations: [] },
	];

	test('counts violations across every scan', () => {
		expect(countA11yViolations(scans)).toBe(2);
	});

	test('is undefined without a budget, however many violations there are', () => {
		expect(a11yBudgetError(scans, undefined)).toBeUndefined();
	});

	test('is undefined while the violations stay within budget', () => {
		expect(a11yBudgetError(scans, 2)).toBeUndefined();
	});

	test('names the offending rules once the budget is exceeded', () => {
		const error = a11yBudgetError(scans, 1);

		expect(error?.message).toContain('2 accessibility violations');
		expect(error?.message).toContain('allows 1');
		expect(error?.message).toContain('page: label, region');
	});
});
