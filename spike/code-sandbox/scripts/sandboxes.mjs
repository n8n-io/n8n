#!/usr/bin/env node
/**
 * Counts code sandboxes in the sandbox service, and memory of the runner
 * containers. Use it during load tests (every 5 s) and as the leak check
 * (SPIKE-SPEC-opus.md, sections 10.3 and 10.4).
 *
 *   node sandboxes.mjs poll [--interval 5] [--out sandboxes.jsonl]
 *   node sandboxes.mjs leak-check [--wait 40]
 *
 * SANDBOX_URL (default http://127.0.0.1:8080) and SANDBOX_ADMIN_KEY (default
 * "test") select the API. RUNNER_CONTAINERS (comma list) names the runner
 * containers for `docker exec ... docker stats`.
 *
 * RUNNER_BACKEND=firecracker reads the host memory of each Firecracker process
 * instead (RSS and PSS from /proc/<pid>/smaps_rollup, with `sudo -n`), and the
 * host MemAvailable. PSS splits the pages of the shared golden snapshot file
 * between the microVMs that map it.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		interval: { type: 'string', default: '5' },
		wait: { type: 'string', default: '40' },
		out: { type: 'string' },
	},
});
const base = process.env.SANDBOX_URL ?? 'http://127.0.0.1:8080';
const key = process.env.SANDBOX_ADMIN_KEY ?? 'test';
const runners = (
	process.env.RUNNER_CONTAINERS ??
	'n8n-sandbox-service-runner-dind-local-1,n8n-sandbox-service-runner-dind-local-2'
).split(',');

async function codeSandboxes() {
	const res = await fetch(`${base}/sandboxes`, { headers: { 'X-Api-Key': key } });
	const list = await res.json();
	return list.filter((s) => s.kind === 'code');
}

const FC_MEM_SCRIPT = `
for p in $(pgrep -x firecracker); do
  id=$(tr '\\0' ' ' </proc/$p/cmdline | sed -n 's/.*--id \\([^ ]*\\).*/\\1/p')
  awk -v id="$id" '/^Rss:/ {r=$2} /^Pss:/ {s=$2} END {print id, r, s}' /proc/$p/smaps_rollup 2>/dev/null
done
awk '/^MemAvailable:/ {print "MemAvailable", $2}' /proc/meminfo
`;

/** Host memory of the Firecracker microVMs (KiB from /proc, reported in MiB). */
function firecrackerMemory() {
	const out = { vms: 0, totalMiB: 0, pssTotalMiB: 0, perVm: [], hostAvailableMiB: null };
	try {
		const text = execFileSync('sudo', ['-n', 'sh', '-c', FC_MEM_SCRIPT], {
			encoding: 'utf-8',
			timeout: 20_000,
		});
		for (const line of text.trim().split('\n').filter(Boolean)) {
			const [id, a, b] = line.split(' ');
			if (id === 'MemAvailable') {
				out.hostAvailableMiB = Math.round(Number(a) / 1024);
				continue;
			}
			const rss = Number(a) / 1024;
			const pss = Number(b) / 1024;
			if (Number.isNaN(rss)) continue;
			out.vms++;
			out.totalMiB += rss;
			out.pssTotalMiB += pss;
			out.perVm.push({ vmId: id, rssMiB: Math.round(rss), pssMiB: Math.round(pss) });
		}
	} catch {
		// sudo or /proc not readable.
	}
	out.totalMiB = Math.round(out.totalMiB);
	out.pssTotalMiB = Math.round(out.pssTotalMiB);
	return out;
}

/** Memory of the code sandbox containers, from the cgroup data of each runner. */
function memory() {
	if (process.env.RUNNER_BACKEND === 'firecracker') return firecrackerMemory();
	const out = { containers: 0, totalMiB: 0, perContainerMiB: [] };
	for (const runner of runners) {
		try {
			const text = execFileSync(
				'docker',
				['exec', runner, 'docker', 'stats', '--no-stream', '--format', '{{.MemUsage}}'],
				{ encoding: 'utf-8', timeout: 20_000 },
			);
			for (const line of text.trim().split('\n').filter(Boolean)) {
				const used = line.split('/')[0].trim();
				const mib = used.endsWith('GiB')
					? parseFloat(used) * 1024
					: used.endsWith('MiB')
						? parseFloat(used)
						: parseFloat(used) / 1024;
				if (Number.isNaN(mib)) continue;
				out.containers++;
				out.totalMiB += mib;
				out.perContainerMiB.push(Math.round(mib));
			}
		} catch {
			// Runner not reachable.
		}
	}
	out.totalMiB = Math.round(out.totalMiB);
	return out;
}

const mode = positionals[0] ?? 'poll';
if (mode === 'leak-check') {
	const wait = Number(args.wait);
	console.log(`waiting ${wait} s (idle timeout plus 10 s) ...`);
	await new Promise((r) => setTimeout(r, wait * 1000));
	const left = await codeSandboxes();
	console.log(JSON.stringify({ type: 'leak_check', ts: Date.now(), leaked: left.length, ids: left.map((s) => s.id) }));
	process.exit(left.length ? 1 : 0);
}

for (;;) {
	const sandboxes = await codeSandboxes().catch(() => []);
	const record = { type: 'sandbox_poll', ts: Date.now(), codeSandboxes: sandboxes.length, memory: memory() };
	console.log(JSON.stringify(record));
	if (args.out) appendFileSync(args.out, JSON.stringify(record) + '\n');
	await new Promise((r) => setTimeout(r, Number(args.interval) * 1000));
}
