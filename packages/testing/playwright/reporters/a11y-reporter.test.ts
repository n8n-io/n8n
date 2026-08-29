import { describe, expect, test } from 'vitest';

import { mergeA11yScans, parseA11yAttachment } from './a11y-reporter';
import type { A11yScan, A11yViolation } from '../fixtures/a11y';

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
