import type { Project, SourceFile } from 'ts-morph';
import type { Severity, Violation, RuleResult, RuleConfig } from '../core/types';

export abstract class BaseRule {
	abstract readonly id: string;
	abstract readonly name: string;
	abstract readonly description: string;
	abstract readonly severity: Severity;

	/** Rule-specific configuration */
	protected config: RuleConfig = {};

	/**
	 * Define which file patterns this rule should analyze
	 * @returns Array of glob patterns relative to playwright root
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
	): Violation {
		return {
			file: file.getFilePath(),
			line,
			column,
			rule: this.id,
			message,
			severity: this.severity,
			suggestion,
		};
	}
}
