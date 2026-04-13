/**
 * Custom Playwright reporter for Instance AI workflow evaluation results.
 *
 * Renders a summary table with pass rates, failure categories, and reasoning.
 * Writes structured JSON to eval-results.json for machine consumption.
 * Writes GitHub Actions step summary when running in CI.
 *
 * When tests are run with --repeat-each N, aggregates results across repeats
 * and computes pass@n (at least 1 pass) and pass^n (all pass) metrics.
 */

import type {
	FullConfig,
	FullResult,
	Reporter,
	Suite,
	TestCase,
	TestResult,
} from '@playwright/test/reporter';
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
	repeatIndex: number;
}

interface TestCaseEntry {
	name: string;
	built: boolean;
	buildLogged?: boolean;
	buildError?: string;
	workflowId?: string;
	scenarios: ScenarioEntry[];
	duration: number;
	buildSuccessCount: number;
	buildTotalCount: number;
}

interface ScenarioAggregation {
	name: string;
	passCount: number;
	totalRuns: number;
	passRate: number;
	passAtN: boolean;
	passPowerN: boolean;
	runs: ScenarioEntry[];
}

interface TestCaseAggregation {
	name: string;
	buildSuccessCount: number;
	totalRuns: number;
	scenarios: ScenarioAggregation[];
}

class InstanceAiWorkflowEvalReporter implements Reporter {
	private testCases = new Map<string, TestCaseEntry>();

	private startTime = 0;

	private repeatEach = 1;

