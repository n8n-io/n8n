import type { Page, TestInfo } from '@playwright/test';
import { createHtmlReport } from 'axe-html-reporter';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	A11Y_BUCKETS,
	A11yChecker,
	A11Y_MAX_VIOLATIONS_ENV,
	A11yGate,
	DEFAULT_A11Y_TAGS,
	getMaxA11yViolations,
	type A11yAnalyzer,
	type A11yBucket,
	type A11yViolation,
} from './a11y';

// Wrap (not replace) the reporter so tests exercise the real report writing
// and can still simulate a failed write per test.
vi.mock('axe-html-reporter', async (importOriginal) => {
	const actual = await importOriginal<typeof import('axe-html-reporter')>();
	return { ...actual, createHtmlReport: vi.fn(actual.createHtmlReport) };
});

const page = {} as Page;

function violation(id: string): A11yViolation {
	return {
		id,
		impact: 'serious',
		tags: [],
		description: '',
		help: `Help for ${id}`,
		helpUrl: '',
		nodes: [],
	};
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
});

describe('getMaxA11yViolations', () => {
	test('is undefined when the env var is unset or blank', () => {
		expect(getMaxA11yViolations({})).toBeUndefined();
		expect(getMaxA11yViolations({ [A11Y_MAX_VIOLATIONS_ENV]: '' })).toBeUndefined();
		expect(getMaxA11yViolations({ [A11Y_MAX_VIOLATIONS_ENV]: '  ' })).toBeUndefined();
	});

	test('parses non-negative integers', () => {
		expect(getMaxA11yViolations({ [A11Y_MAX_VIOLATIONS_ENV]: '0' })).toBe(0);
		expect(getMaxA11yViolations({ [A11Y_MAX_VIOLATIONS_ENV]: '5' })).toBe(5);
	});

	test('falls back to non-blocking for invalid values', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		expect(getMaxA11yViolations({ [A11Y_MAX_VIOLATIONS_ENV]: 'abc' })).toBeUndefined();
		expect(getMaxA11yViolations({ [A11Y_MAX_VIOLATIONS_ENV]: '-1' })).toBeUndefined();
		expect(getMaxA11yViolations({ [A11Y_MAX_VIOLATIONS_ENV]: '2.5' })).toBeUndefined();

		expect(warn).toHaveBeenCalledTimes(3);
		warn.mockRestore();
	});
});

describe('A11yGate', () => {
	let outputDir: string;
	let testInfo: TestInfo;

	beforeEach(() => {
		outputDir = mkdtempSync(join(tmpdir(), 'a11y-gate-'));
		testInfo = {
			title: 'journey reports a11y state',
			outputDir,
			outputPath: (...segments: string[]) => join(outputDir, ...segments),
			attach: vi.fn(async () => {}),
		} as unknown as TestInfo;
	});

	afterEach(() => {
		vi.clearAllMocks();
		rmSync(outputDir, { recursive: true, force: true });
	});

	function gateFor(
		violationsByBucket: Partial<Record<A11yBucket, A11yViolation[]>>,
		maxViolations?: number,
	): A11yGate {
		const analyze = vi.fn<A11yAnalyzer>().mockImplementation(({ include }) => {
			const bucket = (Object.keys(A11Y_BUCKETS) as A11yBucket[]).find(
				(key) => A11Y_BUCKETS[key] === include,
			);
			return Promise.resolve({ violations: (bucket && violationsByBucket[bucket]) ?? [] });
		});
		return new A11yGate(new A11yChecker(page, analyze), testInfo, maxViolations);
	}

	test('records violations without failing when no budget is set', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const gate = gateFor({ canvas: [violation('button-name'), violation('label')] });

		await expect(gate.checkpoint('canvas')).resolves.toBeUndefined();
		await expect(gate.checkpoint('ndv', { tags: ['wcag2a'] })).resolves.toBeUndefined();

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('button-name'));
		warn.mockRestore();
	});

	test('writes and attaches an HTML report per checkpoint', async () => {
		const gate = gateFor({ canvas: [violation('color-contrast')] });

		await gate.checkpoint('canvas');

		expect(existsSync(join(outputDir, 'a11y', 'a11y-canvas-report.html'))).toBe(true);
		expect(testInfo.attach).toHaveBeenCalledWith('a11y-report-canvas', {
			path: join(outputDir, 'a11y', 'a11y-canvas-report.html'),
			contentType: 'text/html',
		});
		expect(createHtmlReport).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.objectContaining({ projectKey: testInfo.title }),
			}),
		);
	});

	test('attaches a report even when the scan finds nothing', async () => {
		const gate = gateFor({});

		await gate.checkpoint('ndv');

		expect(existsSync(join(outputDir, 'a11y', 'a11y-ndv-report.html'))).toBe(true);
		expect(testInfo.attach).toHaveBeenCalledTimes(1);
	});

	test('fails once cumulative violations exceed the budget', async () => {
		const gate = gateFor({ canvas: [violation('label')], ndv: [violation('label')] }, 1);

		await expect(gate.checkpoint('canvas')).resolves.toBeUndefined();
		await expect(gate.checkpoint('ndv')).rejects.toThrow(
			`found 2 accessibility violation(s) across its checkpoints (canvas: 1, ndv: 1), exceeding the ${A11Y_MAX_VIOLATIONS_ENV} budget of 1`,
		);
		// The failing checkpoint still reported before throwing.
		expect(testInfo.attach).toHaveBeenCalledTimes(2);
	});

	test('stays green when cumulative violations match the budget exactly', async () => {
		const gate = gateFor({ canvas: [violation('label')], ndv: [violation('label')] }, 2);

		await expect(gate.checkpoint('canvas')).resolves.toBeUndefined();
		await expect(gate.checkpoint('ndv')).resolves.toBeUndefined();
	});

	test('keeps the journey green when the HTML report cannot be written', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.mocked(createHtmlReport).mockImplementationOnce(() => 'Failed to create HTML report');
		const gate = gateFor({ canvas: [violation('label')] });

		await expect(gate.checkpoint('canvas')).resolves.toBeUndefined();

		expect(testInfo.attach).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('No HTML report was written'));
		warn.mockRestore();
	});
});
