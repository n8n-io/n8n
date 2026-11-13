#!/usr/bin/env node
// Runs the TypeScript CLI with tsx, so `pnpm rig` needs no build step.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
const tsx = import.meta.resolve('tsx');

const child = spawn(process.execPath, ['--import', tsx, cli, ...process.argv.slice(2)], {
	stdio: 'inherit',
	env: { ...process.env, INIT_CWD: process.env.INIT_CWD ?? process.cwd() },
});

// Forward signals that reach only this wrapper. The CLI handles a repeated signal.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
	process.on(signal, () => {
		if (child.exitCode === null) child.kill(signal);
	});
}

child.on('exit', (code, signal) => {
	if (signal) {
		// Exit with the same signal. The forwarding handler would catch it otherwise.
		process.removeAllListeners(signal);
		process.kill(process.pid, signal);
	} else {
		process.exit(code ?? 1);
	}
});
