// Groups the `key=value` lines of `floor` runs and prints the median, min
// and max of the chosen values for each group.
//   node bench/floor/summarize.mjs results.txt
import { readFileSync } from 'node:fs';

// Which fields name a group, and which values to report, per line kind.
const kinds = {
	net: { group: ['mode', 'pipeline', 'conns', 'req', 'resp', 'idle'], values: ['server_ns', 'client_ns', 'server_read_ns', 'server_write_ns', 'server_wait_ns', 'client_read_ns', 'client_write_ns', 'hs_client_us', 'hs_server_us', 'tls_client_bytes', 'tls_server_bytes'] },
	'net-inline': { group: ['conns', 'req', 'resp'], values: ['server_side_ns', 'client_side_ns', 'server_read_ns', 'server_write_ns', 'client_read_ns', 'client_write_ns'] },
	ipc: { group: ['frame', 'batch'], values: ['wfrt_ns_per_step', 'host_ns_per_step', 'wall_ns_per_round'] },
	core: { group: ['_name'], values: ['ns_per_exec', 'instr_per_exec', 'ns_per_instr', 'decode_ns', 'encode_ns', 'decode_mb_s', 'encode_mb_s', 'wait_used_bytes'] },
	native: { group: [], values: ['set_ns', 'sheets_append_ns'] },
	log: { group: ['tier', 'batch'], values: ['cpu_ns_per_exec', 'wall_us_per_batch'] },
	timers: { group: ['n'], values: ['ns_per_insert_and_pop'] },
	churn: { group: [], values: ['tcp_connect_accept_close_ns'] },
	syscalls: { group: [], values: ['getppid_ns', 'poll_empty_ns', 'unix_rw64_ns_per_call', 'clock_gettime_ns'] },
	freq: { group: [], values: ['ghz'] },
};

const groups = new Map();
for (const line of readFileSync(process.argv[2], 'utf8').split('\n')) {
	const parts = line.trim().split(/\s+/);
	const kind = parts[0];
	const spec = kinds[kind];
	if (!spec) continue;
	const kv = {};
	for (const p of parts.slice(1)) {
		const i = p.indexOf('=');
		if (i > 0) kv[p.slice(0, i)] = p.slice(i + 1);
		else kv._name = kv._name ?? p; // `core w1`, `core json`
	}
	if (kind === 'core' && kv.file) kv._name = `json ${kv.file}`;
	if (kind === 'net' && line.includes('release_buffers=true')) kv.mode += '+release';
	const key = [kind, ...spec.group.map((g) => `${g}=${kv[g] ?? ''}`)].join(' ');
	if (!groups.has(key)) groups.set(key, { spec, rows: [] });
	groups.get(key).rows.push(kv);
}

const stat = (xs) => {
	const s = [...xs].sort((a, b) => a - b);
	return { med: s[Math.floor(s.length / 2)], min: s[0], max: s[s.length - 1], n: s.length };
};
for (const [key, { spec, rows }] of groups) {
	const cells = [];
	for (const v of spec.values) {
		const xs = rows.map((r) => Number(r[v])).filter((x) => Number.isFinite(x));
		if (xs.length === 0) continue;
		const { med, min, max, n } = stat(xs);
		cells.push(n > 1 ? `${v}=${med} [${min}–${max}]` : `${v}=${med}`);
	}
	console.log(`${key} (n=${rows.length}): ${cells.join(' ')}`);
}
