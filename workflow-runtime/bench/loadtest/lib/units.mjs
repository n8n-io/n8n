// Starts and stops processes as transient systemd services in `lt.slice`,
// each with a CPU set and a memory limit, as env.sh `unit` does. A unit's
// cgroup gives its CPU time and its processes.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const LT = process.env.LT || path.join(process.env.HOME, 'wfrt-loadtest');
const LOGS = path.join(LT, 'logs');

export function startUnit(name, { cpus, mem, dir, env, argv }) {
	fs.mkdirSync(LOGS, { recursive: true });
	const envFile = path.join(LOGS, `${name}.env`);
	fs.writeFileSync(envFile, Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 });
	const log = path.join(LOGS, `${name}.log`);
	try {
		execFileSync('sudo', ['systemctl', 'reset-failed', `lt-${name}`], { stdio: 'ignore' });
	} catch {
		// No such unit.
	}
	execFileSync('sudo', [
		'systemd-run', '--quiet', `--unit=lt-${name}`, '--slice=lt.slice',
		`--uid=${process.getuid()}`, `--gid=${process.getgid()}`,
		'-p', `AllowedCPUs=${cpus}`, '-p', `MemoryMax=${mem}`, '-p', 'MemorySwapMax=0', '-p', 'KillMode=control-group',
		'-p', `StandardOutput=append:${log}`, '-p', `StandardError=append:${log}`,
		`--working-directory=${dir}`, '-p', `EnvironmentFile=${envFile}`,
		...argv,
	]);
	return log;
}

export function stopUnit(name) {
	for (const args of [['stop', `lt-${name}`], ['reset-failed', `lt-${name}`]]) {
		try {
			execFileSync('sudo', ['systemctl', ...args], { stdio: 'ignore' });
		} catch {
			// Gone.
		}
	}
}

export function unitActive(name) {
	try {
		return execFileSync('systemctl', ['is-active', `lt-${name}`], { encoding: 'utf8' }).trim() === 'active';
	} catch {
		return false;
	}
}
