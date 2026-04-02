import type { JanitorReport, Violation, FixResult } from '../types.js';
import { getRelativePath } from './project-loader.js';

/**
 * Output report as JSON (for LLM consumption)
 */
export function toJSON(report: JanitorReport): string {
	// Convert absolute paths to relative for cleaner output
	const cleanedReport = {
		...report,
		results: report.results.map((result) => ({
			...result,
			violations: result.violations.map((v) => ({
				...v,
				file: getRelativePath(v.file),
			})),
		})),
	};

	return JSON.stringify(cleanedReport, null, 2);
}

/**
 * Output report to console (human-readable)
 */
export function toConsole(report: JanitorReport, verbose = false): void {
	const { summary, results } = report;

	// Header
	console.log('\n====================================');
	console.log('       JANITOR ANALYSIS REPORT');
	console.log('====================================\n');

	console.log(`Timestamp: ${report.timestamp}`);
	console.log(`Files analyzed: ${summary.filesAnalyzed}`);
	console.log(`Rules enabled: ${report.rules.enabled.join(', ') || 'none'}`);
	if (report.rules.disabled.length > 0) {
		console.log(`Rules disabled: ${report.rules.disabled.join(', ')}`);
	}
	console.log('');

	// Summary
	if (summary.totalViolations === 0) {
		console.log('All clean! No violations found.\n');
		return;
	}

	console.log(`Found ${summary.totalViolations} violation(s)\n`);

	// By severity
	console.log('By severity:');
	if (summary.bySeverity.error > 0) {
		console.log(`  Errors:   ${summary.bySeverity.error}`);
	}
	if (summary.bySeverity.warning > 0) {
		console.log(`  Warnings: ${summary.bySeverity.warning}`);
	}
	if (summary.bySeverity.info > 0) {
		console.log(`  Info:     ${summary.bySeverity.info}`);
	}
	console.log('');

	// By rule
	console.log('By rule:');
	for (const [rule, count] of Object.entries(summary.byRule)) {
		if (count > 0) {
			console.log(`  ${rule}: ${count}`);
		}
	}
	console.log('');

	// Detailed violations
	if (verbose) {
		console.log('------------------------------------');
		console.log('DETAILED VIOLATIONS');
		console.log('------------------------------------\n');

		for (const result of results) {
			if (result.violations.length === 0) continue;

			console.log(
				`${result.rule} (${result.violations.length} violations, ${result.executionTimeMs}ms)`,
			);
			console.log('');

			for (const violation of result.violations) {
				printViolation(violation);
			}
			console.log('');
		}
	} else {
		// Non-verbose: group by file
		const byFile = new Map<string, Violation[]>();

		for (const result of results) {
			for (const violation of result.violations) {
				const relativePath = getRelativePath(violation.file);
				if (!byFile.has(relativePath)) {
					byFile.set(relativePath, []);
				}
				byFile.get(relativePath)!.push(violation);
			}
		}

		console.log('------------------------------------');
		console.log('VIOLATIONS BY FILE');
		console.log('------------------------------------\n');

		for (const [file, violations] of byFile) {
			console.log(`${file} (${violations.length})`);
			for (const v of violations) {
				const icon = getSeverityIcon(v.severity);
				console.log(`   ${icon} L${v.line}: [${v.rule}] ${v.message}`);
			}
			console.log('');
		}

		console.log('Use --verbose for detailed output with suggestions.\n');
	}
}

function printViolation(v: Violation): void {
	const relativePath = getRelativePath(v.file);
	const icon = getSeverityIcon(v.severity);

	console.log(`  ${icon} ${relativePath}:${v.line}:${v.column}`);
	console.log(`     ${v.message}`);
	if (v.suggestion) {
		console.log(`     Suggestion: ${v.suggestion}`);
	}
	console.log('');
}

function getSeverityIcon(severity: string): string {
	switch (severity) {
		case 'error':
			return '[ERR]';
		case 'warning':
			return '[WARN]';
		case 'info':
			return '[INFO]';
		default:
			return '[?]';
	}
}

/**
 * Output fix results to console
 */
export function printFixResults(report: JanitorReport, write: boolean): void {
	const allFixes: FixResult[] = [];
	for (const result of report.results) {
		if (result.fixes) {
			allFixes.push(...result.fixes);
		}
	}

	if (allFixes.length === 0) {
		console.log('\nNo fixable violations found.\n');
		return;
	}

	console.log('\n------------------------------------');
	console.log(write ? '       FIXES APPLIED' : '       FIX PREVIEW (dry run)');
	console.log('------------------------------------\n');

	for (const fix of allFixes) {
		const icon = fix.applied ? '[OK]' : '[PREVIEW]';
		const actionLabel = getActionLabel(fix.action);
		const target = fix.target ? ` ${fix.target}` : '';
		console.log(`  ${icon} ${actionLabel}${target}`);
		console.log(`     ${fix.file}`);
	}

	console.log('');

	if (!write) {
		console.log(`${allFixes.length} fix(es) would be applied.`);
		console.log('Use --fix --write to apply changes.\n');
	} else {
		console.log(`${allFixes.length} fix(es) applied.`);
		console.log('Run: pnpm typecheck && pnpm lint\n');
	}
}

function getActionLabel(action: FixResult['action']): string {
	switch (action) {
		case 'remove-file':
			return 'DELETE FILE';
		case 'remove-method':
			return 'REMOVE METHOD';
		case 'remove-property':
			return 'REMOVE PROPERTY';
		case 'edit':
			return 'EDIT';
		default:
			return action;
	}
}