	onBegin(config: FullConfig, suite: Suite): void {
		this.startTime = Date.now();
		const testCount = suite.allTests().length;

		const project = config.projects.find((p) => p.name === 'instance-ai-workflow-evals');
		this.repeatEach = project?.repeatEach ?? 1;

		const label = `${testCount} tests starting (${this.repeatEach} repeats each)...`;
		console.log(`\nInstance AI Workflow Evals: ${label}\n`);
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
		const repeatIndex = test.repeatEachIndex;

		if (!this.testCases.has(testCaseName)) {
			this.testCases.set(testCaseName, {
				name: testCaseName,
				built: false,
				scenarios: [],
				duration: 0,
				buildSuccessCount: 0,
				buildTotalCount: 0,
			});
		}

		const entry = this.testCases.get(testCaseName)!;
		entry.duration = Math.max(entry.duration, result.duration);

		// Parse annotations and print live progress
		let hasScenarioAnnotation = false;
		for (const annotation of result.annotations) {
			if (annotation.type === 'eval-build' && annotation.description) {
				try {
					const data = JSON.parse(annotation.description) as {
						success: boolean;
						workflowId?: string;
						error?: string;
					};
					entry.buildTotalCount++;
					if (data.success) {
						entry.buildSuccessCount++;
						entry.built = true;
					}
					entry.workflowId = data.workflowId;
					entry.buildError = data.error;

					const elapsed = this.formatDuration(Date.now() - this.startTime);
					const status = data.success ? 'BUILT' : 'BUILD FAILED';
					const repeatLabel = this.repeatEach > 1 ? ` (repeat ${String(repeatIndex + 1)})` : '';
					console.log(`  [${elapsed}] ${testCaseName}: ${status}${repeatLabel}`);
				} catch {
					// Malformed annotation — skip
				}
			}

			if (annotation.type === 'eval-scenario' && annotation.description) {
				try {
					const data = JSON.parse(annotation.description) as Omit<
						ScenarioEntry,
						'duration' | 'repeatIndex'
					>;
					entry.scenarios.push({ ...data, duration: result.duration, repeatIndex });
					hasScenarioAnnotation = true;
					const icon = data.passed ? '\u2713' : '\u2717';
					const category = data.failureCategory ? ` [${data.failureCategory}]` : '';
					const repeatLabel = this.repeatEach > 1 ? ` (repeat ${String(repeatIndex + 1)})` : '';
					console.log(`    ${icon} ${data.name}${category}${repeatLabel}`);
					if (!data.passed && data.reasoning) {
						console.log(`      ${data.reasoning.slice(0, 200)}`);
					}
				} catch {
					// Malformed annotation — skip
				}
			}
		}

		// Track scenarios that failed without producing an eval-scenario annotation.
		if (titleMatch && !hasScenarioAnnotation) {
			const name = titleMatch[2].trim();
			const errorText = result.errors.map((e) => e.message ?? '').join('; ');

			const isBuildFailure =
				!entry.built ||
				errorText.includes('build failed') ||
				errorText.includes('timed out') ||
				errorText.includes('TimeoutError');

			const failureCategory = isBuildFailure ? 'build_failure' : undefined;

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
				repeatIndex,
			});
			const categoryLabel = failureCategory ? ` [${failureCategory}]` : '';
			const repeatLabel = this.repeatEach > 1 ? ` (repeat ${String(repeatIndex + 1)})` : '';
			console.log(`    - ${name}${categoryLabel} [${result.status}]${repeatLabel}`);
			if (reason) {
				console.log(`      ${reason.slice(0, 200)}`);
			}
		}
	}

	onEnd(result: FullResult): void {
		const entries = [...this.testCases.values()];
		if (entries.length === 0) return;

		const totalDuration = Date.now() - this.startTime;

		if (this.repeatEach > 1) {
			const aggregated = this.aggregateResults(entries);
			this.printMultiRunSummary(aggregated, totalDuration);
			this.writeMultiRunJson(aggregated, totalDuration, result.status);
			this.writeMultiRunGitHubSummary(aggregated, totalDuration);
		} else {
			this.printSummary(entries, totalDuration);
			this.writeJson(entries, totalDuration, result.status);
			this.writeGitHubSummary(entries, totalDuration);
		}
	}

	private aggregateResults(entries: TestCaseEntry[]): TestCaseAggregation[] {
		return entries.map((entry) => {
			const scenariosByName = new Map<string, ScenarioEntry[]>();
			for (const s of entry.scenarios) {
				if (!scenariosByName.has(s.name)) {
					scenariosByName.set(s.name, []);
				}
				scenariosByName.get(s.name)!.push(s);
			}

			const scenarios: ScenarioAggregation[] = [...scenariosByName.entries()].map(
				([name, runs]) => {
					const passCount = runs.filter((r) => r.passed).length;
					const totalRuns = runs.length;
					return {
						name,
						passCount,
						totalRuns,
						passRate: totalRuns > 0 ? passCount / totalRuns : 0,
						passAtN: passCount > 0,
						passPowerN: passCount === totalRuns,
						runs,
					};
				},
			);

			return {
				name: entry.name,
				buildSuccessCount: entry.buildSuccessCount,
				totalRuns: this.repeatEach,
				scenarios,
			};
		});
	}

	private printMultiRunSummary(aggregated: TestCaseAggregation[], totalDuration: number): void {
		const allScenarios = aggregated.flatMap((tc) => tc.scenarios);
		const total = allScenarios.length;
		const passAtNCount = allScenarios.filter((s) => s.passAtN).length;
		const passPowerNCount = allScenarios.filter((s) => s.passPowerN).length;
		const avgPassRate =
			total > 0
				? Math.round((allScenarios.reduce((sum, s) => sum + s.passRate, 0) / total) * 100)
				: 0;

		console.log('\n');
		console.log('╔══════════════════════════════════════════════════════════════════════╗');
		console.log('║  Instance AI Workflow Eval Results (multi-run)                      ║');
		console.log(
			`║  ${this.repeatEach} runs │ pass@n: ${passAtNCount}/${total} │ pass^n: ${passPowerNCount}/${total} │ avg: ${avgPassRate}% │ ${this.formatDuration(totalDuration)}`.padEnd(
				71,
			) + '║',
		);
		console.log('╚══════════════════════════════════════════════════════════════════════╝');
		console.log('');

		const nameWidth = Math.max(30, ...aggregated.map((tc) => tc.name.length));
		for (const tc of aggregated) {
			const buildLabel =
				tc.buildSuccessCount === tc.totalRuns
					? 'BUILT'
					: `B${tc.buildSuccessCount}/${tc.totalRuns}`;

			const scenarioSummaries = tc.scenarios
				.map((s) => {
					if (s.passPowerN) return '\u2713';
					if (s.passAtN) return '~';
					return '\u2717';
				})
				.join('');

			const passAtN = tc.scenarios.filter((s) => s.passAtN).length;
			const passPowerN = tc.scenarios.filter((s) => s.passPowerN).length;
			const st = tc.scenarios.length;

			console.log(
				`  ${tc.name.padEnd(nameWidth)}  ${buildLabel.padEnd(7)} @n:${String(passAtN)}/${String(st)} ^n:${String(passPowerN)}/${String(st)}  ${scenarioSummaries}`,
			);

			// Per-scenario detail
			for (const s of tc.scenarios) {
				const ratePct = Math.round(s.passRate * 100);
				const icon = s.passPowerN ? '\u2713' : s.passAtN ? '~' : '\u2717';
				console.log(
					`    ${icon} ${s.name}: ${String(s.passCount)}/${String(s.totalRuns)} (${String(ratePct)}%)`,
				);
			}
		}

		console.log('');
		console.log(
			`pass@n: ${String(passAtNCount)}/${String(total)} (${String(Math.round((passAtNCount / total) * 100))}%)  |  ` +
				`pass^n: ${String(passPowerNCount)}/${String(total)} (${String(Math.round((passPowerNCount / total) * 100))}%)  |  ` +
				`avg pass rate: ${String(avgPassRate)}%`,
		);
		console.log('Details: eval-results.json');
		console.log('');
	}

	private writeMultiRunJson(
		aggregated: TestCaseAggregation[],
		totalDuration: number,
		status: string,
	): void {
		const allScenarios = aggregated.flatMap((tc) => tc.scenarios);
		const total = allScenarios.length;
		const passAtNCount = allScenarios.filter((s) => s.passAtN).length;
		const passPowerNCount = allScenarios.filter((s) => s.passPowerN).length;
		const avgPassRate =
			total > 0 ? allScenarios.reduce((sum, s) => sum + s.passRate, 0) / total : 0;

		const report = {
			timestamp: new Date().toISOString(),
			status,
			duration: totalDuration,
			totalRuns: this.repeatEach,
			summary: {
				testCases: aggregated.length,
				built: aggregated.filter((tc) => tc.buildSuccessCount > 0).length,
				scenariosTotal: total,
				passAtN: passAtNCount,
				passPowerN: passPowerNCount,
				passAtNRate: total > 0 ? passAtNCount / total : 0,
				passPowerNRate: total > 0 ? passPowerNCount / total : 0,
				avgPassRate,
			},
			testCases: aggregated.map((tc) => ({
				name: tc.name,
				buildSuccessCount: tc.buildSuccessCount,
				totalRuns: tc.totalRuns,
				scenarios: tc.scenarios.map((s) => ({
					name: s.name,
					passCount: s.passCount,
					totalRuns: s.totalRuns,
					passRate: s.passRate,
					passAtN: s.passAtN,
					passPowerN: s.passPowerN,
					runs: s.runs.map((r) => ({
						repeatIndex: r.repeatIndex,
						passed: r.passed,
						score: r.score,
						reasoning: r.reasoning,
						failureCategory: r.failureCategory,
						rootCause: r.rootCause,
						duration: r.duration,
					})),
				})),
			})),
		};

		const outputPath = join(process.cwd(), 'eval-results.json');
		writeFileSync(outputPath, JSON.stringify(report, null, 2));
		console.log(`JSON report: ${outputPath}`);
	}

	private writeMultiRunGitHubSummary(
		aggregated: TestCaseAggregation[],
		totalDuration: number,
	): void {
		const summaryPath = process.env.GITHUB_STEP_SUMMARY;
		if (!summaryPath) return;

		const allScenarios = aggregated.flatMap((tc) => tc.scenarios);
		const total = allScenarios.length;
		const passAtNCount = allScenarios.filter((s) => s.passAtN).length;
		const passPowerNCount = allScenarios.filter((s) => s.passPowerN).length;
		const avgPassRate =
			total > 0
				? Math.round((allScenarios.reduce((sum, s) => sum + s.passRate, 0) / total) * 100)
				: 0;

		const lines: string[] = [
			'## Instance AI Workflow Eval Results (multi-run)',
			'',
			`**${this.repeatEach} runs** | pass@n: ${passAtNCount}/${total} | pass^n: ${passPowerNCount}/${total} | avg: ${avgPassRate}% | ${this.formatDuration(totalDuration)}`,
			'',
			'| Workflow | Build | pass@n | pass^n | Avg Rate |',
			'| --- | --- | --- | --- | --- |',
		];

		for (const tc of aggregated) {
			const build =
				tc.buildSuccessCount === tc.totalRuns
					? ':white_check_mark:'
					: `${tc.buildSuccessCount}/${tc.totalRuns}`;
			const passAtN = tc.scenarios.filter((s) => s.passAtN).length;
			const passPowerN = tc.scenarios.filter((s) => s.passPowerN).length;
			const st = tc.scenarios.length;
			const avg =
				st > 0 ? Math.round((tc.scenarios.reduce((sum, s) => sum + s.passRate, 0) / st) * 100) : 0;
			lines.push(`| ${tc.name} | ${build} | ${passAtN}/${st} | ${passPowerN}/${st} | ${avg}% |`);
		}

		// Failure details
		const failingScenarios = allScenarios.filter((s) => !s.passPowerN);
		if (failingScenarios.length > 0) {
			lines.push('', '<details><summary>Scenarios with failures</summary>', '');
			for (const agg of aggregated) {
				for (const s of agg.scenarios) {
					if (s.passPowerN) continue;
					lines.push(`**${agg.name} / ${s.name}** — ${s.passCount}/${s.totalRuns} passed`);
					const failedRuns = s.runs.filter((r) => !r.passed);
					for (const r of failedRuns) {
						const cat = r.failureCategory ? ` \`${r.failureCategory}\`` : '';
						lines.push(`> Run ${r.repeatIndex + 1}${cat}: ${r.reasoning.slice(0, 200)}`);
					}
					lines.push('');
				}
			}
			lines.push('</details>');
		}

		lines.push('');
		appendFileSync(summaryPath, lines.join('\n'));
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
