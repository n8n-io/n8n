import type { Severity, Violation, RuleResult, RuleSettings, FixResult, FixData } from './types.js';

export abstract class BaseRule<TContext = unknown> {
	abstract readonly id: string;
	abstract readonly name: string;
	abstract readonly description: string;
	abstract readonly severity: Severity;
	readonly fixable: boolean = false;

	private settings: RuleSettings = {};

	configure(settings: RuleSettings): void {
		this.settings = { ...this.settings, ...settings };
	}

	getSettings(): RuleSettings {
		return this.settings;
	}

	getOptions(): Record<string, unknown> {
		return this.settings.options ?? {};
	}

	getEffectiveSeverity(): Severity {
		if (this.settings.severity === 'off') return 'info';
		if (this.settings.severity) return this.settings.severity;
		return this.severity;
	}

	isEnabled(): boolean {
		if (this.settings.enabled === false) return false;
		if (this.settings.severity === 'off') return false;
		return true;
	}

	abstract analyze(context: TContext): Violation[] | Promise<Violation[]>;

	fix(_context: TContext, _violations: Violation[]): FixResult[] {
		return [];
	}

	async execute(context: TContext, filesAnalyzed = 0): Promise<RuleResult> {
		const startTime = performance.now();
		const violations = await this.analyze(context);
		const endTime = performance.now();

		return {
			rule: this.id,
			violations,
			filesAnalyzed,
			executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
			fixable: this.fixable,
		};
	}

	protected createViolation(
		file: string,
		line: number,
		column: number,
		message: string,
		suggestion?: string,
		fixable?: boolean,
		fixData?: FixData,
	): Violation {
		return {
			file,
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
