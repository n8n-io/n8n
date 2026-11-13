// The cost model of docs/floor.md:
//   cost(wf) = webhook_share × inbound + exec + Σ nodes
//            + calls × (outbound + TLS) + JSON(bytes) + log + host_steps × host_step
// It prints µs per workflow and workflows/s per core for each class, for the
// floor and for wfrt today, on each machine, with the term that dominates.
// Every input is a measured median from bench/floor (see floor.md); edit
// `machines` after a new run.
//   node bench/floor/model.mjs [--json]

// The real mix (bench/floor/mix/mix-sizes.json, sets/1000 and the census).
const mix = {
	webhookShare: 0.22, // workflows whose trigger is an inbound HTTP request
	nodeRuns: 4.52,
	vendorNodeRuns: 1.69,
	vendorCalls: 2.35,
	bodyInBytes: 1795, // vendor response bodies per workflow (decode)
	bodyOutBytes: 828, // vendor request bodies per workflow (encode)
	hostStepRuns: 0.8, // 17.7% of 4.52 node runs
};
// Glue and Code node runs: everything that is not the trigger or a vendor node.
mix.glueRuns = mix.nodeRuns - 1 - mix.vendorNodeRuns;

// µs of CPU on one core. `floor`: the best measured or derived cost.
// `today`: wfrt as it is now. Both from the same session on each machine.
const machines = {
	'M5 Pro macOS (loaded, 3.1 GHz)': {
		floor: {
			inbound: 10.7, // W2 kernel time in wfrt (sample: 70.6% of 14.5) + 0.5 parser
			outbound: 12.0, // W3 - W2 kernel time in wfrt (sample)
			tls: 0.5, // AES-128-GCM at 3.2 GB/s for about 1.5 KB per call
			jsonDecodeMBs: 1400, // simdjson DOM
			jsonEncodeMBs: 700, // simdjson serialize
			exec: 0.1, // start and finish an execution: a few struct writes
			glue: 0.06, // hand-written Zig Set
			callWork: 0.17, // hand-written Sheets append: 0.69 µs for 4 calls
			httpEffect: 0.17,
			log: 0.16, // batched, 1,072 B per execution, batch 512
			hostStep: 1.5, // batched IPC (0.18 + 0.18) + minimal V8 step (1.1)
		},
		today: {
			inbound: 14.5, // wfrt W2, all of it (inbound, core, reply)
			outbound: 11.8, // wfrt W3 - W2 - the core's effect round trip (3.7)
			tls: 3.5, // https vs http, compiled W3 (poc-report)
			jsonDecodeMBs: 320,
			jsonEncodeMBs: 315,
			exec: 0, // inside `inbound` (W2) for webhooks
			execNoHttp: 1.2, // core cost of a workflow with no node (glue-k1-n0)
			glue: 0.94,
			callWork: 7.0, // core work per vendor call (Slack 6.7, Sheets 8.2 per call)
			httpEffect: 3.7, // core work of one plain ctx.http call (core w3 - w2)
			log: 0.3,
			hostStep: 89 + 14, // v1 Set node in the host + wfrt side of a host step
			hostStepMean: 940 + 14, // mean host CPU per host node run, warm real workflows
		},
	},
	'EPYC 7B12 Linux VM (3.15 GHz quiet; core terms busy)': {
		floor: {
			inbound: 10.0, // inline server side 9.24 (64 conns) + 0.3 epoll share + 0.5 parser
			outbound: 10.6, // inline client side 9.79 + 0.3 epoll share + 0.5 parser
			tls: 0.5, // cipher only
			jsonDecodeMBs: 1300, // simdjson DOM
			jsonEncodeMBs: 500, // simdjson serialize
			exec: 0.1,
			glue: 0.07, // hand-written Zig Set
			callWork: 0.3, // hand-written Sheets append: 1.2 µs for 4 calls
			httpEffect: 0.3,
			log: 0.8, // batched, 1,072 B, batch 64 (page cache copy)
			hostStep: 3.1, // batched IPC (0.43 + 0.43) + minimal V8 step (2.2)
		},
		today: {
			inbound: 19.9, // wfrt W2, pinned
			outbound: 17.7, // W3 - W2 (22.2) - core effect round trip (4.5)
			tls: 8.5, // OpenSSL over plain in the floor benchmark (wfrt over TLS not measured here)
			jsonDecodeMBs: 200,
			jsonEncodeMBs: 200,
			exec: 0,
			execNoHttp: 1.87,
			glue: 1.87,
			callWork: 12.0, // Slack 11.0, Sheets 14.2 per call
			httpEffect: 4.5, // core w3 - w2
			log: 0.8,
			hostStep: 89 + 14, // macOS values: the host was not measured on Linux
			hostStepMean: 940 + 14,
		},
	},
};

