/**
 * Process helpers for the scripts that run Playwright against n8n processes
 * from the local build (`run-local-isolated.mjs`, `run-local-linked.mjs`).
 */

import { rmSync } from 'fs';
import { createServer } from 'net';

/** Ask the OS for a free TCP port. Race-y by nature (the port can be claimed
 *  between close() and the consumer's bind), but acceptable for a dev script. */
export function getFreePort() {
	return new Promise((resolve, reject) => {
		const srv = createServer();
		srv.unref();
		srv.on('error', reject);
		srv.listen(0, '127.0.0.1', () => {
			const { port } = srv.address();
			srv.close(() => resolve(port));
		});
	});
}

/** Resolve true when nothing listens on `port` at `host`. */
export function isPortFree(port, host = '127.0.0.1') {
	return new Promise((resolve) => {
		const probe = createServer();
		probe.unref();
		probe.once('error', () => resolve(false));
		probe.listen(port, host, () => probe.close(() => resolve(true)));
	});
}

/**
 * Wait until `/healthz/readiness` answers 200: the database is migrated and
 * the server has started all its parts. Before this, n8n can answer REST
 * calls with 503, with a "starting up" page or with 404.
 */
export async function waitForReadiness(backendUrl, timeoutMs = 120_000) {
	const deadline = Date.now() + timeoutMs;
	let lastStatus = 'connection refused';
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${backendUrl}/healthz/readiness`);
			lastStatus = `HTTP ${res.status}`;
			if (res.status === 200) return;
		} catch (err) {
			lastStatus = err.message ?? String(err);
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`n8n at ${backendUrl} was not ready within ${timeoutMs}ms (last: ${lastStatus})`);
}

// Poll the actual REST route, not just a health endpoint, so we know controllers
// are registered. We POST `/rest/e2e/reset` with no body — a registered route
// returns 4xx/5xx, an unregistered one returns 404 with an HTML body.
export async function waitForN8n(backendUrl, timeoutMs = 120_000) {
	const deadline = Date.now() + timeoutMs;
	let lastStatus = 'connection refused';
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${backendUrl}/rest/e2e/reset`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}',
			});
			lastStatus = `HTTP ${res.status}`;
			// 404 with HTML => routes not loaded yet. Anything 2xx/4xx/5xx with
			// JSON body means E2EController is registered and listening.
			if (res.status !== 404) return;
			const text = await res.text();
			if (!text.includes('Cannot POST')) return;
		} catch (err) {
			lastStatus = err.message ?? String(err);
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`n8n did not become ready within ${timeoutMs}ms (last: ${lastStatus})`);
}

/** Send `signal` to the process group of a child that was spawned with `detached: true`. */
export function signalProcessGroup(child, signal = 'SIGTERM') {
	if (!child?.pid) return;
	try {
		// Negative pid → signal the whole process group.
		process.kill(-child.pid, signal);
	} catch {
		// Group may already be gone.
	}
}

/** Remove a directory tree. Best-effort: a cleanup failure must not hide the run result. */
export function removeDir(dir) {
	try {
		rmSync(dir, { recursive: true, force: true });
	} catch {
		// best-effort
	}
}

function hasExited(child) {
	return child.exitCode !== null || child.signalCode !== null;
}

/**
 * Stop a detached child and its process group. Send `signal`, wait until the
 * child exits or `graceMs` passes, then send SIGKILL to the group. The SIGKILL
 * also stops processes that outlive the child, such as task runners.
 */
export async function stopProcessGroup(child, { signal = 'SIGTERM', graceMs = 20_000 } = {}) {
	if (!child?.pid) return;
	if (!hasExited(child)) {
		let timer;
		const exited = new Promise((resolve) => child.once('exit', resolve));
		const timeout = new Promise((resolve) => {
			timer = setTimeout(resolve, graceMs);
		});
		signalProcessGroup(child, signal);
		await Promise.race([exited, timeout]);
		clearTimeout(timer);
	}
	signalProcessGroup(child, 'SIGKILL');
}
