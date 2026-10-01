import type { DeltaCursor } from '../transport/delta';

/**
 * A library that has been deleted stays deleted, so repeating its error on
 * every tick fills the log without adding anything. The first failure, and
 * any change of failure, still surface at once.
 */
export const ERROR_REPEAT_MS = 60 * 60 * 1000;

export type PollState = {
	/** The `@odata.deltaLink`, or an `@odata.nextLink` when a drain ran long. */
	cursor?: string;
	/** Credential, site and library the cursor belongs to. */
	scope?: string;
	errorKey?: string;
	errorAt?: number;
};

export const scopeOf = (credentialType: string, siteId: string, driveId: string): string =>
	`${credentialType}|${siteId}|${driveId}`;

/**
 * A stored link is reused only while the scope is unchanged. Resuming another
 * library's feed would report changes the user never asked to watch, so a
 * changed scope starts from now instead.
 */
export function cursorFor(state: PollState, scope: string): DeltaCursor {
	const reusable = state.scope === scope && typeof state.cursor === 'string' && state.cursor !== '';
	return reusable ? { kind: 'link', url: state.cursor as string } : { kind: 'latest' };
}

export function saveCursor(state: PollState, scope: string, cursor: string): void {
	state.scope = scope;
	state.cursor = cursor;
}

/** Drops the cursor but keeps the scope, so the next poll re-arms from now. */
export function rearm(state: PollState, scope: string): void {
	state.scope = scope;
	delete state.cursor;
}

export const errorKeyOf = (error: unknown): string =>
	error instanceof Error ? `${error.name}:${error.message}` : String(error);

/**
 * Records a failing poll and reports whether it should surface. Returns true
 * for the first failure, for a different failure, and once an hour after that.
 */
export function noteError(state: PollState, key: string, nowMs: number): boolean {
	const report = state.errorKey !== key || nowMs - (state.errorAt ?? 0) >= ERROR_REPEAT_MS;
	if (report) {
		state.errorKey = key;
		state.errorAt = nowMs;
	}
	return report;
}

export function clearError(state: PollState): void {
	delete state.errorKey;
	delete state.errorAt;
}
