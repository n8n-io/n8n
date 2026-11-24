import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import { envsDir } from '../src/config/paths';
import { envPaths } from '../src/environment';
import {
	type ComponentState,
	liveStates,
	pidIdentity,
	processStartTime,
	writeState,
} from '../src/runtime/state';
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

describe('pid identity', () => {
	it('should recognize the same process, a dead pid, and a recycled pid', () => {
		const same = state('main-1', process.pid);
		same.processStart = processStartTime(process.pid);
		expect(pidIdentity(same)).toBe('same');

		const dead = state('main-1', DEAD_PID);
		dead.processStart = 'Wed Jan  1 00:00:00 1970';
		expect(pidIdentity(dead)).toBe('dead');

		const recycled = state('main-1', process.pid);
		recycled.processStart = 'Wed Jan  1 00:00:00 1970';
		expect(pidIdentity(recycled)).toBe('other');
	});

	it('should answer same when it cannot tell the start time', () => {
		// state() records no processStart, so there is no anchor to compare.
		expect(pidIdentity(state('main-1', process.pid))).toBe('same');
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
