import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';

import type { EnvPaths } from '../config/paths';

const stateSchema = z.object({
	component: z.string(),
	pid: z.number().int(),
	/** The `rig` process that shows the logs and stops the component on exit. Null in the background. */
	ownerPid: z.number().int().nullable(),
	ownerTty: z.string().nullable(),
	startedAt: z.string(),
	envHash: z.string(),
	ports: z.array(z.number().int()),
	/** Start time of the process from `ps`. Detects a reused pid. n8n changes its own command line. */
	processStart: z.string(),
	source: z.string().nullable(),
	/** The Node inspector flag, so a restart from any terminal keeps it. */
	inspect: z.enum(['inspect', 'inspect-brk']).optional(),
});

export type ComponentState = z.infer<typeof stateSchema>;

export function readState(paths: EnvPaths, component: string): ComponentState | undefined {
	const file = paths.state(component);
	if (!existsSync(file)) return undefined;
	try {
		const result = stateSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
		return result.success ? result.data : undefined;
	} catch {
		return undefined;
	}
}

export function writeState(paths: EnvPaths, state: ComponentState): void {
	const file = paths.state(state.component);
	mkdirSync(dirname(file), { recursive: true });
	const tmp = `${file}.${process.pid}.tmp`;
	writeFileSync(tmp, JSON.stringify(state, null, '\t'));
	renameSync(tmp, file);
}

/** Deletes the state file, but only when it still describes the given pid. */
export function clearState(paths: EnvPaths, component: string, pid?: number): void {
	const state = readState(paths, component);
	if (pid !== undefined && state && state.pid !== pid) return;
	rmSync(paths.state(component), { force: true });
}

export function isPidAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return error instanceof Error && 'code' in error && error.code === 'EPERM';
	}
}

/** The start time of a process, or an empty string when `ps` cannot tell. */
export function processStartTime(pid: number): string {
	const result = spawnSync('ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8' });
	if (result.status !== 0 || result.error) return '';
	return result.stdout.trim();
}

/**
 * Start times that `ps` confirmed, by pid. A pid can only be reused after its
 * process exits, so while the pid stays alive, the cheap `kill(pid, 0)` check is
 * enough. This keeps `ps` out of the once-a-second monitor of `rig up`.
 */
const verifiedStarts = new Map<number, string>();

/** Whether the process of the state still runs, and is still the same process. */
export function isStateAlive(state: ComponentState): boolean {
	if (!isPidAlive(state.pid)) {
		verifiedStarts.delete(state.pid);
		return false;
	}
	if (!state.processStart) return true;
	if (verifiedStarts.get(state.pid) === state.processStart) return true;
	const start = processStartTime(state.pid);
	if (start === state.processStart) verifiedStarts.set(state.pid, start);
	return start === '' || start === state.processStart;
}

/**
 * Whether the pid of the state is dead, still the recorded process, or now a
 * different process. The OS can recycle a pid after its process exits, so check
 * the start time before a signal. Without a recorded or a readable start time,
 * this cannot tell and answers 'same'.
 */
export function pidIdentity(state: ComponentState): 'dead' | 'same' | 'other' {
	if (!isPidAlive(state.pid)) return 'dead';
	if (!state.processStart) return 'same';
	const start = processStartTime(state.pid);
	if (start === '') return 'same';
	return start === state.processStart ? 'same' : 'other';
}

/** Returns the state of a running component, and removes stale state. */
export function liveState(paths: EnvPaths, component: string): ComponentState | undefined {
	const state = readState(paths, component);
	if (!state) return undefined;
	if (isStateAlive(state)) return state;
	clearState(paths, component, state.pid);
	return undefined;
}

/** The states of all running components, including components that left the topology. */
export function liveStates(paths: EnvPaths): ComponentState[] {
	if (!existsSync(paths.stateDir)) return [];
	return readdirSync(paths.stateDir)
		.filter((file) => file.endsWith('.json'))
		.map((file) => readState(paths, file.slice(0, -'.json'.length)))
		.filter((state): state is ComponentState => state !== undefined)
		.filter((state) => liveState(paths, state.component) !== undefined);
}

export function currentTty(): string | null {
	if (!process.stdin.isTTY) return null;
	const result = spawnSync('tty', { stdio: ['inherit', 'pipe', 'ignore'], encoding: 'utf8' });
	const tty = result.stdout?.trim();
	return tty && !tty.startsWith('not') ? tty : null;
}
