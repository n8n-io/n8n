import type { Page } from '@playwright/test';
import { describe, expect, test, vi } from 'vitest';

import {
	A11Y_BUCKETS,
	A11yChecker,
	DEFAULT_A11Y_TAGS,
	type A11yAnalyzer,
	type A11yViolation,
} from './a11y';

const page = {} as Page;

function violation(id: string): A11yViolation {
	return { id, impact: 'serious', tags: [], description: '', help: '', helpUrl: '', nodes: [] };
}

describe('A11yChecker', () => {
	test('returns the violations axe found for the bucket', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [violation('label')] });

		const violations = await new A11yChecker(page, analyze).check('canvas');

		expect(violations).toEqual([violation('label')]);
	});

	test('records results from each completed checkpoint', async () => {
		const canvasViolation = violation('label');
		const analyze = vi
			.fn<A11yAnalyzer>()
			.mockResolvedValueOnce({ violations: [canvasViolation] })
			.mockResolvedValueOnce({ violations: [] });
		const checker = new A11yChecker(page, analyze);

		await checker.check('canvas');
		await checker.check('ndv');

		expect(checker.getResults()).toEqual([
			{ bucket: 'canvas', violations: [canvasViolation] },
			{ bucket: 'ndv', violations: [] },
		]);
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
		const checker = new A11yChecker(page, analyze);

		const violations = await checker.check('canvas');

		expect(violations).toEqual([]);
		expect(checker.getResults()).toEqual([]);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('canvas'));
		warn.mockRestore();
	});
});
