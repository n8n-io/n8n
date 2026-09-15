// Shared serve plumbing for `dev:up` and `preview:serve`: wait for the backend to
// answer its health endpoint, share the port with the org when we are on a
// codespace, and print the URL.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import { codespaceName, forwardingDomain } from './codespace-env.mjs';

const CODESPACES_DIR = '/workspaces/.codespaces';

export const servePort = () => process.env.N8N_PORT ?? '5678';

// Probe the same health path the backend serves (defaults to /healthz).
export const serveHealthPath = () =>
	process.env.N8N_ENDPOINT_HEALTH
		? `/${process.env.N8N_ENDPOINT_HEALTH.replace(/^\//, '')}`
		: '/healthz';

export async function waitForHealth(port, healthPath, timeoutMs = 120_000, intervalMs = 3000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}${healthPath}`, {
				signal: AbortSignal.timeout(5000),
			});
			if (res.ok) return true;
		} catch {}
		await sleep(intervalMs);
	}
	return false;
}

// `/healthz` answers ok as soon as the process listens: it checks neither the
// database nor the routes. n8n unblocks `/healthz/readiness` from markAsReady(),
// after the migrations run and the controllers mount, so it is the only safe gate
// for anything that then calls the REST API.
export const waitForReady = (port, healthPath, timeoutMs = 180_000, intervalMs = 3000) =>
	waitForHealth(port, `${healthPath}/readiness`, timeoutMs, intervalMs);

// In a codespace, share the port with the org. Then any n8n member can open the
// URL. GitHub makes every port private again at each start, so set it here. If
// `gh` fails, report the reason and let the caller carry on.
export function shareWithOrg(port, name = codespaceName()) {
	if (!name) return { shared: false };
	try {
		execFileSync('gh', ['codespace', 'ports', 'visibility', `${port}:org`, '-c', name], {
			stdio: ['ignore', 'ignore', 'pipe'],
		});
		return { name, shared: true };
	} catch (error) {
		const stderr = error.stderr?.toString().trim();
		return { name, shared: false, error: (stderr || error.message).split('\n').pop() };
	}
}

export const serveUrl = (port, name) =>
	name ? `https://${name}-${port}.${forwardingDomain()}` : `http://localhost:${port}`;

export function reportUp(port, { name, shared, error }, codespacesDir = CODESPACES_DIR) {
	console.log(`\nUp: ${serveUrl(port, name)}`);
	if (name)
		console.log(
			shared
				? '(org-visible — any n8n member signed into GitHub can open it)'
				: `(still private: ${error} — retry with \`gh codespace ports visibility ${port}:org -c ${name}\`)`,
		);
	else if (existsSync(codespacesDir))
		console.log(
			`(on a codespace but the box name did not resolve, so ${port} was not shared with the org — see .devcontainer/codespaces/README.md)`,
		);
}
