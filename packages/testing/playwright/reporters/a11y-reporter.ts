import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { createHtmlReport } from 'axe-html-reporter';
import { appendFileSync } from 'fs';

import {
	A11Y_ATTACHMENT_NAME,
	A11Y_MAX_VIOLATIONS_ENV,
	getA11yViolationBudget,
	type A11yScan,
	type A11yViolation,
} from '../fixtures/a11y';
import { resolveFromRoot } from '../utils/path-helper';

/** Written next to the Playwright HTML report; uploaded as its own CI artifact. */
const REPORT_DIR = 'a11y-report';
const REPORT_FILE = 'index.html';

type NodeResult = A11yViolation['nodes'][number];

/** Identifies a violating element, so retries of the same test don't double-count it. */
function nodeKey(node: NodeResult): string {
	return `${JSON.stringify(node.target)}::${node.html}`;
}

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];

function impactRank(violation: A11yViolation): number {
	const index = IMPACT_ORDER.indexOf(violation.impact ?? '');
	return index === -1 ? IMPACT_ORDER.length : index;
}

/**
 * Folds every scan of the run into one violation list, merging the nodes of a rule
 * that tripped on more than one screen. Elements are deduplicated, so a retried
 * test contributes its violations once rather than once per attempt.
 */
export function mergeA11yScans(scans: A11yScan[]): A11yViolation[] {
	const byRule = new Map<string, A11yViolation>();

	for (const scan of scans) {
		for (const violation of scan.violations) {
			const merged = byRule.get(violation.id);
			if (!merged) {
				byRule.set(violation.id, { ...violation, nodes: [...violation.nodes] });
				continue;
			}

			const seen = new Set(merged.nodes.map(nodeKey));
			for (const node of violation.nodes) {
				if (seen.has(nodeKey(node))) continue;
				seen.add(nodeKey(node));
				merged.nodes.push(node);
			}
		}
	}

	return [...byRule.values()].sort(
		(a, b) => impactRank(a) - impactRank(b) || b.nodes.length - a.nodes.length,
	);
}

export function parseA11yAttachment(body: Buffer | undefined): A11yScan[] {
	if (!body) return [];
	try {
		const parsed: unknown = JSON.parse(body.toString());
		return Array.isArray(parsed) ? (parsed as A11yScan[]) : [];
	} catch {
		return [];
	}
}

/**
 * Aggregates the axe scans every test attached into a single HTML report per run.
 *
 * Opt-in: `playwright.config.ts` only registers this reporter when
 * `PLAYWRIGHT_A11Y_REPORT` is set. The per-test scans are attached either way, so
 * a run without it still carries its raw axe results on the tests themselves.
 *
 * The report is written whether or not the run found violations - the budget
 * ({@link A11Y_MAX_VIOLATIONS_ENV}) is what decides if they fail the build, and it
 * is unset by default. Under sharding each shard writes the report for the specs
 * it ran.
 */
export class A11yReporter implements Reporter {
	/** Keyed by test so a retry replaces its earlier attempt instead of adding to it. */
	private readonly scansByTest = new Map<string, A11yScan[]>();

	get scans(): A11yScan[] {
		return [...this.scansByTest.values()].flat();
	}

	onTestEnd(test: TestCase, result: TestResult): void {
		// Replaced unconditionally, empty list included: the last attempt is the
		// authoritative one, so a retry that recorded no scan must not leave the
		// earlier attempt's violations in the report.
		this.scansByTest.set(
			test.id,
			result.attachments
				.filter((attachment) => attachment.name === A11Y_ATTACHMENT_NAME)
				.flatMap((attachment) => parseA11yAttachment(attachment.body)),
		);
	}

	onEnd(): void {
		const scans = this.scans;
		if (scans.length === 0) return;

		const violations = mergeA11yScans(scans);
		const buckets = [...new Set(scans.map((scan) => scan.bucket))].sort();
		const budget = getA11yViolationBudget();
		const budgetLabel =
			budget === undefined ? `not set (${A11Y_MAX_VIOLATIONS_ENV})` : `${budget} per test`;

		const preamble = `${scans.length} scans across buckets: ${buckets.join(', ')}. Failure budget: ${budgetLabel}.`;

		createHtmlReport({
			results: { violations, url: scans[0]?.url },
			options: {
				outputDirPath: resolveFromRoot(),
				outputDir: REPORT_DIR,
				reportFileName: REPORT_FILE,
				projectKey: 'n8n',
				customSummary: preamble,
			},
		});

		console.log(
			`\n[a11y] ${violations.length} distinct rules violated across ${scans.length} scans ` +
				`- report: ${REPORT_DIR}/${REPORT_FILE}`,
		);

		this.writeGitHubSummary(violations, preamble);
	}

	private writeGitHubSummary(violations: A11yViolation[], preamble: string): void {
		const summaryPath = process.env.GITHUB_STEP_SUMMARY;
		if (!summaryPath) return;

		const lines = ['## Accessibility', '', preamble, ''];

		if (violations.length === 0) {
			lines.push('No violations found.');
		} else {
			lines.push('| Rule | Impact | Elements |', '| --- | --- | --- |');
			for (const violation of violations) {
				lines.push(`| ${violation.id} | ${violation.impact ?? '—'} | ${violation.nodes.length} |`);
			}
			lines.push('', 'Full report: `a11y-report` artifact.');
		}
		lines.push('');

		// Leading newline so we don't concatenate against whatever a previous
		// reporter wrote earlier in the same job.
		appendFileSync(summaryPath, `\n${lines.join('\n')}`);
	}
}

// eslint-disable-next-line import-x/no-default-export
export default A11yReporter;
