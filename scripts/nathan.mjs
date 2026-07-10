#!/usr/bin/env node
// Repo-local client for the "Nathan" deploy bot (normally driven via Slack
// `/nathan ...`). Nathan is fire-and-forget: the webhook returns instantly and
// POSTs its real reply (deploy URL, help text, errors) back to the
// `response_url` we hand it — the same mechanism Slack uses. Since the internal
// instance can't reach localhost, we open a throwaway public tunnel to a local
// server, use that as the response_url, print whatever Nathan sends, and clean up.
//
// Usage:  node scripts/nathan.mjs <nathan args>     (or: pnpm nathan -- <args>)
//   node scripts/nathan.mjs help
//   node scripts/nathan.mjs deploy my-branch --license pro2
//   node scripts/nathan.mjs deploy master test-ai --ai
//
// Requires NATHAN_TOKEN (put it in .env.local — gitignored). A public tunnel is
// opened via `cloudflared` (preferred) or `npx localtunnel` as a fallback.
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const WEBHOOK = 'https://internal.users.n8n.cloud/webhook/85070485-140c-46e8-9b4b-d161bf7ee1ac';
const IDLE_MS = Number(process.env.NATHAN_IDLE_MS ?? 8000); // grace after a result for trailing msgs
// Overall backstop. A cold branch build (docker-build-push CI) + deploy can run
// 15-20 min, so keep this generous; override via NATHAN_TIMEOUT_MS.
const TIMEOUT_MS = Number(process.env.NATHAN_TIMEOUT_MS ?? 1_500_000); // 25 min
const TUNNEL_START_MS = 45000;
const STAGING_DOMAIN = 'stage-app.n8n.cloud'; // instances live at https://<name>.<domain>

// Nathan sends these as an immediate ack before the async work; seeing one means
// "keep waiting", not "done". Everything else is a terminal reply.
const isAck = (text = '') =>
	text.startsWith('🚀 Deploying') || text.startsWith('🐳 Building a `docker run` command');

// Pull human-readable text out of a Slack message payload (text + any block text).
function extractText(payload) {
	if (typeof payload === 'string') return payload;
	const parts = [];
	if (payload?.text) parts.push(payload.text);
	for (const b of payload?.blocks ?? []) {
		if (b?.text?.text) parts.push(b.text.text);
		for (const el of b?.elements ?? []) if (el?.text) parts.push(el.text);
	}
	for (const a of payload?.attachments ?? []) if (a?.text) parts.push(a.text);
	return parts.join('\n') || JSON.stringify(payload);
}

// For `deploy <target> <name>` with an explicit instance name, predict the
// staging URL Nathan deploys to (mirrors its name sanitisation) so we can poll
// the instance directly — a reliable backstop when the tunnel callback is lost.
// Returns null when no explicit name is given (Nathan derives it from the branch
// otherwise, which isn't safely predictable here).
function predictDeployUrl(text) {
	const t = text.trim().split(/\s+/);
	if (t[0] !== 'deploy' || !t[2] || t[2].startsWith('-')) return null;
	let name = t[2].replace(/[^a-zA-Z0-9_.-]/g, '-');
	if (!name.startsWith('test-')) name = `test-${name}`;
	if (name.length > 25) name = name.slice(0, 25);
	return `https://${name}.${STAGING_DOMAIN}`;
}

if (process.argv.includes('--selftest')) {
	const ok = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };
	ok(isAck('🚀 Deploying *foo*'), 'deploy ack');
	ok(isAck('🐳 Building a `docker run` command for image *x*'), 'docker ack');
	ok(!isAck('✅ Deployment complete'), 'success not ack');
	ok(!isAck('Error: unknown option'), 'error not ack');
	ok(extractText({ text: 'hi' }) === 'hi', 'text');
	ok(extractText({ blocks: [{ text: { text: 'blk' } }] }) === 'blk', 'block text');
	ok(predictDeployUrl('deploy master test-foo') === `https://test-foo.${STAGING_DOMAIN}`, 'predict explicit name');
	ok(predictDeployUrl('deploy br my/name') === `https://test-my-name.${STAGING_DOMAIN}`, 'predict sanitise + prefix');
	ok(predictDeployUrl('deploy master') === null, 'predict no name');
	ok(predictDeployUrl('deploy master --license pro2') === null, 'predict flag not name');
	ok(predictDeployUrl('help') === null, 'predict non-deploy');
	console.log('selftest OK');
	process.exit(0);
}

// --- token: prefer the NATHAN_TOKEN env var; fall back to .env.local / .env --
let token = process.env.NATHAN_TOKEN;
if (!token) {
	const root = path.resolve(import.meta.dirname, '..');
	for (const dir of [process.cwd(), root])
		for (const f of ['.env.local', '.env']) {
			try { process.loadEnvFile(path.join(dir, f)); } catch { /* missing file is fine */ }
		}
	token = process.env.NATHAN_TOKEN;
}
if (!token) {
	console.error('NATHAN_TOKEN is not set. Export it in your shell, or add it to .env.local (gitignored) at the repo root:\n  export NATHAN_TOKEN=<token from the Nathan Slack bot>\n  # or in .env.local:  NATHAN_TOKEN=<token>');
	process.exit(1);
}

