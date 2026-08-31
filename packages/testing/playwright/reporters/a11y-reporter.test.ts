import type { TestCase, TestResult } from '@playwright/test/reporter';
import { describe, expect, test } from 'vitest';

import { A11yReporter, mergeA11yScans, parseA11yAttachment } from './a11y-reporter';
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

function scan(bucket: A11yScan['bucket'], violations: A11yViolation[]): A11yScan {
	return { bucket, url: 'http://localhost:5678/home/workflows', violations };
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
