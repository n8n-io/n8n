import { describe, expect, it } from 'vitest';

import { BaseRule } from './base-rule.js';
import { RuleRunner } from './rule-runner.js';
import type { Violation } from './types.js';

class TestRule extends BaseRule<{ value: string }> {
	readonly id = 'test-rule';
	readonly name = 'Test Rule';
	readonly description = 'A test rule';
	readonly severity = 'error' as const;

	analyze(context: { value: string }): Violation[] {
		if (context.value === 'bad') {
			return [this.createViolation('test.ts', 1, 1, 'Found bad value')];
		}
		return [];
	}
}

describe('RuleRunner', () => {
	it('runs registered rules and returns report', async () => {
		const runner = new RuleRunner<{ value: string }>();
		runner.registerRule(new TestRule());

		const report = await runner.run({ value: 'bad' }, '/root');

		expect(report.summary.totalViolations).toBe(1);
		expect(report.results[0].rule).toBe('test-rule');
		expect(report.results[0].violations[0].message).toBe('Found bad value');
	});

	it('returns zero violations for clean context', async () => {
		const runner = new RuleRunner<{ value: string }>();
		runner.registerRule(new TestRule());

		const report = await runner.run({ value: 'good' }, '/root');

		expect(report.summary.totalViolations).toBe(0);
	});

	it('respects enableOnly', async () => {
		const runner = new RuleRunner<{ value: string }>();
		runner.registerRule(new TestRule());
		runner.enableOnly(['nonexistent']);

		const report = await runner.run({ value: 'bad' }, '/root');

		expect(report.results).toHaveLength(0);
		expect(report.rules.disabled).toContain('test-rule');
	});

	it('applies settings to disable rules', async () => {
		const runner = new RuleRunner<{ value: string }>();
		runner.registerRule(new TestRule());
		runner.applySettings({ 'test-rule': { enabled: false } });

		const report = await runner.run({ value: 'bad' }, '/root');

		expect(report.results).toHaveLength(0);
	});

	it('runs a single rule by id', async () => {
		const runner = new RuleRunner<{ value: string }>();
		runner.registerRule(new TestRule());

		const report = await runner.runRule('test-rule', { value: 'bad' }, '/root');

		expect(report).not.toBeNull();
		expect(report!.summary.totalViolations).toBe(1);
	});

	it('returns null for unknown rule id', async () => {
		const runner = new RuleRunner<{ value: string }>();

		const report = await runner.runRule('unknown', { value: 'bad' }, '/root');

		expect(report).toBeNull();
	});
});
