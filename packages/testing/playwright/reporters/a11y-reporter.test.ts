import type { TestCase, TestResult } from '@playwright/test/reporter';
import { describe, expect, test } from 'vitest';

import {
	a11yBucketMetrics,
	A11yReporter,
	formatA11yScoreLine,
	mergeA11yScans,
	parseA11yAttachment,
	scoreA11yBuckets,
} from './a11y-reporter';
import { A11Y_ATTACHMENT_NAME, type A11yScan, type A11yViolation } from '../fixtures/a11y';

type NodeResult = A11yViolation['nodes'][number];

// Only the fields the merge keys on; the check arrays axe fills in are noise here.
function node(target: string, html = `<${target} />`): NodeResult {
	return { target: [target], html } as NodeResult;
}

function violation(
	id: string,
	nodes: NodeResult[],
	impact: A11yViolation['impact'] = 'serious',
): A11yViolation {
	return { id, impact, tags: [], description: '', help: '', helpUrl: '', nodes };
}

function scan(
	bucket: A11yScan['bucket'],
	violations: A11yViolation[],
	url = 'http://localhost:5678/home/workflows',
): A11yScan {
	return { bucket, url, violations };
}

describe('mergeA11yScans', () => {
	test('merges the nodes a rule tripped on across scans', () => {
		const merged = mergeA11yScans([
			scan('page', [violation('label', [node('input')])]),
			scan('sidebar', [violation('label', [node('select')])]),
		]);

		expect(merged).toHaveLength(1);
		expect(merged[0].nodes.map((n) => n.html)).toEqual(['<input />', '<select />']);
	});

	test('counts an element once when two scans report it', () => {
		const merged = mergeA11yScans([
			scan('page', [violation('label', [node('input')])]),
			scan('page', [violation('label', [node('input')])]),
		]);

		expect(merged[0].nodes).toHaveLength(1);
	});

	test('does not mutate the scans it was handed', () => {
		const first = scan('page', [violation('label', [node('input')])]);
		const second = scan('sidebar', [violation('label', [node('select')])]);

		mergeA11yScans([first, second]);

		expect(first.violations[0].nodes).toHaveLength(1);
	});

	test('orders the most severe rules first, then the most widespread', () => {
		const merged = mergeA11yScans([
			scan('page', [
				violation('minor-rule', [node('a')], 'minor'),
				violation('serious-few', [node('b')]),
				violation('serious-many', [node('c'), node('d')]),
				violation('critical-rule', [node('e')], 'critical'),
			]),
		]);

		expect(merged.map((v) => v.id)).toEqual([
			'critical-rule',
			'serious-many',
			'serious-few',
			'minor-rule',
		]);
	});
});

describe('scoreA11yBuckets', () => {
	test('scores each bucket the run exercised', () => {
		const scores = scoreA11yBuckets([
			scan('page', [violation('label', [node('input')])]),
			scan('page', [violation('region', [node('main')], 'moderate')]),
			scan('sidebar', []),
		]);

		expect(scores.map((s) => s.bucket)).toEqual(['page', 'sidebar']);
		expect(scores[0]).toMatchObject({ bucket: 'page', scans: 2, rules: 2, elements: 2, score: 8 });
		expect(scores[1]).toMatchObject({
			bucket: 'sidebar',
			scans: 1,
			rules: 0,
			elements: 0,
			score: 0,
		});
	});

	test('counts an element once when the bucket was scanned twice', () => {
		const scores = scoreA11yBuckets([
			scan('canvas', [violation('label', [node('input')])]),
			scan('canvas', [violation('label', [node('input')])]),
		]);

		expect(scores[0]).toMatchObject({ scans: 2, rules: 1, elements: 1, score: 5 });
	});

	test('counts an element once when two rules trip on it, at its worst impact', () => {
		const button = node('button');

		const [score] = scoreA11yBuckets([
			scan('canvas', [
				violation('color-contrast', [button], 'serious'),
				violation('button-name', [button], 'critical'),
			]),
		]);

		expect(score).toMatchObject({ rules: 2, elements: 1, score: 10 });
		expect(score.elementsByImpact).toMatchObject({ critical: 1, serious: 0 });
	});

	test('counts the same markup on two screens as two elements', () => {
		const scores = scoreA11yBuckets([
			scan(
				'sidebar',
				[violation('label', [node('input')])],
				'http://localhost:5678/home/workflows',
			),
			scan(
				'sidebar',
				[violation('label', [node('input')])],
				'http://localhost:5678/home/credentials',
			),
		]);

		expect(scores[0]).toMatchObject({ scans: 2, rules: 1, elements: 2, score: 10 });
	});

	test('weights the elements by impact', () => {
		const [score] = scoreA11yBuckets([
			scan('ndv', [
				violation('critical-rule', [node('a')], 'critical'),
				violation('serious-rule', [node('b'), node('c')]),
				violation('minor-rule', [node('d')], 'minor'),
			]),
		]);

		expect(score.elementsByImpact).toEqual({
			critical: 1,
			serious: 2,
			moderate: 0,
			minor: 1,
			unknown: 0,
		});
		expect(score.score).toBe(10 + 2 * 5 + 1);
	});

	test('scores a rule without an impact as a minor one', () => {
		const [score] = scoreA11yBuckets([scan('modal', [violation('odd-rule', [node('a')], null)])]);

		expect(score.elementsByImpact.unknown).toBe(1);
		expect(score.score).toBe(1);
	});

	test('orders the worst bucket first', () => {
		const scores = scoreA11yBuckets([
			scan('sidebar', [violation('label', [node('a')], 'minor')]),
			scan('canvas', [violation('label', [node('b')], 'critical')]),
		]);

		expect(scores.map((s) => s.bucket)).toEqual(['canvas', 'sidebar']);
	});
});

