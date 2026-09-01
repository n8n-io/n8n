import type { Page } from '@playwright/test';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
	A11Y_BUCKETS,
	A11yChecker,
	DEFAULT_A11Y_TAGS,
	type A11yAnalyzer,
	type A11yReporter,
	type A11yViolation,
} from './a11y';

const page = { url: () => 'https://n8n.test/workflow/1' } as Page;

function violation(id: string): A11yViolation {
	return { id, impact: 'serious', tags: [], description: '', help: '', helpUrl: '', nodes: [] };
}

describe('A11yChecker', () => {
	const report = vi.fn<A11yReporter>().mockReturnValue('');
	beforeEach(() => vi.clearAllMocks());

	test('returns the violations axe found for the bucket', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [violation('label')] });

		const violations = await new A11yChecker(page, { analyze, report }).check('canvas');

		expect(violations).toEqual([violation('label')]);
		expect(report).toHaveBeenCalledWith(
			expect.objectContaining({
				results: { violations: [violation('label')], url: 'https://n8n.test/workflow/1' },
			}),
		);
	});

	test('scopes the scan to the bucket selector and the default WCAG tags', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [] });

		await new A11yChecker(page, { analyze, report }).check('ndv');

		expect(analyze).toHaveBeenCalledWith({
			page,
			include: A11Y_BUCKETS.ndv,
			tags: DEFAULT_A11Y_TAGS,
			disableRules: [],
		});
	});

	test('scans the whole document for the page bucket', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [] });

		await new A11yChecker(page, { analyze, report }).check('page');

		expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ include: undefined }));
	});

	test('passes through tag and rule overrides', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [] });

		await new A11yChecker(page, { analyze, report }).check('modal', {
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

		const violations = await new A11yChecker(page, { analyze, report }).check('canvas');

		expect(violations).toEqual([]);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('canvas'));
		warn.mockRestore();
	});

	test('throws when violations exceed the configured threshold after reporting', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [violation('label')] });

		await expect(
			new A11yChecker(page, { analyze, report, violationThreshold: 0 }).check('canvas'),
		).rejects.toThrow('exceeding the configured threshold of 0');
		expect(report).toHaveBeenCalled();
	});

	test('does not throw for violations when no threshold is configured', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [violation('label')] });

		await expect(new A11yChecker(page, { analyze, report }).check('canvas')).resolves.toEqual([
			violation('label'),
		]);
	});

	test('creates a uniquely named HTML report for every check', async () => {
		const analyze = vi.fn<A11yAnalyzer>().mockResolvedValue({ violations: [] });
		const checker = new A11yChecker(page, { analyze, report, reportOutputDir: '/test-output' });

		await checker.check('canvas');
		await checker.check('ndv');

		expect(report).toHaveBeenNthCalledWith(1, {
			results: { violations: [], url: 'https://n8n.test/workflow/1' },
			options: {
				outputDirPath: '/test-output',
				outputDir: 'a11y',
				reportFileName: '1-canvas.html',
			},
		});
		expect(report).toHaveBeenNthCalledWith(2, {
			results: { violations: [], url: 'https://n8n.test/workflow/1' },
			options: {
				outputDirPath: '/test-output',
				outputDir: 'a11y',
				reportFileName: '2-ndv.html',
			},
		});
	});
});
