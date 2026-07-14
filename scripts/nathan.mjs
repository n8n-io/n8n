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
// Needs a token in ~/.n8n/dev/nathan-token — on first run it links you to a form to
// get one and saves it there. A public tunnel is opened via `npx localtunnel`.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const WEBHOOK = 'https://internal.users.n8n.cloud/webhook/85070485-140c-46e8-9b4b-d161bf7ee1ac';
// Read a positive-number override from the env, warning and falling back to the
// default on anything invalid (a NaN would make setTimeout fire immediately).
function posNum(value, fallback, name) {
	if (value == null) return fallback;
	const n = Number(value);
	if (Number.isFinite(n) && n > 0) return n;
	console.error(`⚠️  Ignoring invalid ${name}=${value}; using ${fallback}.`);
	return fallback;
}
const IDLE_MS = posNum(process.env.NATHAN_IDLE_MS, 8000, 'NATHAN_IDLE_MS'); // grace after a result for trailing msgs
// Overall backstop. A cold branch build (docker-build-push CI) + deploy can run
// 15-20 min, so keep this generous; override via NATHAN_TIMEOUT_MS.
const TIMEOUT_MS = posNum(process.env.NATHAN_TIMEOUT_MS, 1_500_000, 'NATHAN_TIMEOUT_MS'); // 25 min
const TUNNEL_START_MS = 45000;
const STAGING_DOMAIN = 'stage-app.n8n.cloud'; // instances live at https://<name>.<domain>
const DEFAULT_SLACK_CHANNEL = 'C0BGVHZ0SCW'; // #updates-pnpm-nathan
const DEFAULT_SLACK_CHANNEL_URL = 'https://n8nio.slack.com/archives/C0BGVHZ0SCW';

// Nathan sends these as an immediate ack before the async work; seeing one means
// "keep waiting", not "done". Everything else is a terminal reply.
const isAck = (text = '') =>
	text.startsWith('🚀 Deploying') || text.startsWith('🐳 Building a `docker run` command');

// Nathan's known error replies — a terminal reply matching these means the
// command failed and we must exit non-zero (callers/agents rely on that).
const isError = (text = '') => /^(?:Error:|Unknown command|Deploy failed)/.test(text);

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
	ok(isError('Error: unknown option'), 'error reply');
	ok(isError('Deploy failed: boom'), 'deploy failed');
	ok(isError('Unknown command `x`'), 'unknown command');
	ok(!isError('✅ Instance is up'), 'success not error');
	ok(!isError('*Nathan — deployment bot*'), 'help not error');
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

// --- token: read from ~/.n8n/dev/nathan-token; prompt + save it on first run -
const TOKEN_FORM_URL = 'https://internal.users.n8n.cloud/form/d6d34a2f-4899-4ee8-afc8-f8c41a8a243d';
const tokenFile = path.join(os.homedir(), '.n8n', 'dev', 'nathan-token');
const readSavedToken = () => { try { return fs.readFileSync(tokenFile, 'utf8').trim() || null; } catch { return null; } };
function saveToken(t) {
	fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
	fs.writeFileSync(tokenFile, `${t}\n`, { mode: 0o600 });
	fs.chmodSync(tokenFile, 0o600); // writeFileSync's mode is ignored when overwriting an existing file
}

// Non-interactive setup (agents/scripts): `nathan set-token <token>`.
if (process.argv[2] === 'set-token') {
	const t = (process.argv[3] || '').trim();
	if (!t) { console.error('Usage: pnpm nathan set-token <token>'); process.exit(1); }
	saveToken(t);
	console.error(`Saved token to ${tokenFile}.`);
	process.exit(0);
}

let token = readSavedToken();
if (!token) {
	console.error(`\nNo Nathan token found. Get one here:\n  ${TOKEN_FORM_URL}\n  → log in with your n8n account and copy the token from the response.\n`);
	if (process.stdin.isTTY) {
		const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
		token = (await rl.question('Paste your Nathan token here: ')).trim();
		rl.close();
		if (token) { saveToken(token); console.error(`\nSaved to ${tokenFile} — future runs will reuse it.\n`); }
	} else {
		console.error('Then save it with:  pnpm nathan set-token <token>');
	}
}
if (!token) process.exit(1);

const text = process.argv.slice(2).join(' ').trim() || 'help';
const isLocal = text.startsWith('local');
const slackTarget = process.env.NATHAN_SLACK_CHANNEL
	? `Slack channel ${process.env.NATHAN_SLACK_CHANNEL}`
	: `#updates-pnpm-nathan (${DEFAULT_SLACK_CHANNEL_URL})`;
if (isLocal) {
	console.error('⚠️  `local` delivers its run-n8n.sh + .env (with the license cert) as Slack file');
	console.error(`    attachments, not to this terminal — they post to ${slackTarget}.\n`);
}

