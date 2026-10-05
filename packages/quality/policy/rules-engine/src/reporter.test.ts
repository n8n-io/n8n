import { describe, expect, it } from 'vitest';

import { toJSON } from './reporter.js';
import type { Report } from './types.js';

const report: Report = {
	timestamp: '2026-01-01T00:00:00.000Z',
	projectRoot: '/root',
	rules: { enabled: ['test-rule'], disabled: [] },
	results: [
		{
			rule: 'test-rule',
			violations: [
				{
					file: '/root/src/a.ts',
					line: 10,
					column: 1,
					rule: 'test-rule',
					message: 'problem',
					severity: 'error',
				},
			],
			filesAnalyzed: 1,
			executionTimeMs: 5,
		},
	],
	summary: {
		totalViolations: 1,
		byRule: { 'test-rule': 1 },
		bySeverity: { error: 1, warning: 0, info: 0 },
		filesAnalyzed: 1,
	},
};

function parseJSON(json: string): Report {
	try {
		return JSON.parse(json) as Report;
	} catch {
		throw new Error('Invalid JSON output');
	}
}

describe('toJSON', () => {
	it('outputs valid JSON', () => {
		const parsed = parseJSON(toJSON(report));
		expect(parsed.summary.totalViolations).toBe(1);
	});

	it('converts absolute paths to relative when rootDir provided', () => {
		const parsed = parseJSON(toJSON(report, '/root'));
		expect(parsed.results[0].violations[0].file).toBe('src/a.ts');
	});

	it('keeps absolute paths when no rootDir', () => {
		const parsed = parseJSON(toJSON(report));
		expect(parsed.results[0].violations[0].file).toBe('/root/src/a.ts');
	});
});
