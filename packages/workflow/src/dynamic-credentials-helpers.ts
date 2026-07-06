import type { IRunData } from './interfaces';

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
