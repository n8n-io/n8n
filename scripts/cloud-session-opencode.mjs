import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

import { openCodeProxy } from './cloud-session-opencode-proxy.mjs';

export function parseOpenCodeArgs(args) {
	const options = { name: 'agent', web: false, fresh: false, port: 0, help: false };
	let named = false;
	for (let index = 0; index < args.length; index++) {
		const arg = args[index];
		if (arg === '--web') options.web = true;
		else if (arg === '--new') options.fresh = true;
		else if (arg === '--help' || arg === '-h') options.help = true;
		else if (arg === '--port') {
			const value = args[++index];
			if (!/^\d+$/.test(value ?? '') || +value < 1 || +value > 65535)
				throw new Error('--port must be 1–65535.');
			options.port = +value;
		} else if (!named && /^[\w-]+$/.test(arg) && !arg.startsWith('-')) {
			options.name = arg;
			named = true;
		} else {
			throw new Error(
				`Unknown argument: ${arg}. Use --help. Use --legacy for remote OpenCode CLI flags.`,
			);
		}
	}
	if (options.web && !options.port) options.port = 4096;
	return options;
}

function localVersion() {
	const result = spawnSync('opencode', ['--version'], { encoding: 'utf8' });
	if (result.error || result.status !== 0)
		throw new Error('Install OpenCode locally, or use --web to connect with a browser.');
	const version = result.stdout.trim();
	if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version))
		throw new Error('Cannot read the local OpenCode version. Use --web or --legacy.');
	return version;
}

export async function freePort(excludedPort) {
	const server = createServer();
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const { port } = server.address();
	try {
		// Keep a conflicting port reserved while the OS selects another one.
		return port === excludedPort ? await freePort() : port;
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
}

function startChild(command, args, options = {}) {
	const child = spawn(command, args, options);
	let finished = false;
	const done = new Promise((resolve) => {
		child.once('error', (error) => {
			finished = true;
			resolve({ code: 1, error });
		});
		// Wait for stdout to close before parsing the SSH response.
		child.once('close', (code, signal) => {
			finished = true;
			resolve({ code: code ?? (signal ? 1 : 0) });
		});
	});
	const kill = (signal) => {
		if (!child.pid) return;
		try {
			if (options.detached) process.kill(-child.pid, signal);
			else child.kill(signal);
		} catch (error) {
			if (error.code !== 'ESRCH') throw error;
		}
	};
	return {
		child,
		done,
		get finished() {
			return finished;
		},
		async stop() {
			// gh starts ssh as a child. Terminate the process group to close the tunnel too.
			kill('SIGTERM');
			await Promise.race([done, delay(2000, undefined, { ref: false })]);
			if (!finished) kill('SIGKILL');
		},
	};
}

async function bootstrap(codespace, options, signal) {
	signal.throwIfAborted();
	console.log(`Preparing OpenCode workspace '${options.name}' on ${codespace}…`);
	const command = `umask 077; mkdir -p /workspaces/.n8n-opencode && flock --close -w 600 /workspaces/.n8n-opencode/launch.lock node --input-type=module - ${options.name} ${options.fresh}`;
	const remote = startChild('gh', ['codespace', 'ssh', '-c', codespace, '--', command], {
		stdio: ['pipe', 'pipe', 'inherit'],
		detached: true,
	});
	let stdout = '';
	remote.child.stdout.setEncoding('utf8');
	remote.child.stdout.on('data', (chunk) => {
		stdout += chunk;
	});
	remote.child.stdin.on('error', () => {});
	const abort = () => {
		void remote.stop();
	};
	signal.addEventListener('abort', abort, { once: true });
	try {
		remote.child.stdin.end(
			readFileSync(new URL('../.devcontainer/codespaces/opencode-server.mjs', import.meta.url)),
		);
		const result = await remote.done;
		signal.throwIfAborted();
		if (result.code !== 0)
			throw new Error('Could not prepare OpenCode. Check the SSH output above, then retry.');
		let state;
		try {
			state = JSON.parse(stdout.trim().split('\n').at(-1));
		} catch {
			throw new Error('Invalid OpenCode server response.');
		}
		if (
			!state ||
			!Number.isInteger(state.port) ||
			state.port < 1 ||
			state.port > 65535 ||
			typeof state.password !== 'string' ||
			!/^[a-f0-9]{64}$/.test(state.password) ||
			typeof state.sessionID !== 'string' ||
			!/^ses_[\w]+$/.test(state.sessionID) ||
			state.directory !==
				(options.name === 'agent' ? '/workspaces/n8n' : `/workspaces/wt-${options.name}`)
		) {
			throw new Error('Invalid OpenCode server response.');
		}
		return state;
	} finally {
		signal.removeEventListener('abort', abort);
		if (!remote.finished) await remote.stop();
	}
}

async function waitForTunnel(url, password, tunnel, signal) {
	for (let attempt = 0; attempt < 60; attempt++) {
		signal.throwIfAborted();
		if (tunnel.finished)
			throw new Error('The SSH tunnel closed. Check the SSH output above, then reconnect.');
		let response;
		try {
			response = await fetch(`${url}/global/health`, {
				headers: {
					authorization: `Basic ${Buffer.from(`opencode:${password}`).toString('base64')}`,
				},
				signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]),
			});
		} catch {
			/* The listener is not ready yet. */
		}
		if (response) {
			if (!response.ok)
				throw new Error(
					`OpenCode health check failed (${response.status}). Reconnect after checking the remote server.`,
				);
			const health = await response.json();
			if (health.healthy !== true || typeof health.version !== 'string')
				throw new Error('Invalid OpenCode health response.');
			return health;
		}
		await delay(500, undefined, { signal });
	}
	throw new Error('Timed out while connecting to OpenCode. Run the session command again.');
}

