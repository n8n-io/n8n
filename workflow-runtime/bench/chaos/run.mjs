// End-to-end chaos test: wfrt serve with the fallback host (see
// bench/chaos-test.sh). Usage: node bench/chaos/run.mjs <base-port>
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const wfrt = process.env.WFRT ?? join(root, 'zig-out', 'bin', 'wfrt');
const hostMain = process.env.HOST_MAIN ?? join(root, '..', 'packages', '@n8n', 'workflow-fallback-host', 'dist', 'main.js');
const cli = join(root, '..', 'packages', '@n8n', 'workflow-lang', 'src', 'cli.ts');
const port = Number(process.argv[2] ?? 28520);
// macOS limits Unix socket paths to 104 bytes.
const work = mkdtempSync(join(tmpdir(), 'wfrt-chaos-'));
const sock = `/tmp/wfrt-chaos-${process.pid}.sock`;

const T = "const t = require('timers');";
const steps = {
	ok: 'return items.map((i) => ({ ...i, ok: true }));',
	slow: 'const end = Date.now() + 400; while (Date.now() < end) {} return items;',
	loop: 'for (;;) {}',
	oom: 'const keep = []; for (;;) keep.push(new Array(1e6).fill(Math.random()));',
	exit: "require('process').exit(3);",
	late: `${T} t.setTimeout(() => { throw new Error('late throw'); }, 10); t.setTimeout(() => Promise.reject(new Error('late reject')), 20); return items;`,
	socket: "const net = require('net'); const s = net.createServer().listen(0); net.connect(s.address().port); return items;",
	// A result of 3 MiB: larger than the old 1 MiB read buffer of wfrt.
	big: "return [{ big: 'x'.repeat(3 * 1024 * 1024) }];",
	// A step name too long for a host frame: the step fails, the shard goes on.
	long: 'return items;',
};
const stepName = { long: 'N'.repeat(5000) };
const returns = { big: '{ ok: true, n: JSON.stringify(out).length }' };

const children = new Set();
function start(name, cmd, args, env = {}) {
	const out = join(work, `${name}.log`);
	const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
	const chunks = [];
	child.stdout.on('data', (d) => chunks.push(d));
	child.stderr.on('data', (d) => chunks.push(d));
	child.on('exit', () => writeFileSync(out, Buffer.concat(chunks)));
	child.log = () => Buffer.concat(chunks).toString('utf8');
	children.add(child);
	child.on('exit', () => children.delete(child));
	return child;
}
async function stop(child) {
	if (child.exitCode !== null || child.signalCode !== null) return;
	const done = new Promise((r) => child.once('exit', r));
	child.kill('SIGTERM');
	await done;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(check, what, ms = 20_000) {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		if (await check()) return;
		await sleep(100);
	}
	throw new Error(`timed out waiting for ${what}`);
}

