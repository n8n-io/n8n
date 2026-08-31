import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { createHtmlReport } from 'axe-html-reporter';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { A11Y_RESULTS_ATTACHMENT, type A11yScanResult } from '../fixtures/a11y';

const DEFAULT_REPORT_PATH = path.join('test-results', 'a11y-report.html');

type A11yReporterOptions = {
	outputFile?: string;
	threshold?: string;
};

function isA11yScanResults(value: unknown): value is A11yScanResult[] {
	return (
		Array.isArray(value) &&
		value.every(
			(result) =>
				typeof result === 'object' &&
				result !== null &&
				'bucket' in result &&
				typeof result.bucket === 'string' &&
				'violations' in result &&
				Array.isArray(result.violations),
		)
	);
}

export function parseA11yViolationThreshold(value: string | undefined): number | undefined {
	if (value === undefined || value.trim() === '') return undefined;
	if (!/^\d+$/.test(value)) {
		throw new Error('A11Y_VIOLATION_THRESHOLD must be a non-negative integer');
	}
	return Number(value);
}

export class A11yReporter implements Reporter {
	private readonly scansByTest = new Map<string, A11yScanResult[]>();

	private readonly outputFile: string;

	private readonly thresholdValue: string | undefined;

	constructor(options: A11yReporterOptions = {}) {
		this.outputFile = options.outputFile ?? DEFAULT_REPORT_PATH;
		this.thresholdValue = options.threshold ?? process.env.A11Y_VIOLATION_THRESHOLD;
	}

	onTestEnd(test: TestCase, result: TestResult): void {
		const attachment = result.attachments.find(({ name }) => name === A11Y_RESULTS_ATTACHMENT);
		if (!attachment?.body) {
			this.scansByTest.delete(test.id);
			return;
		}

		try {
			const scans: unknown = JSON.parse(attachment.body.toString());
			if (isA11yScanResults(scans)) this.scansByTest.set(test.id, scans);
		} catch {
			console.warn(`[a11y] Could not read accessibility results for "${test.title}"`);
		}
	}

	async onEnd(_result: FullResult): Promise<{ status: 'failed' } | undefined> {
		const scans = [...this.scansByTest.values()].flat();
		if (scans.length === 0) return undefined;

		const violations = scans.flatMap(({ violations: scanViolations }) => scanViolations);
		const summary = `${violations.length} violation(s) across ${scans.length} accessibility checkpoint(s).`;
		const html = createHtmlReport({
			results: { violations },
			options: { customSummary: summary, doNotCreateReportFile: true },
		});

		await mkdir(path.dirname(this.outputFile), { recursive: true });
		await writeFile(this.outputFile, html);
		console.log(`[a11y] HTML report written to ${this.outputFile}`);

		let threshold: number | undefined;
		try {
			threshold = parseA11yViolationThreshold(this.thresholdValue);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			return { status: 'failed' };
		}

		if (threshold !== undefined && violations.length > threshold) {
			console.error(
				`[a11y] ${violations.length} violation(s) exceeded the configured threshold of ${threshold}`,
			);
			return { status: 'failed' };
		}

		return undefined;
	}
}

// Playwright loads reporters through their default export.
// eslint-disable-next-line import-x/no-default-export
export default A11yReporter;