function openBrowser(url) {
	const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
	const browser = spawn(command, [url], { stdio: 'ignore', detached: true });
	browser.on('error', () => console.log('Open the URL above in your browser.'));
	browser.on('exit', (code) => {
		if (code) console.log('Open the URL above in your browser.');
	});
	browser.unref();
}

export async function connectOpenCode(options, ensureCodespace) {
	if (process.platform === 'win32')
		throw new Error('Run this command in WSL. Native Windows is not supported.');
	const version = options.web ? undefined : localVersion();
	const controller = new AbortController();
	const interrupt = () => controller.abort();
	process.on('SIGINT', interrupt);
	process.on('SIGTERM', interrupt);
	process.on('SIGHUP', interrupt);
	let tunnel;
	let client;
	let proxy;
	try {
		const codespace = ensureCodespace();
		const state = await bootstrap(codespace, options, controller.signal);
		const port = !options.web && options.port ? options.port : await freePort(options.port);
		const url = `http://127.0.0.1:${port}`;
		tunnel = startChild(
			'gh',
			[
				'codespace',
				'ssh',
				'-c',
				codespace,
				'--',
				'-N',
				'-o',
				'ExitOnForwardFailure=yes',
				'-o',
				'ServerAliveInterval=15',
				'-o',
				'ServerAliveCountMax=3',
				'-L',
				`127.0.0.1:${port}:127.0.0.1:${state.port}`,
			],
			{ stdio: ['ignore', 'ignore', 'inherit'], detached: true },
		);
		const health = await waitForTunnel(url, state.password, tunnel, controller.signal);
		if (version && health.version !== version) {
			throw new Error(
				`OpenCode versions differ: local ${version}, server ${health.version}. Install the matching local version, or use --web or --legacy. The remote server is still running.`,
			);
		}
		const stopped = new Promise((resolve) =>
			controller.signal.addEventListener('abort', () => resolve('interrupted'), { once: true }),
		);
		controller.signal.throwIfAborted();
		if (options.web) {
			proxy = await openCodeProxy({
				targetPort: port,
				password: state.password,
				port: options.port,
			});
			const webUrl = `${proxy.origin}/${Buffer.from(state.directory).toString('base64url')}/session/${state.sessionID}`;
			console.log(
				`OpenCode: ${webUrl}\nKeep this command running. Press Ctrl-C to disconnect. The remote server stays running.`,
			);
			openBrowser(webUrl);
		} else {
			console.log(`Connecting to OpenCode ${health.version} in ${state.directory}…`);
			client = startChild(
				'opencode',
				['attach', url, '--dir', state.directory, '--session', state.sessionID],
				{
					stdio: 'inherit',
					env: {
						...process.env,
						OPENCODE_SERVER_PASSWORD: state.password,
						OPENCODE_SERVER_USERNAME: 'opencode',
					},
				},
			);
		}
		const result = await Promise.race([
			stopped,
			tunnel.done.then(() => 'tunnel'),
			...(client ? [client.done] : []),
		]);
		if (typeof result === 'object' && result.code !== 0)
			throw new Error(
				'The local OpenCode client exited with an error. The remote session is saved.',
			);
		if (result === 'tunnel')
			throw new Error(
				'The SSH connection closed. Run the same command to reconnect to the saved session.',
			);
	} catch (error) {
		if (!controller.signal.aborted) throw error;
	} finally {
		proxy?.close();
		if (client && !client.finished) await client.stop();
		if (tunnel) await tunnel.stop();
		process.removeListener('SIGINT', interrupt);
		process.removeListener('SIGTERM', interrupt);
		process.removeListener('SIGHUP', interrupt);
	}
}
