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
const TIMEOUT_MS = Number(process.env.NATHAN_TIMEOUT_MS ?? 600000); // overall backstop (deploys are slow)
const TUNNEL_START_MS = 45000;

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

if (process.argv.includes('--selftest')) {
	const ok = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };
	ok(isAck('🚀 Deploying *foo*'), 'deploy ack');
	ok(isAck('🐳 Building a `docker run` command for image *x*'), 'docker ack');
	ok(!isAck('✅ Deployment complete'), 'success not ack');
	ok(!isAck('Error: unknown option'), 'error not ack');
	ok(extractText({ text: 'hi' }) === 'hi', 'text');
	ok(extractText({ blocks: [{ text: { text: 'blk' } }] }) === 'blk', 'block text');
	console.log('selftest OK');
	process.exit(0);
}

// --- token: load from .env.local / .env (repo root or cwd), then env ---------
const root = path.resolve(import.meta.dirname, '..');
for (const dir of [process.cwd(), root])
	for (const f of ['.env.local', '.env']) {
		try { process.loadEnvFile(path.join(dir, f)); } catch { /* missing file is fine */ }
	}
const token = process.env.NATHAN_TOKEN;
if (!token) {
	console.error('NATHAN_TOKEN is not set. Add it to .env.local (gitignored) at the repo root:\n  NATHAN_TOKEN=<token from the Nathan Slack bot>');
	process.exit(1);
}

const text = process.argv.slice(2).join(' ').trim() || 'help';
if (text.startsWith('local')) {
	console.error('⚠️  `local` delivers its run-n8n.sh + .env (with the license cert) as Slack file');
	console.error('    attachments, not to this callback — set NATHAN_SLACK_CHANNEL=<slack channel id>');
	console.error('    to receive them in Slack, or run `/nathan local` in Slack directly.\n');
}

// --- local sink for Nathan's callbacks ---------------------------------------
let done, doneReason;
const finished = new Promise((r) => (done = r));
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
		idleTimer = setTimeout(() => done((doneReason = 'idle')), IDLE_MS);
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

const overall = setTimeout(() => done((doneReason = 'timeout')), TIMEOUT_MS);
process.on('SIGINT', () => done((doneReason = 'interrupted')));
await finished;
clearTimeout(overall);

if (doneReason === 'timeout') console.error('\n⏱  Timed out waiting for the final reply — the deploy may still be running (check Slack / Grafana).');
if (doneReason === 'interrupted') console.error('\nStopped. The command may still be running on Nathan.');
await cleanup(doneReason === 'idle' ? 0 : 1);

function cleanup(code) {
	try { tunnel?.proc.kill(); } catch {}
	server.close();
	// give the tunnel a beat to die, then exit hard (server/proc keep the loop alive)
	setTimeout(() => process.exit(code), 200);
	return new Promise(() => {});
}