// Batching: N requests per write on one connection (HTTP/2 streams, or
// pipelined HTTP/1.1 as measured), with batched submission. Measured on
// macOS at 64 per write (`floor net --pipeline 64`): client 0.6 µs per
// plain call, 1.5 µs per TLS call, server 0.85 µs per request. The Linux
// VM values scale these by the Linux/macOS ratio of the unbatched costs
// (client 1.2×, TLS 1.5×, server 1.6×): estimates, not measurements.
// Kernel bypass: cited, not measured (IX, mTCP, TAS report 10-25x less
// stack CPU than Linux); taken as 0.5 µs per message.
const batch = {
	'M5 Pro macOS (loaded, 3.1 GHz)': { outbound: 0.6, tls: 0.9, inbound: 0.85 },
	'EPYC 7B12 Linux VM (3.15 GHz quiet; core terms busy)': { outbound: 0.7, tls: 1.4, inbound: 1.4 },
};
for (const [name, m] of Object.entries(machines)) {
	const b = batch[name];
	m['batched, inbound per client'] = { ...m.floor, outbound: b.outbound, tls: b.tls };
	m['batched, inbound multiplexed'] = { ...m.floor, outbound: b.outbound, tls: b.tls, inbound: b.inbound };
	m['kernel bypass (cited)'] = { ...m.floor, outbound: 0.5, tls: 0.5, inbound: 0.5 + 0.5 };
}
// Bare-metal Linux without the VM's mitigations and nf_tables: the TAS
// paper (EuroSys 2019) reports 7.5 µs of TCP processing per request for
// Linux on bare metal, against 9.2-9.8 µs per side here: network terms
// times 0.8. An estimate.
{
	const vm = machines['EPYC 7B12 Linux VM (3.15 GHz quiet; core terms busy)'];
	const bm = {};
	for (const [lvl, v] of Object.entries(vm)) {
		if (lvl === 'today' || lvl === 'kernel bypass (cited)') continue;
		bm[lvl] = { ...v, inbound: v.inbound * 0.8, outbound: v.outbound * 0.8 };
	}
	machines['Linux bare metal (estimate)'] = bm;
}

function costs(m, level) {
	const v = m[level];
	const json = (b, mbs) => b / mbs; // bytes / (MB/s) = µs
	const execOnly = level === 'today' ? v.execNoHttp : v.exec;
	const w2 = { inbound: v.inbound, exec: v.exec, log: v.log };
	const w3 = { ...w2, outbound: v.outbound, callWork: v.httpEffect };
	const nativeMix = {
		inbound: mix.webhookShare * v.inbound,
		exec: (1 - mix.webhookShare) * execOnly + v.exec,
		glue: mix.glueRuns * v.glue,
		outbound: mix.vendorCalls * v.outbound,
		tls: mix.vendorCalls * v.tls,
		callWork: mix.vendorCalls * v.callWork,
		json: json(mix.bodyInBytes, v.jsonDecodeMBs) + json(mix.bodyOutBytes, v.jsonEncodeMBs),
		log: v.log,
	};
	const hostMix = { ...nativeMix, hostSteps: mix.hostStepRuns * v.hostStep };
	const out = { W2: w2, W3: w3, 'mix, all native': nativeMix, 'mix, host share': hostMix };
	if (v.hostStepMean) out['mix, host share at mean host step'] = { ...nativeMix, hostSteps: mix.hostStepRuns * v.hostStepMean };
	return out;
}

const rows = [];
for (const [name, m] of Object.entries(machines)) {
	for (const level of Object.keys(m)) {
		for (const [cls, terms] of Object.entries(costs(m, level))) {
			const total = Object.values(terms).reduce((a, b) => a + b, 0);
		if (cls.includes('mean host step') && level !== 'today') continue;
			const [top, topUs] = Object.entries(terms).sort((a, b) => b[1] - a[1])[0];
			rows.push({ machine: name, level, cls, us: total, perSec: 1e6 / total, top, topShare: topUs / total, terms });
		}
	}
}
if (process.argv.includes('--json')) {
	console.log(JSON.stringify({ mix, rows }, null, 1));
} else {
	console.log('| Machine | Level | Class | µs per workflow | Workflows/s per core | Largest term (share) |');
	console.log('|---|---|---|---|---|---|');
	for (const r of rows) {
		console.log(`| ${r.machine} | ${r.level} | ${r.cls} | ${r.us.toFixed(1)} | ${Math.round(r.perSec).toLocaleString('en-US')} | ${r.top} (${Math.round(r.topShare * 100)}%) |`);
	}
}
