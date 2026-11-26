import { mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { configDir, displayPath } from '../config/paths';
import { RigError } from '../errors';

const LOCK_WAIT_MS = 10_000;
const LOCK_STALE_MS = 30_000;

function sleepSync(ms: number): void {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Runs `fn` while no other rig process can make a key, so two processes never make two keys. */
export function withKeyLock<T>(fn: () => T): T {
	mkdirSync(configDir(), { recursive: true });
	const lock = join(configDir(), '.secrets-key.lock');
	const deadline = Date.now() + LOCK_WAIT_MS;
	for (;;) {
		try {
			mkdirSync(lock);
			break;
		} catch (error) {
			if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
			// A process that crashed while it held the lock leaves it behind.
			const age = Date.now() - (statSync(lock, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
			if (age > LOCK_STALE_MS) {
				rmSync(lock, { recursive: true, force: true });
				continue;
			}
			if (Date.now() > deadline) {
				throw new RigError(
					'Another rig process is making the secrets key.',
					`Try again. If no other rig process runs, delete ${displayPath(lock)}.`,
				);
			}
			sleepSync(50);
		}
	}
	try {
		return fn();
	} finally {
		rmSync(lock, { recursive: true, force: true });
	}
}
