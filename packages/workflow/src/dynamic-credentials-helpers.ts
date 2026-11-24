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
 *
 * Also reports `usedCredentialIds`: every credential the run's workflows reference, private or
 * not, which credential usability redaction reads.
 */
export function summarizeDynamicCredentialsUsage(
	executionData: IRunExecutionData | undefined,
	/** The credentials the run's own workflow references. */
	workflowCredentialIds: readonly string[] = [],
): DynamicCredentialsUsage {
	const runData = executionData?.resultData?.runData;
	const usage: DynamicCredentialsUsage = {};

	const usedCredentialIds = new Set(workflowCredentialIds);
	for (const id of runDataUsedCredentialIds(runData)) usedCredentialIds.add(id);
	if (usedCredentialIds.size > 0) usage.usedCredentialIds = [...usedCredentialIds].sort();

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

/** The credentials sub-workflows reported onto the run's tasks. */
export function runDataUsedCredentialIds(runData: IRunData | undefined): string[] {
	const ids = new Set<string>();
	for (const tasks of Object.values(runData ?? {})) {
		for (const task of tasks) {
			// Persisted run data is not validated, so read the ids only when they are a list.
			const taskIds: unknown = task?.usedCredentialIds;
			if (!Array.isArray(taskIds)) continue;
			for (const id of taskIds) if (typeof id === 'string') ids.add(id);
		}
	}
	return [...ids];
}

/** The per-node dynamic-credential flags carried on `IWorkflowExecuteAdditionalData`. */
interface DynamicCredentialsUsageTarget {
	currentNodeUsedDynamicCredentials?: boolean;
	currentNodeAttemptedDynamicCredentials?: boolean;
	dynamicCredentialsResolvedUserId?: string;
	currentNodeUsedCredentialIds?: string[];
}

/**
 * Applies a reported usage summary onto the per-node flags additively (flags only ever get set,
 * matching the other flag writers — the engine resets them per node). Resolved user id is
 * execution-scoped, so a present value wins (matches credential resolution). The plain
 * credential ids are joined with the ones the node already collected.
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
	if (usage.usedCredentialIds?.length) {
		target.currentNodeUsedCredentialIds = [
			...new Set([...(target.currentNodeUsedCredentialIds ?? []), ...usage.usedCredentialIds]),
		];
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
	if ('usedCredentialIds' in attached && Array.isArray(attached.usedCredentialIds)) {
		const ids = attached.usedCredentialIds.filter((id): id is string => typeof id === 'string');
		if (ids.length > 0) usage.usedCredentialIds = ids;
	}
	return Object.keys(usage).length > 0 ? usage : undefined;
}