async function call(route, id) {
	const started = Date.now();
	try {
		const res = await fetch(`http://127.0.0.1:${port}/${route}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id }),
			signal: AbortSignal.timeout(30_000),
		});
		return { route, id, status: res.status, body: await res.text(), ms: Date.now() - started };
	} catch (error) {
		return { route, id, status: 0, body: String(error), ms: Date.now() - started };
	}
}

let failed = false;
function check(ok, message) {
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
	if (!ok) failed = true;
}
const healthyOk = (r) => r.status === 200 && r.body.includes('"ok":true');

function hostServerPid(host) {
	// The supervisor's child that runs the server: the direct child of the host.
	const out = execFileSync('pgrep', ['-P', String(host.pid)], { encoding: 'utf8' }).trim();
	return Number(out.split('\n')[0]);
}

async function main() {
	// Workflows: one webhook each, one Code step.
	const routes = [];
	for (const [name, code] of Object.entries(steps)) {
		const src = join(work, `${name}.ts`);
		writeFileSync(
			src,
			`import { webhook, workflow } from '@n8n/workflow-lang';\n\nexport default workflow({\n\ttriggers: [webhook({ path: '${name}', method: 'POST' })],\n\tasync run(ctx, trigger) {\n\t\tconst out = await ctx.code({ name: ${JSON.stringify(stepName[name] ?? 'Step')}, code: ${JSON.stringify(code)}, items: [{ id: trigger.body.id }] });\n\t\treturn ${returns[name] ?? '{ out }'};\n\t},\n});\n`,
		);
		execFileSync(process.execPath, [cli, 'compile', src, '-o', join(work, name)], { stdio: 'ignore' });
		routes.push('--module', join(work, name, `${name}.wfm`), '--route', `POST /${name}`);
	}
	const hostEnv = {
		WF_FALLBACK_CODE_ALLOW_MODULES: '*',
		WF_FALLBACK_CODE_TIMEOUT_MS: '60000',
		WF_FALLBACK_BLOCKED_MS: '2000',
		WF_FALLBACK_WORKER_MEMORY_MB: '384',
	};
	let host = start('host', process.execPath, [hostMain, '--socket', sock, '--workers', '2'], hostEnv);
	await waitFor(() => existsSync(sock), 'the host socket');
	await sleep(1500); // the workers load n8n
	mkdirSync(join(work, 'log'));
	const serve = start('wfrt', wfrt, ['serve', '--port', String(port), '--log-dir', join(work, 'log'), '--fallback', sock, ...routes]);
	await waitFor(async () => (await call('ok', 0)).status === 200, 'wfrt and a first healthy run', 60_000);

	// Phase 1: each fault together with healthy executions.
	const expectFail = new Set(['loop', 'oom', 'exit']);
	const blameReason = { loop: 'it did not answer', oom: 'it ran out of memory' };
	const shardLog = () =>
		readdirSync(join(work, 'log'))
			.map((f) => readFileSync(join(work, 'log', f), 'latin1'))
			.join('\n');
	const blamedBefore = () => (shardLog().match(/stopped its host worker/g) ?? []).length;
	let id = 1;
	for (const fault of ['loop', 'oom', 'exit', 'late', 'socket']) {
		const healthy = Array.from({ length: 20 }, () => call('ok', id++));
		const bad = call(fault, id++);
		const results = await Promise.all([...healthy, bad]);
		const okCount = results.slice(0, 20).filter(healthyOk).length;
		check(okCount === 20, `${fault}: ${okCount}/20 healthy executions finished`);
		const b = results[20];
		check(
			expectFail.has(fault) ? b.status === 500 && b.body.includes('needs_attention') : b.status === 200,
			`${fault}: the faulty execution ended with ${b.status} in ${b.ms} ms`,
		);
		// A step that stops its worker is to blame, with the host's reason
		// (`worker_lost`). The error is in the shard log, not in the response.
		const reason = blameReason[fault];
		if (reason) {
			check(
				shardLog().includes(`The step stopped its host worker: ${reason}`),
				`${fault}: the step is blamed with the reason of worker_lost (${reason})`,
			);
		}
	}

	// Large results and frames that wfrt cannot build.
	const big = await call('big', id++);
	const n = Number(/"n":(\d+)/.exec(big.body)?.[1] ?? 0);
	check(big.status === 200 && n > 3 * 1024 * 1024, `a 3 MiB host result arrives (${big.status}, ${n} bytes, ${big.ms} ms)`);
	const long = await call('long', id++);
	check(long.status === 500, `a step name too long for a frame fails its execution (${long.status})`);
	const afterLong = await Promise.all(Array.from({ length: 20 }, () => call('ok', id++)));
	check(afterLong.every(healthyOk), 'after it: 20/20 healthy executions finished');

	// Phase 2: the host server process dies while steps run.
	const blamed = blamedBefore();
	const slow = Array.from({ length: 10 }, () => call('slow', id++));
	await sleep(150);
	const serverPid = hostServerPid(host);
	process.kill(serverPid, 'SIGKILL');
	const slowResults = await Promise.all(slow);
	const ended = slowResults.filter((r) => r.status === 200 || (r.status === 500 && r.body.includes('needs_attention')));
	check(
		ended.length === 10,
		`server process killed: ${ended.length}/10 running executions ended, ${slowResults.filter((r) => r.status === 500).length} with needs_attention (retryable)`,
	);
	check(blamedBefore() === blamed, 'server process killed: no step is blamed (no worker_lost)');
	await waitFor(async () => healthyOk(await call('ok', id++)), 'healthy runs after the server restart', 30_000);
	const after = await Promise.all(Array.from({ length: 20 }, () => call('ok', id++)));
	check(after.every(healthyOk), 'after the server restart: 20/20 healthy executions finished');

	// Phase 3: the whole host stops, then comes back.
	await stop(host);
	const down = await call('ok', id++);
	check(down.status === 500 && down.ms < 5_000, `host down: an execution ends at once (${down.status} in ${down.ms} ms)`);
	host = start('host2', process.execPath, [hostMain, '--socket', sock, '--workers', '2'], hostEnv);
	await waitFor(async () => healthyOk(await call('ok', id++)), 'healthy runs after the host restart', 60_000);
	const back = await Promise.all(Array.from({ length: 20 }, () => call('ok', id++)));
	check(back.every(healthyOk), 'host back: 20/20 healthy executions finished');

	// Phase 4 (soak): many executions while the host recycles its workers.
	// A recycled worker sends `goaway` on its connections (protocol version
	// 2), and wfrt moves to a new connection; no execution may fail.
	await stop(host);
	host = start('host3', process.execPath, [hostMain, '--socket', sock, '--workers', '2'], {
		...hostEnv,
		WF_FALLBACK_RECYCLE_STEPS: '300',
	});
	await waitFor(async () => healthyOk(await call('ok', id++)), 'healthy runs after the soak host start', 60_000);
	let soakFailed = 0;
	for (let round = 0; round < 100; round++) {
		const batch = await Promise.all(Array.from({ length: 30 }, () => call('ok', id++)));
		soakFailed += batch.filter((r) => !healthyOk(r)).length;
	}
	const recycled = (host.log().match(/Recycling a worker/g) ?? []).length;
	const stopped = (host.log().match(/A worker stopped/g) ?? []).length;
	check(soakFailed === 0, `soak: ${3000 - soakFailed}/3000 executions finished while the host recycled ${recycled} worker(s)`);
	check(recycled >= 3 && stopped === 0, `soak: workers were recycled (${recycled}) and none stopped (${stopped})`);

	await stop(serve);
	await stop(host);
	if (!/connected to the fallback host/.test(serve.log())) check(false, 'wfrt logged its reconnect');
	if (process.env.EXPECT_V2 && !/speaks version 2/.test(serve.log())) check(false, 'wfrt used protocol version 2');
}

try {
	await main();
} catch (error) {
	console.error(error);
	failed = true;
} finally {
	for (const c of children) c.kill('SIGKILL');
	if (failed) {
		for (const f of ['wfrt.log', 'host.log', 'host2.log', 'host3.log']) {
			const p = join(work, f);
			if (existsSync(p)) console.error(`--- ${f}\n${readFileSync(p, 'utf8').slice(-3000)}`);
		}
	}
	rmSync(work, { recursive: true, force: true });
	rmSync(sock, { force: true });
}
console.log(failed ? 'chaos test FAILED' : 'chaos test passed');
process.exit(failed ? 1 : 0);
