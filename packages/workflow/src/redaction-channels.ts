import type { IRedactionSetting } from './execution-context';
import type { IWorkflowSettings, WorkflowExecuteMode, WorkflowSettings } from './interfaces';

/**
 * Redaction expressed as two independent channels:
 * whether production and manual execution data are redacted.
 */
export interface RedactionChannels {
	production: boolean;
	manual: boolean;
}

/**
 * Projects the single-enum workflow redaction policy onto per-channel booleans.
 *
 * | policy        | production | manual |
 * |---------------|------------|--------|
 * | 'none'        | false      | false  |
 * | 'non-manual'  | true       | false  |
 * | 'manual-only' | false      | true   |
 * | 'all'         | true       | true   |
 */
export function policyToChannels(policy: WorkflowSettings.RedactionPolicy): RedactionChannels {
	return {
		production: policy === 'all' || policy === 'non-manual',
		manual: policy === 'all' || policy === 'manual-only',
	};
}

/**
 * Reconstructs a `RedactionPolicy` enum from per-channel booleans — the inverse of
 * {@link policyToChannels}. Callers uphold the invariant that manual redaction implies
 * production redaction (workflow setting via IAM-697, instance floor via the floor enum),
 * so `manual && !production` is unreachable; it is mapped to the strictest policy `'all'`
 * as a defensive fallback rather than reported as `'manual-only'`.
 */
export function channelsToPolicy({
	production,
	manual,
}: RedactionChannels): WorkflowSettings.RedactionPolicy {
	if (production && manual) return 'all';
	if (production) return 'non-manual';
	if (manual) return 'all';
	return 'none';
}

/**
 * Emitted in place of user console output when the run's resolved redaction
 * policy redacts the channel it executes on. Console output is ephemeral
 * (never persisted), so unlike execution data it has no reveal path.
 */
export const CONSOLE_OUTPUT_REDACTED_MESSAGE =
	'[Console output redacted by workflow redaction policy]';

/**
 * Decides whether Code-node console output (`console.log` / `print`) is
 * redacted for this run. Mirrors `ExecutionRedactionService.resolvePolicy`:
 * the `runtimeData.redaction` snapshot wins, the workflow setting is the
 * fallback; manual runs consult the manual channel, every other mode the
 * production channel. For a V2 snapshot, production is clamped up when
 * manual is set, matching the fail-strict clamp in {@link channelsToPolicy}.
 */
export function shouldRedactConsoleOutput(
	redaction: IRedactionSetting | undefined,
	workflowSettings: IWorkflowSettings | undefined,
	mode: WorkflowExecuteMode,
): boolean {
	const channels: RedactionChannels =
		redaction === undefined
			? policyToChannels(workflowSettings?.redactionPolicy ?? 'none')
			: redaction.version === 2
				? { production: redaction.production || redaction.manual, manual: redaction.manual }
				: policyToChannels(redaction.policy);

	return mode === 'manual' ? channels.manual : channels.production;
}
