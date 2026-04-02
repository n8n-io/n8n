import { describe, expect, it } from 'vitest';

import { BaseRule } from './base-rule.js';
import type { Violation } from './types.js';

class TestRule extends BaseRule<string> {
	readonly id = 'test';
	readonly name = 'Test';
	readonly description = 'Test rule';
	readonly severity = 'error' as const;

	analyze(context: string): Violation[] {
		if (context === 'bad') {
			return [this.createViolation('file.ts', 1, 1, 'bad value')];
		}
		return [];
	}
}

class FixableRule extends BaseRule<string> {
	readonly id = 'fixable';
	readonly name = 'Fixable';
	readonly description = 'Fixable rule';
	readonly severity = 'warning' as const;
	readonly fixable = true;

	analyze(context: string): Violation[] {
		if (context === 'bad') {
			return [
				this.createViolation('file.ts', 1, 1, 'fixable issue', 'fix it', true, {
					type: 'edit',
					replacement: 'good',
				}),
			];
		}
		return [];
	}

	fix(_context: string, violations: Violation[]) {
		return violations.map((v) => ({ file: v.file, action: 'edit' as const, applied: true }));
	}
}

describe('BaseRule', () => {
	it('creates violations with rule metadata', () => {
		const rule = new TestRule();
		const violations = rule.analyze('bad');

		expect(violations).toHaveLength(1);
		expect(violations[0].rule).toBe('test');
		expect(violations[0].severity).toBe('error');
	});

	it('returns empty array for clean input', () => {
		const rule = new TestRule();
		expect(rule.analyze('good')).toHaveLength(0);
	});

	it('respects severity override via configure', () => {
		const rule = new TestRule();
		rule.configure({ severity: 'warning' });

		const violations = rule.analyze('bad');

		expect(violations[0].severity).toBe('warning');
	});

	it('reports disabled when severity is off', () => {
		const rule = new TestRule();
		rule.configure({ severity: 'off' });

		expect(rule.isEnabled()).toBe(false);
	});

	it('reports disabled when enabled is false', () => {
		const rule = new TestRule();
		rule.configure({ enabled: false });

		expect(rule.isEnabled()).toBe(false);
	});

	it('execute returns result with timing', async () => {
		const rule = new TestRule();
		const result = await rule.execute('bad');

		expect(result.rule).toBe('test');
		expect(result.violations).toHaveLength(1);
		expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
	});

	it('supports fixable rules', () => {
		const rule = new FixableRule();
		expect(rule.fixable).toBe(true);

		const violations = rule.analyze('bad');
		expect(violations[0].fixable).toBe(true);
		expect(violations[0].fixData).toEqual({ type: 'edit', replacement: 'good' });

		const fixes = rule.fix('bad', violations);
		expect(fixes).toHaveLength(1);
		expect(fixes[0].applied).toBe(true);
	});

	it('returns options from configure', () => {
		const rule = new TestRule();
		rule.configure({ options: { threshold: 5 } });

		expect(rule.getOptions()).toEqual({ threshold: 5 });
	});
});
