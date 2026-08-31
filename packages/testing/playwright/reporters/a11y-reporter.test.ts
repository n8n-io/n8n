import type { FullResult, TestCase, TestResult } from '@playwright/test/reporter';
import type { Result } from 'axe-core';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { A11yReporter, parseA11yViolationThreshold } from './a11y-reporter';
import { A11Y_RESULTS_ATTACHMENT, type A11yScanResult } from '../fixtures/a11y';

const tempDirectories: string[] = [];

function violation(id: string): Result {
	return { id, impact: 'serious', tags: [], description: '', help: '', helpUrl: '', nodes: [] };
}

function testCase(id = 'test-id'): TestCase {
	return { id, title: 'accessibility journey' } as TestCase;
}

function testResult(scans: A11yScanResult[]): TestResult {
	return {
		attachments: [
			{
				name: A11Y_RESULTS_ATTACHMENT,
				contentType: 'application/json',
				body: Buffer.from(JSON.stringify(scans)),
			},
		],
	} as TestResult;
}

function outputFile(): string {
	const directory = mkdtempSync(path.join(os.tmpdir(), 'n8n-a11y-reporter-'));
	tempDirectories.push(directory);
	return path.join(directory, 'a11y-report.html');
}

afterEach(() => {
	for (const directory of tempDirectories.splice(0)) rmSync(directory, { recursive: true });
});

describe('parseA11yViolationThreshold', () => {
	test('leaves accessibility results non-blocking when unset', () => {
		expect(parseA11yViolationThreshold(undefined)).toBeUndefined();
		expect(parseA11yViolationThreshold('')).toBeUndefined();
	});

	test('accepts a non-negative integer', () => {
		expect(parseA11yViolationThreshold('0')).toBe(0);
		expect(parseA11yViolationThreshold('12')).toBe(12);
	});

	test('rejects invalid values', () => {
		expect(() => parseA11yViolationThreshold('-1')).toThrow('non-negative integer');
		expect(() => parseA11yViolationThreshold('1.5')).toThrow('non-negative integer');
	});
});

describe('A11yReporter', () => {
	test('writes one HTML report without failing when the threshold is unset', async () => {
		const reportPath = outputFile();
		const reporter = new A11yReporter({ outputFile: reportPath, threshold: '' });
		reporter.onTestEnd(
			testCase(),
			testResult([
				{ bucket: 'canvas', violations: [violation('canvas-label')] },
				{ bucket: 'ndv', violations: [] },
			]),
		);

		const result = await reporter.onEnd({ status: 'passed' } as FullResult);

		expect(result).toBeUndefined();
		expect(existsSync(reportPath)).toBe(true);
		expect(readFileSync(reportPath, 'utf8')).toContain('canvas-label');
	});

	test('fails after writing the report when violations exceed the threshold', async () => {
		const reportPath = outputFile();
		const reporter = new A11yReporter({ outputFile: reportPath, threshold: '0' });
		reporter.onTestEnd(
			testCase(),
			testResult([{ bucket: 'canvas', violations: [violation('canvas-label')] }]),
		);

		const result = await reporter.onEnd({ status: 'passed' } as FullResult);

		expect(result).toEqual({ status: 'failed' });
		expect(existsSync(reportPath)).toBe(true);
	});

	test('uses only the latest retry results', async () => {
		const reportPath = outputFile();
		const reporter = new A11yReporter({ outputFile: reportPath, threshold: '0' });
		const journey = testCase();
		reporter.onTestEnd(
			journey,
			testResult([{ bucket: 'canvas', violations: [violation('stale-violation')] }]),
		);
		reporter.onTestEnd(journey, testResult([{ bucket: 'canvas', violations: [] }]));

		const result = await reporter.onEnd({ status: 'passed' } as FullResult);

		expect(result).toBeUndefined();
		expect(readFileSync(reportPath, 'utf8')).not.toContain('stale-violation');
	});
});
