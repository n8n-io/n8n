import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import { envsDir } from '../src/config/paths';
import { envPaths } from '../src/environment';
import { type ComponentState, liveStates, writeState } from '../src/runtime/state';
import { inheritedOwner } from '../src/runtime/supervisor';

function state(component: string, pid: number, ownerPid: number | null = null): ComponentState {
	return {
		component,
		pid,
		ownerPid,
		ownerTty: ownerPid === null ? null : '/dev/ttys001',
		startedAt: new Date().toISOString(),
		envHash: 'hash',
		ports: [],
		processStart: '',
		source: null,
	};
}

// A pid above the default pid_max of Linux and macOS, so no process has it.
const DEAD_PID = 4_194_304 + 1;

afterEach(() => {
	rmSync(envsDir(), { recursive: true, force: true });
});

describe('live states', () => {
	it('should list running components, also those that left the topology, and skip stale state', () => {
		const paths = envPaths('s');
		writeState(paths, state('worker-2', process.pid));
		writeState(paths, state('worker-3', DEAD_PID));
		expect(liveStates(paths).map((s) => s.component)).toEqual(['worker-2']);
	});

	it('should be empty without a state directory', () => {
		expect(liveStates(envPaths('none'))).toEqual([]);
	});
});

describe('inherited owner', () => {
	it('should keep a live owner in another terminal', () => {
		const other = process.ppid;
		expect(inheritedOwner(state('main-1', 1, other), 'self')).toEqual({
			pid: other,
			tty: '/dev/ttys001',
		});
	});

	it('should use the fallback without a live owner', () => {
		expect(inheritedOwner(state('main-1', 1, DEAD_PID), 'self')).toBe('self');
		expect(inheritedOwner(state('main-1', 1, null), 'background')).toBe('background');
		expect(inheritedOwner(undefined, 'self')).toBe('self');
	});

	it('should keep this process as the owner', () => {
		expect(inheritedOwner(state('main-1', 1, process.pid), 'background')).toBe('self');
	});
});
