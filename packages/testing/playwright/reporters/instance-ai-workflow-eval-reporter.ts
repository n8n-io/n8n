/**
 * Custom Playwright reporter for Instance AI workflow evaluation results.
 *
 * Renders a summary table with pass rates, failure categories, and reasoning.
 * Writes structured JSON to eval-results.json for machine consumption.
 * Writes GitHub Actions step summary when running in CI.
 */

import type { FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { appendFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ScenarioEntry {
	name: string;
	passed: boolean;
	score: number;
	reasoning: string;
	failureCategory?: string;
	rootCause?: string;
	duration: number;
}

interface TestCaseEntry {
	name: string;
	built: boolean;
	buildLogged?: boolean;
	buildError?: string;
	workflowId?: string;
	scenarios: ScenarioEntry[];
	duration: number;
}

class InstanceAiWorkflowEvalReporter implements Reporter {
	private testCases = new Map<string, TestCaseEntry>();

	private startTime = 0;

	onBegin(_config: unknown, suite: Suite): void {
		this.startTime = Date.now();
		const testCount = suite.allTests().length;
		console.log(`\nInstance AI Workflow Evals: ${testCount} tests starting...\n`);
	}

	onStdOut(chunk: string | Buffer): void {
		const text = typeof chunk === 'string' ? chunk : chunk.toString();
		// Forward eval runner logs (skip verbose noise)
		for (const line of text.split('\n')) {
			if (line.includes('[eval]') && !line.includes('[eval:verbose]')) {
				process.stdout.write(`  ${line.trimEnd()}\n`);
			}
		}
	}

	onTestEnd(test: TestCase, result: TestResult): void {
		// Extract test case name and scenario from test title
		// Format: "contact form automation / happy-path @instance-ai-workflow-eval"
		const titleMatch = test.title.match(/^(.+?)\s*\/\s*(.+?)\s*@instance-ai-workflow-eval$/);
		if (!titleMatch) return;

		const testCaseName = titleMatch[1].trim();

		if (!this.testCases.has(testCaseName)) {
			this.testCases.set(testCaseName, {
				name: testCaseName,
				built: false,
				scenarios: [],
				duration: 0,
			});
		}

		const entry = this.testCases.get(testCaseName)!;
		entry.duration = Math.max(entry.duration, result.duration);

		// Parse annotations and print live progress
		let hasScenarioAnnotation = false;
		for (const annotation of result.annotations) {
			if (annotation.type === 'eval-build' && annotation.description && !entry.buildLogged) {
				try {
					const data = JSON.parse(annotation.description) as {
						success: boolean;
						workflowId?: string;
						error?: string;
					};
					entry.built = data.success;
					entry.workflowId = data.workflowId;
					entry.buildError = data.error;
					entry.buildLogged = true;
					const elapsed = this.formatDuration(Date.now() - this.startTime);
					const status = data.success ? 'BUILT' : 'BUILD FAILED';
					console.log(`  [${elapsed}] ${testCaseName}: ${status}`);
				} catch {
					// Malformed annotation — skip
				}
			}

			if (annotation.type === 'eval-scenario' && annotation.description) {
				try {
					const data = JSON.parse(annotation.description) as ScenarioEntry;
					entry.scenarios.push({ ...data, duration: result.duration });
					hasScenarioAnnotation = true;
					const icon = data.passed ? '\u2713' : '\u2717';
					const category = data.failureCategory ? ` [${data.failureCategory}]` : '';
					console.log(`    ${icon} ${data.name}${category}`);
					if (!data.passed && data.reasoning) {
						console.log(`      ${data.reasoning.slice(0, 200)}`);
					}
				} catch {
					// Malformed annotation — skip
				}
			}
		}

		// Track scenarios that failed without producing an eval-scenario annotation.
		// This happens when the build failed (expect(build.success) throws before
		// executeScenario runs) or when the test timed out.
		if (titleMatch && !hasScenarioAnnotation) {
			const name = titleMatch[2].trim();
			const errorText = result.errors.map((e) => e.message ?? '').join('; ');

			// Detect build failures vs other errors
			const isBuildFailure =
				!entry.built || errorText.includes('build failed') || errorText.includes('timed out');
			const isTimeout = errorText.includes('timed out') || errorText.includes('TimeoutError');

			const failureCategory = isBuildFailure ? 'build_failure' : isTimeout ? 'timeout' : undefined;

			const reason =
				result.status === 'skipped'
					? 'Skipped (previous test failed in serial mode)'
					: errorText || 'Test failed without details';

			entry.scenarios.push({
				name,
				passed: false,
				score: 0,
				reasoning: reason,
				failureCategory,
				duration: result.duration,
			});
			const categoryLabel = failureCategory ? ` [${failureCategory}]` : '';
			console.log(`    - ${name}${categoryLabel} [${result.status}]`);
			if (reason) {
				console.log(`      ${reason.slice(0, 200)}`);
			}
		}
	}

	onEnd(result: FullResult): void {
		const entries = [...this.testCases.values()];
		if (entries.length === 0) return;

		const totalDuration = Date.now() - this.startTime;

		this.printSummary(entries, totalDuration);
		this.writeJson(entries, totalDuration, result.status);
		this.writeGitHubSummary(entries, totalDuration);
	}

	private printSummary(entries: TestCaseEntry[], totalDuration: number): void {
		const allScenarios = entries.flatMap((e) => e.scenarios);
		const passed = allScenarios.filter((s) => s.passed).length;
		const total = allScenarios.length;
		const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
		const built = entries.filter((e) => e.built).length;

		// Compact scoreboard — one line per test case
		console.log('\n');
		console.log('╔══════════════════════════════════════════════════════════════════════╗');
		console.log('║  Instance AI Workflow Eval Results                                  ║');
		console.log(
			`║  ${built}/${entries.length} built │ ${passed}/${total} passed (${rate}%) │ ${this.formatDuration(totalDuration)}`.padEnd(
				71,
			) + '║',
		);
		console.log('╚══════════════════════════════════════════════════════════════════════╝');
		console.log('');

		const nameWidth = Math.max(30, ...entries.map((e) => e.name.length));
		for (const entry of entries) {
			const sp = entry.scenarios.filter((s) => s.passed).length;
			const st = entry.scenarios.length;
			const status = entry.built ? 'BUILT' : 'FAIL ';
			const bar = entry.scenarios.map((s) => (s.passed ? '\u2713' : '\u2717')).join('');
			console.log(
				`  ${entry.name.padEnd(nameWidth)}  ${status}  ${String(sp)}/${String(st)}  ${bar}`,
			);
		}

		// Failure category breakdown
		const failures = allScenarios.filter((s) => !s.passed);
		if (failures.length > 0) {
			const categories = new Map<string, number>();
			for (const f of failures) {
				const cat = f.failureCategory ?? 'uncategorized';
				categories.set(cat, (categories.get(cat) ?? 0) + 1);
			}
			const parts = [...categories.entries()].map(([cat, count]) => `${cat}: ${count}`);
			console.log('');
			console.log(`Failures: ${parts.join(', ')}`);
		}

		console.log('Details: eval-results.json');
		console.log('');
	}

	private writeJson(entries: TestCaseEntry[], totalDuration: number, status: string): void {
		const allScenarios = entries.flatMap((e) => e.scenarios);
		const passed = allScenarios.filter((s) => s.passed).length;

		const report = {
			timestamp: new Date().toISOString(),
			status,
			duration: totalDuration,
			summary: {
				testCases: entries.length,
				built: entries.filter((e) => e.built).length,
				scenariosTotal: allScenarios.length,
				scenariosPassed: passed,
				passRate: allScenarios.length > 0 ? passed / allScenarios.length : 0,
			},
			testCases: entries,
		};

		const outputPath = join(process.cwd(), 'eval-results.json');
		writeFileSync(outputPath, JSON.stringify(report, null, 2));
		console.log(`JSON report: ${outputPath}`);
	}

	private writeGitHubSummary(entries: TestCaseEntry[], totalDuration: number): void {
		const summaryPath = process.env.GITHUB_STEP_SUMMARY;
		if (!summaryPath) return;

		const allScenarios = entries.flatMap((e) => e.scenarios);
		const passed = allScenarios.filter((s) => s.passed).length;
		const total = allScenarios.length;
		const rate = total > 0 ? Math.round((passed / total) * 100) : 0;

		const lines: string[] = [
			'## Instance AI Workflow Eval Results',
			'',
			`**${passed}/${total} scenarios passed (${rate}%)** in ${this.formatDuration(totalDuration)}`,
			'',
			'| Workflow | Build | Scenarios | Pass Rate |',
			'| --- | --- | --- | --- |',
		];

		for (const entry of entries) {
			const sp = entry.scenarios.filter((s) => s.passed).length;
			const st = entry.scenarios.length;
			const r = st > 0 ? Math.round((sp / st) * 100) : 0;
			const build = entry.built ? ':white_check_mark:' : ':x:';
			lines.push(`| ${entry.name} | ${build} | ${sp}/${st} | ${r}% |`);
		}

		// Failure details
		const failures = entries.flatMap((e) =>
			e.scenarios.filter((s) => !s.passed).map((s) => ({ testCase: e.name, ...s })),
		);
		if (failures.length > 0) {
			lines.push('', '<details><summary>Failures</summary>', '');
			for (const f of failures) {
				const cat = f.failureCategory ? ` \`${f.failureCategory}\`` : '';
				lines.push(`**${f.testCase} / ${f.name}**${cat}`);
				lines.push(`> ${f.reasoning}`, '');
			}
			lines.push('</details>');
		}

		lines.push('');
		appendFileSync(summaryPath, lines.join('\n'));
	}

	private formatDuration(ms: number): string {
		const seconds = Math.round(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remaining = seconds % 60;
		return `${minutes}m ${remaining}s`;
	}
}

// eslint-disable-next-line import-x/no-default-export
export default InstanceAiWorkflowEvalReporter;
