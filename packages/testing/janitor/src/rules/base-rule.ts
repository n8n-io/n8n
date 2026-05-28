import type { Project, SourceFile } from 'ts-morph';

import { getConfig } from '../config.js';
import type { Severity, Violation, RuleResult, RuleConfig, FixResult, FixData } from '../types.js';

export abstract class BaseRule {
	abstract readonly id: string;
	abstract readonly name: string;
	abstract readonly description: string;
	abstract readonly severity: Severity;

	/** Whether this rule supports auto-fixing */
	readonly fixable: boolean = false;

	/** Rule-specific configuration */
	protected config: RuleConfig = {};

	/**
	 * Get the effective severity for this rule (may be overridden in config)
	 */
	getEffectiveSeverity(): Severity {
		const ruleConfig = getConfig().rules?.[this.id];
		if (ruleConfig?.severity === 'off') {
			return 'info'; // Will be filtered out
		}
		if (ruleConfig?.severity) {
			return ruleConfig.severity;
		}
		return this.severity;
	}

	/**
	 * Check if this rule is enabled
	 */
	isEnabled(): boolean {
		const ruleConfig = getConfig().rules?.[this.id];
		if (ruleConfig?.enabled === false) return false;
		if (ruleConfig?.severity === 'off') return false;
		return true;
	}

	/**
	 * Check if a text matches any of the allow patterns for this rule
	 */
	protected isAllowed(text: string): boolean {
		const ruleConfig = getConfig().rules?.[this.id];
		const allowPatterns = ruleConfig?.allowPatterns ?? [];
		return allowPatterns.some((pattern) => pattern.test(text));
	}

	/**
	 * Define which file patterns this rule should analyze
	 * @returns Array of glob patterns relative to root
	 */
	abstract getTargetGlobs(): string[];

	/**
	 * Analyze files and return violations
	 * @param project - ts-morph Project instance
	 * @param files - Source files matching the target globs
	 * @returns Array of violations found
	 */
	abstract analyze(project: Project, files: SourceFile[]): Violation[];

	/**
	 * Apply fixes for violations. Override in fixable rules.
	 * @param project - ts-morph Project instance
	 * @param violations - Violations to fix
	 * @param write - Whether to write changes to disk
	 * @returns Array of fix results
	 */
	fix(_project: Project, _violations: Violation[], _write: boolean): FixResult[] {
		return [];
	}

	/**
	 * Configure the rule with options
	 */
	configure(config: RuleConfig): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Execute the rule with timing instrumentation
	 * @param project - ts-morph Project instance
	 * @param files - Source files matching the target globs
	 * @returns Rule result with violations and metadata
	 */
	execute(project: Project, files: SourceFile[]): RuleResult {
		const startTime = performance.now();
		const violations = this.analyze(project, files);
		const endTime = performance.now();

		return {
			rule: this.id,
			violations,
			filesAnalyzed: files.length,
			executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
			fixable: this.fixable,
		};
	}

	/**
	 * Helper to create a violation with consistent structure
	 */
	protected createViolation(
		file: SourceFile,
		line: number,
		column: number,
		message: string,
		suggestion?: string,
		fixable?: boolean,
		fixData?: FixData,
	): Violation {
		return {
			file: file.getFilePath(),
			line,
			column,
			rule: this.id,
			message,
			severity: this.getEffectiveSeverity(),
			suggestion,
			fixable,
			fixData,
		};
	}
}
