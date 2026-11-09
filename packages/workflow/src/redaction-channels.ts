import type { IExecutionContext, IRedactionSetting } from './execution-context';
import type { IWorkflowSettings, WorkflowExecuteMode, WorkflowSettings } from './interfaces';
import type { IRunExecutionData } from './run-execution-data/run-execution-data';

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
 * Reads the per-channel redaction from a captured snapshot, normalizing the V1
 * (single policy enum) and V2 (per-channel booleans) shapes. An absent snapshot
 * means nothing is redacted.
 */
export function redactionSettingToChannels(
	redaction: IRedactionSetting | undefined,
): RedactionChannels {
	if (!redaction) return { production: false, manual: false };
	if (redaction.version === 2)
		return { production: redaction.production, manual: redaction.manual };
	return policyToChannels(redaction.policy);
}

const NO_REDACTION: RedactionChannels = { production: false, manual: false };

function redactsAnyChannel(channels: RedactionChannels): boolean {
	return channels.production || channels.manual;
}

/** Combines two sets of channels, strictest per channel. */
export function mergeRedactionChannels(
	a: RedactionChannels,
	b: RedactionChannels | undefined,
): RedactionChannels {
	if (!b) return a;
	return { production: a.production || b.production, manual: a.manual || b.manual };
}

/**
 * The channels an execution redacts: the snapshot taken at start combined with
 * the channels its sub-workflows reported (see `subWorkflowRedaction`).
 */
export function effectiveRedactionChannels(
	context: Pick<IExecutionContext, 'redaction' | 'subWorkflowRedaction'> | undefined,
): RedactionChannels {
	return mergeRedactionChannels(
		redactionSettingToChannels(context?.redaction),
		context?.subWorkflowRedaction,
	);
}

/**
 * The channels a sub-execution reports to its caller. The caller keeps a copy
 * of the sub-execution's output, so it must redact at least what the
 * sub-execution redacts.
 *
 * What the sub-execution received from its own sub-workflows always passes up.
 * `includeOwn` adds the sub-execution's own effective channels. Returns
 * `undefined` when no channel is redacted.
 */
export function summarizeSubWorkflowRedaction(
	executionData: IRunExecutionData | undefined,
	options: { includeOwn: boolean },
): RedactionChannels | undefined {
	const context = executionData?.executionData?.runtimeData;
	const channels = options.includeOwn
		? effectiveRedactionChannels(context)
		: mergeRedactionChannels(NO_REDACTION, context?.subWorkflowRedaction);
	return redactsAnyChannel(channels) ? channels : undefined;
}

/**
 * Raises the caller's `subWorkflowRedaction` with the channels a sub-execution
 * reported. A channel is never lowered.
 *
 * Assigns a new object and never mutates the existing one: a sub-execution's
 * context spreads its caller's context, so the nested object is shared when
 * both run in the same process.
 */
export function escalateSubWorkflowRedaction(
	runtimeData: IExecutionContext | undefined,
	channels: RedactionChannels | undefined,
): void {
	if (!runtimeData || !channels || !redactsAnyChannel(channels)) return;
	runtimeData.subWorkflowRedaction = mergeRedactionChannels(
		runtimeData.subWorkflowRedaction ?? NO_REDACTION,
		channels,
	);
}

/**
 * Rides the reported channels on an error that crosses the sub-execution
 * boundary, so a caller that continues on fail still escalates. Read back via
 * {@link takeAttachedSubWorkflowRedaction}.
 */
export function attachSubWorkflowRedaction(
	error: Error,
	channels: RedactionChannels | undefined,
): Error {
	if (channels && redactsAnyChannel(channels)) {
		Object.assign(error, { subWorkflowRedaction: channels });
	}
	return error;
}

/**
 * Reads back and strips the channels attached via
 * {@link attachSubWorkflowRedaction}, and validates their shape. The marker is
 * transport-only: stripping it keeps it out of the persisted `taskData.error`.
 */
export function takeAttachedSubWorkflowRedaction(error: unknown): RedactionChannels | undefined {
	if (typeof error !== 'object' || error === null || !('subWorkflowRedaction' in error)) {
		return undefined;
	}
	const attached = error.subWorkflowRedaction;
	Reflect.deleteProperty(error, 'subWorkflowRedaction');
	if (typeof attached !== 'object' || attached === null) return undefined;

	const channels: RedactionChannels = {
		production: 'production' in attached && attached.production === true,
		manual: 'manual' in attached && attached.manual === true,
	};
	return redactsAnyChannel(channels) ? channels : undefined;
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
 * The channels reported by sub-workflows (`subWorkflowRedaction`) are
 * combined in, strictest per channel, with the same clamp.
 */
export function shouldRedactConsoleOutput(
	redaction: IRedactionSetting | undefined,
	workflowSettings: IWorkflowSettings | undefined,
	mode: WorkflowExecuteMode,
	subWorkflowRedaction?: RedactionChannels,
): boolean {
	const base: RedactionChannels =
		redaction === undefined
			? policyToChannels(workflowSettings?.redactionPolicy ?? 'none')
			: redaction.version === 2
				? { production: redaction.production || redaction.manual, manual: redaction.manual }
				: policyToChannels(redaction.policy);
	const channels = mergeRedactionChannels(
		base,
		subWorkflowRedaction && {
			production: subWorkflowRedaction.production || subWorkflowRedaction.manual,
			manual: subWorkflowRedaction.manual,
		},
	);

	return mode === 'manual' ? channels.manual : channels.production;
}
