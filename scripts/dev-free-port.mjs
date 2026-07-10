#!/usr/bin/env node
/**
 * Wraps the dev command so parallel checkouts don't fight over n8n's default
 * ports. If N8N_PORT is set explicitly it is respected as-is. Otherwise, when
 * 5678 is taken, the next free adjacent port pair (main + task broker) is
 * picked and exported, and the editor's Vite config reads N8N_PORT to point
 * the browser at the right backend.
 *
 * Usage: node scripts/dev-free-port.mjs <command> [args...]
 */
import { spawn } from 'node:child_process';
import net from 'node:net';

const DEFAULT_PORT = 5678;
const DEFAULT_BROKER_PORT = 5679;
const MAX_PORT = DEFAULT_PORT + 100;

// Same address n8n binds to by default (N8N_LISTEN_ADDRESS)
const LISTEN_ADDRESS = '::';

const isFree = async (port) =>
	await new Promise((resolve) => {
		const server = net.createServer();
		server.once('error', () => resolve(false));
		server.once('listening', () => server.close(() => resolve(true)));
		server.listen(port, LISTEN_ADDRESS);
	});

const env = { ...process.env };

if (!env.N8N_PORT && !(await isFree(DEFAULT_PORT))) {
	// Skip 5679: it's the busy instance's task broker. Step by 2 to keep the
	// main + broker ports adjacent, mirroring the default 5678/5679 layout.
	// ponytail: probe-then-launch has a small race if two checkouts start in
	// the same instant; rerunning dev resolves it.
	let port = DEFAULT_PORT + 2;
	while (port < MAX_PORT && !((await isFree(port)) && (await isFree(port + 1)))) {
		port += 2;
	}
	if (port >= MAX_PORT) {
		console.error(`No free port found between ${DEFAULT_PORT} and ${MAX_PORT}.`);
		process.exit(1);
	}
	env.N8N_PORT = String(port);
	env.N8N_RUNNERS_BROKER_PORT ??= String(port + 1);
	console.log(
		`Port ${DEFAULT_PORT} is in use — starting n8n on http://localhost:${port} instead ` +
			`(task broker on ${port + 1})`,
	);
} else if (!env.N8N_PORT) {
	// Reserve the broker port decision for the default case too, so an
	// explicitly configured broker port is never overridden.
	env.N8N_RUNNERS_BROKER_PORT ??= String(DEFAULT_BROKER_PORT);
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
	console.error('Usage: node scripts/dev-free-port.mjs <command> [args...]');
	process.exit(1);
}

const child = spawn(command, args, {
	stdio: 'inherit',
	env,
	shell: process.platform === 'win32',
});
child.on('exit', (code, signal) => {
	if (signal) process.kill(process.pid, signal);
	process.exit(code ?? 0);
});
