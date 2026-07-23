import type { DynamicCredentialsUsage, IRunData } from './interfaces';
import type { IRunExecutionData } from './run-execution-data/run-execution-data';

/**
 * True when any node in the run resolved a private (resolvable) credential dynamically.
 * The redaction layer relies on this to decide whether an execution must be redacted, and it is
 * forwarded from a sub-workflow onto its calling node.
 */
export function runDataUsedDynamicCredentials(runData: IRunData | undefined): boolean {
	return Object.values(runData ?? {}).some((tasks) =>
		// runData node arrays can hold null placeholder slots at runtime despite the
		// ITaskData[] type, so guard the element deref.
		tasks.some((task) => task?.usedDynamicCredentials === true),
	);
}

/**
 * True when any node in the run attempted to resolve a private credential, regardless of success.
 * Superset of {@link runDataUsedDynamicCredentials} (it also captures failed attempts); used for
 * telemetry and the `usedPrivateCredentials` marker.
 */
export function runDataAttemptedDynamicCredentials(runData: IRunData | undefined): boolean {
	return Object.values(runData ?? {}).some((tasks) =>
		tasks.some((task) => task?.attemptedDynamicCredentials === true),
	);
}

/**
 * Summarizes a run's private-credential usage so a sub-execution can report it to its caller.
 * Credentials resolve under the sub-workflow's own context, so the parent would otherwise never
 * flag that its embedded output used a private credential; recurses via the child's task flags.
 */
export function summarizeDynamicCredentialsUsage(
	executionData: IRunExecutionData | undefined,
): DynamicCredentialsUsage {
	const runData = executionData?.resultData?.runData;
	const usage: DynamicCredentialsUsage = {};

	if (runDataUsedDynamicCredentials(runData)) {
		usage.usedDynamicCredentials = true;
		const resolvedUserId = executionData?.executionData?.runtimeData?.executedByUserId;
		if (resolvedUserId) {
			usage.dynamicCredentialsResolvedUserId = resolvedUserId;
		}
	}

	if (runDataAttemptedDynamicCredentials(runData)) {
		usage.attemptedDynamicCredentials = true;
	}

	return usage;
}

/** The per-node dynamic-credential flags carried on `IWorkflowExecuteAdditionalData`. */
interface DynamicCredentialsUsageTarget {
	currentNodeUsedDynamicCredentials?: boolean;
	currentNodeAttemptedDynamicCredentials?: boolean;
	dynamicCredentialsResolvedUserId?: string;
}

/**
 * Applies a reported usage summary onto the per-node flags additively (flags only ever get set,
 * matching the other flag writers — the engine resets them per node). Resolved user id is
 * execution-scoped, so a present value wins (matches credential resolution).
 */
export function applyDynamicCredentialsUsage(
	target: DynamicCredentialsUsageTarget,
	usage: DynamicCredentialsUsage,
): void {
	if (usage.usedDynamicCredentials) {
		target.currentNodeUsedDynamicCredentials = true;
		if (usage.dynamicCredentialsResolvedUserId) {
			target.dynamicCredentialsResolvedUserId = usage.dynamicCredentialsResolvedUserId;
		}
	}
	if (usage.attemptedDynamicCredentials) {
		target.currentNodeAttemptedDynamicCredentials = true;
	}
}

/**
 * Rides a usage summary on an error crossing the sub-execution boundary, so a caller that
 * continues on fail can still flag its task (a failed resolution is the primary case
 * `attemptedDynamicCredentials` exists for). Read back via
 * {@link takeAttachedDynamicCredentialsUsage}.
 */
export function attachDynamicCredentialsUsage(error: Error, usage: DynamicCredentialsUsage): Error {
	if (Object.keys(usage).length > 0) {
		Object.assign(error, { dynamicCredentialsUsage: usage });
	}
	return error;
}

/**
 * Reads back and strips a usage summary attached via {@link attachDynamicCredentialsUsage},
 * validating its shape. The marker is transport-only: stripping it keeps it out of the
 * persisted `taskData.error` when the caller's node fails with this error.
 */
export function takeAttachedDynamicCredentialsUsage(
	error: unknown,
): DynamicCredentialsUsage | undefined {
	if (typeof error !== 'object' || error === null || !('dynamicCredentialsUsage' in error)) {
		return undefined;
	}
	const attached = error.dynamicCredentialsUsage;
	Reflect.deleteProperty(error, 'dynamicCredentialsUsage');
	if (typeof attached !== 'object' || attached === null) return undefined;

	const usage: DynamicCredentialsUsage = {};
	if ('usedDynamicCredentials' in attached && attached.usedDynamicCredentials === true) {
		usage.usedDynamicCredentials = true;
	}
	if ('attemptedDynamicCredentials' in attached && attached.attemptedDynamicCredentials === true) {
		usage.attemptedDynamicCredentials = true;
	}
	if (
		'dynamicCredentialsResolvedUserId' in attached &&
		typeof attached.dynamicCredentialsResolvedUserId === 'string'
	) {
		usage.dynamicCredentialsResolvedUserId = attached.dynamicCredentialsResolvedUserId;
	}
	return Object.keys(usage).length > 0 ? usage : undefined;
}