const text = process.argv.slice(2).join(' ').trim() || 'help';
if (text.startsWith('local')) {
	console.error('⚠️  `local` delivers its run-n8n.sh + .env (with the license cert) as Slack file');
	console.error('    attachments, not to this callback — set NATHAN_SLACK_CHANNEL=<slack channel id>');
	console.error('    to receive them in Slack, or run `/nathan local` in Slack directly.\n');
}

// --- local sink for Nathan's callbacks ---------------------------------------
let done, doneReason, settled = false;
const finished = new Promise((r) => (done = r));
const finish = (reason) => { if (settled) return; settled = true; doneReason = reason; done(); };
let idleTimer;
const server = http.createServer((req, res) => {
	let raw = '';
	req.on('data', (c) => (raw += c));
	req.on('end', () => {
		res.writeHead(200).end('ok');
		let payload;
		try { payload = JSON.parse(raw); } catch { payload = raw; }
		const body = extractText(payload);
		console.log('\n' + '─'.repeat(60) + '\n' + body + '\n');
		clearTimeout(idleTimer); // any new message cancels a pending exit
		if (isAck(body)) return; // work is starting; wait (overall timeout backstops)
		idleTimer = setTimeout(() => finish('idle'), IDLE_MS);
	});
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// --- public tunnel: cloudflared (preferred) or npx localtunnel ---------------
function hasBinary(bin) {
	try { return spawnSync(bin, ['--version'], { stdio: 'ignore' }).status === 0; }
	catch { return false; }
}
function startTunnel() {
	const hasCloudflared = hasBinary('cloudflared');
	if (!hasCloudflared)
		console.error('⚠️  cloudflared not found — falling back to `npx localtunnel`, which often drops on\n    long deploys (you may miss the final reply). For reliable capture: brew install cloudflared\n');
	const [cmd, args] = hasCloudflared
		? ['cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`]]
		: ['npx', ['-y', 'localtunnel', '--port', String(port)]];
	const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
	const urlRe = /https:\/\/[^\s]+\.(?:trycloudflare\.com|loca\.lt)/;
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(new Error('tunnel did not start in time')), TUNNEL_START_MS);
		const scan = (buf) => {
			const m = String(buf).match(urlRe);
			if (m) { clearTimeout(t); resolve({ url: m[0], proc }); }
		};
		proc.stdout.on('data', scan);
		proc.stderr.on('data', scan);
		proc.on('exit', (code) => reject(new Error(`tunnel process exited (${code}); install cloudflared (brew install cloudflared) for a reliable tunnel`)));
	});
}

let tunnel;
try {
	console.error(`Opening tunnel + sending: /nathan ${text}`);
	tunnel = await startTunnel();
} catch (e) {
	console.error('Could not open a public tunnel:', e.message);
	await cleanup(1);
}

// --- fire the command --------------------------------------------------------
const user = process.env.NATHAN_USER || os.userInfo().username;
const res = await fetch(WEBHOOK, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({
		token,
		text,
		command: '/nathan',
		response_url: tunnel.url,
		user_id: user,
		user_name: user,
		channel_id: process.env.NATHAN_SLACK_CHANNEL || 'cli',
		trigger_id: String(Date.now()),
	}),
});
if (!res.ok) {
	console.error(`Webhook returned HTTP ${res.status}`);
	await cleanup(1);
}
console.error('Sent. Waiting for Nathan to reply (Ctrl-C to stop)…\n');

// Reliable backstop: if the instance URL is predictable, poll it directly so a
// dropped tunnel doesn't cost us the result. Skip if it already responds — that's
// the previous deployment still up mid-redeploy, indistinguishable from the new one.
const pollUrl = predictDeployUrl(text);
if (pollUrl) {
	const up = (u) => fetch(`${u}/healthz`, { signal: AbortSignal.timeout(8000) }).then((r) => r.ok).catch(() => false);
	if (await up(pollUrl)) {
		console.error(`(${pollUrl} already responds — redeploy in progress; relying on the tunnel for completion.)`);
	} else {
		(async () => {
			while (!settled) {
				if (await up(pollUrl)) {
					if (!settled) console.log(`\n${'─'.repeat(60)}\n✅ Instance is up: ${pollUrl}\n   Login: test@n8n.io / helloWorld7 (default test owner)\n`);
					return finish('up');
				}
				await new Promise((r) => setTimeout(r, 10000));
			}
		})();
	}
}

const overall = setTimeout(() => finish('timeout'), TIMEOUT_MS);
process.on('SIGINT', () => finish('interrupted'));
await finished;
clearTimeout(overall);

if (doneReason === 'timeout') console.error('\n⏱  Timed out waiting for the final reply — the deploy may still be running (check Slack / Grafana).');
if (doneReason === 'interrupted') console.error('\nStopped. The command may still be running on Nathan.');
await cleanup(doneReason === 'idle' || doneReason === 'up' ? 0 : 1);

function cleanup(code) {
	try { tunnel?.proc.kill(); } catch {}
	server.close();
	// give the tunnel a beat to die, then exit hard (server/proc keep the loop alive)
	setTimeout(() => process.exit(code), 200);
	return new Promise(() => {});
}