describe('formatA11yScoreLine', () => {
	test('writes one greppable line for a bucket', () => {
		const [score] = scoreA11yBuckets([
			scan('canvas', [violation('label', [node('input'), node('select')])]),
		]);

		expect(formatA11yScoreLine(score)).toBe(
			'[a11y] score bucket=canvas scans=1 rules=1 elements=2 score=10 critical=0 serious=2 moderate=0 minor=0',
		);
	});

	test('reports the elements axe gave no impact for', () => {
		const [score] = scoreA11yBuckets([scan('modal', [violation('odd-rule', [node('a')], null)])]);

		expect(formatA11yScoreLine(score)).toContain('unknown=1');
	});
});

describe('a11yBucketMetrics', () => {
	test('emits one metric triple for each bucket, keyed by bucket', () => {
		const metrics = a11yBucketMetrics(
			scoreA11yBuckets([scan('canvas', [violation('label', [node('input')])])]),
		);

		expect(metrics).toEqual([
			{
				metric_name: 'a11y-score',
				value: 5,
				unit: 'points',
				dimensions: { bucket: 'canvas', scans: 1 },
			},
			{
				metric_name: 'a11y-violated-rules',
				value: 1,
				unit: 'rules',
				dimensions: { bucket: 'canvas', scans: 1 },
			},
			{
				metric_name: 'a11y-violating-elements',
				value: 1,
				unit: 'elements',
				dimensions: { bucket: 'canvas', scans: 1 },
			},
		]);
	});
});

describe('A11yReporter.onTestEnd', () => {
	const testCase = (id: string) => ({ id }) as TestCase;

	const resultWith = (scans: A11yScan[] | undefined): TestResult =>
		({
			attachments: scans
				? [
						{
							name: A11Y_ATTACHMENT_NAME,
							contentType: 'application/json',
							body: Buffer.from(JSON.stringify(scans)),
						},
					]
				: [],
		}) as TestResult;

	test('keeps the scans of the last attempt of a test', () => {
		const reporter = new A11yReporter();
		const retried = scan('page', [violation('label', [node('select')])]);

		reporter.onTestEnd(
			testCase('spec-1'),
			resultWith([scan('page', [violation('label', [node('input')])])]),
		);
		reporter.onTestEnd(testCase('spec-1'), resultWith([retried]));

		expect(reporter.scans).toEqual([retried]);
	});

	test('drops the earlier attempt when the retry recorded no scan', () => {
		const reporter = new A11yReporter();

		reporter.onTestEnd(
			testCase('spec-1'),
			resultWith([scan('page', [violation('label', [node('input')])])]),
		);
		reporter.onTestEnd(testCase('spec-1'), resultWith(undefined));

		expect(reporter.scans).toEqual([]);
	});

	test('keeps the scans of every test that ran', () => {
		const reporter = new A11yReporter();
		const first = scan('page', [violation('label', [node('input')])]);
		const second = scan('sidebar', [violation('label', [node('select')])]);

		reporter.onTestEnd(testCase('spec-1'), resultWith([first]));
		reporter.onTestEnd(testCase('spec-2'), resultWith([second]));

		expect(reporter.scans).toEqual([first, second]);
	});
});

describe('parseA11yAttachment', () => {
	test('reads the scans back out of the attachment body', () => {
		const scans = [scan('page', [])];

		expect(parseA11yAttachment(Buffer.from(JSON.stringify(scans)))).toEqual(scans);
	});

	test('ignores a missing or unreadable body rather than failing the run', () => {
		expect(parseA11yAttachment(undefined)).toEqual([]);
		expect(parseA11yAttachment(Buffer.from('not json'))).toEqual([]);
		expect(parseA11yAttachment(Buffer.from('{}'))).toEqual([]);
	});
});