// --- local sink for Nathan's callbacks ---------------------------------------
// The tunnel is public, so only accept callbacks on an unguessable path and cap
// the body — the URL is an unauthenticated completion channel otherwise.
const CALLBACK_PATH = `/cb/${randomUUID()}`;
const MAX_BODY = 1_000_000; // Nathan's replies are small Slack messages
let done, doneReason, settled = false;
const finished = new Promise((r) => (done = r));
const finish = (reason) => { if (settled) return; settled = true; doneReason = reason; done(); };
let idleTimer;
const server = http.createServer((req, res) => {
	// A GET is our own reachability probe (or noise) — ack it, don't process it.
	if (req.method !== 'POST') { res.writeHead(200).end('ok'); return; }
	// Reject anything not on the secret path before reading its body.
	if (req.url !== CALLBACK_PATH) { res.writeHead(403).end('forbidden'); return; }
	let raw = '', tooBig = false;
	req.on('data', (c) => {
		if (tooBig) return;
		raw += c;
		if (raw.length > MAX_BODY) { tooBig = true; res.writeHead(413).end('payload too large'); req.destroy(); }
	});
	req.on('end', () => {
		if (tooBig) return;
		res.writeHead(200).end('ok');
		let payload;
		try { payload = JSON.parse(raw); } catch { payload = raw; }
		const body = extractText(payload);
		console.log('\n' + '─'.repeat(60) + '\n' + body + '\n');
		clearTimeout(idleTimer); // any new message cancels a pending exit
		if (isAck(body)) {
			// `local` posts its bundle to Slack, never to this callback — the ack is
			// the last thing we'll see, so stop here instead of waiting for the timeout.
			if (isLocal) { console.error(`Bundle is being posted to ${slackTarget}.`); finish('local'); }
			return; // otherwise work is starting; wait (overall timeout backstops)
		}
		// A known error reply must fail the run; anything else is a success.
		idleTimer = setTimeout(() => finish(isError(body) ? 'error' : 'idle'), IDLE_MS);
	});
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// --- public tunnel via npx localtunnel ---------------------------------------
// Pin an exact, vetted version — an unpinned `npx localtunnel` would run whatever
// the registry currently serves, as the user, with read access to the token file.
// To update: bump this version deliberately after reviewing the release.
const LOCALTUNNEL_VERSION = '2.0.2';
function startTunnel() {
	const proc = spawn('npx', ['-y', `localtunnel@${LOCALTUNNEL_VERSION}`, '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
	const urlRe = /https:\/\/[^\s]+\.loca\.lt/;
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(new Error('tunnel did not start in time')), TUNNEL_START_MS);
		const scan = (buf) => {
			const m = String(buf).match(urlRe);
			if (m) { clearTimeout(t); resolve({ url: m[0], proc }); }
		};
		proc.stdout.on('data', scan);
		proc.stderr.on('data', scan);
		proc.on('exit', (code) => reject(new Error(`localtunnel process exited (${code})`)));
	});
}

// The tunnel host can take a moment to resolve/route after the URL is printed,
// so firing immediately can make Nathan's callback fail with ENOTFOUND. Self-probe
// the tunnel (GET, ignored by the server above) until it routes back to us.
async function waitReachable(url) {
	const deadline = Date.now() + TUNNEL_START_MS;
	while (Date.now() < deadline) {
		try { if ((await fetch(url, { signal: AbortSignal.timeout(5000) })).ok) return true; }
		catch { /* DNS/edge not ready yet */ }
		await new Promise((r) => setTimeout(r, 1500));
	}
	return false;
}

let tunnel;
try {
	console.error(`Opening tunnel + sending: /nathan ${text}`);
	tunnel = await startTunnel();
} catch (e) {
	console.error('Could not open a public tunnel:', e.message);
	await cleanup(1);
}
if (!(await waitReachable(tunnel.url))) {
	console.error(`Tunnel ${tunnel.url} did not become reachable in time.`);
	await cleanup(1);
}

// --- fire the command --------------------------------------------------------
const user = process.env.NATHAN_USER || os.userInfo().username;
let res;
try {
	res = await fetch(WEBHOOK, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			token,
			text,
			command: '/nathan',
			response_url: tunnel.url + CALLBACK_PATH,
			user_id: user,
			user_name: user,
			channel_id: process.env.NATHAN_SLACK_CHANNEL || DEFAULT_SLACK_CHANNEL,
			trigger_id: String(Date.now()),
		}),
	});
} catch (e) {
	console.error(`Could not reach the Nathan webhook: ${e.message}`);
	await cleanup(1);
}
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
if (doneReason === 'error') console.error('\n✖ Nathan reported an error (see the reply above).');
await cleanup(['idle', 'up', 'local'].includes(doneReason) ? 0 : 1);

function cleanup(code) {
	try { tunnel?.proc.kill(); } catch {}
	server.close();
	// give the tunnel a beat to die, then exit hard (server/proc keep the loop alive)
	setTimeout(() => process.exit(code), 200);
	return new Promise(() => {});
}
