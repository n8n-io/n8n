import type { WorkflowSettings } from './interfaces';

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
