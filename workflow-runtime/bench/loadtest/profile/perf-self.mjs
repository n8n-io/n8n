// Self-time areas of wfrt from `perf report --no-children --sort dso,sym -g none --stdio`
// (stdin). Each symbol's self share goes to the first area whose pattern
// matches; kernel symbols go to "kernel". Use perf-cat.mjs for the kernel
// split by system call.
//   sudo perf report -f -i wfrt.perf.data --no-children --sort dso,sym -g none --stdio | node perf-self.mjs
import readline from 'node:readline';

const AREAS = [
	['kernel', (d) => /kernel|nf_|vdso/.test(d)],
	['TLS (OpenSSL)', (d) => /libssl|libcrypto/.test(d)],
	['DNS (c-ares)', (d) => /libcares/.test(d)],
	['JSON encode and decode', (d, s) => /^json\.|Json|json[A-Z]|Scanner|stringify/.test(s)],
	['regions, heap and GC copy', (d, s) => /^(heap|arena)\.|Heap|Arena|\.gc|copyValue|Region/.test(s)],
	['library natives (date, regex, xml, text, lib)', (d, s) => /^(lib|date|regex|tz|numfmt|exactnum|xml|xmlrss|xmlent|unicase|textcodec|multipart|cron|base64|crypto)\./.test(s)],
	['log, events, snapshots, admin', (d, s) => /MemLog|\.log\.|Log\b|journal|Event|SnapStore|snap|handleAdmin|admin|debug\.print|logfmt/.test(s)],
	['fallback-host IPC', (d, s) => /fallback|Fallback|host\.|ipc|Ipc/.test(s)],
	['HTTP server and client (incl. egress, HTTP/2, request build)', (d, s) => /http|Http|egress|request\.|hpack|h2\.|server\.|conn|Conn|socket/.test(s)],
	['interpreter dispatch and ops', (d, s) => /^(interp|ops|asm|module)\.|core\.step|runFibre|Fibre|core\.run/.test(s)],
	['zig std (sort, hash maps, lists, formatting)', (d, s) => /^(sort|array_list|hash_map|fmt|mem|BitStack|Thread|heap|unicode|math)\b|std\./.test(s)],
	['libc (memcpy, malloc, syscall wrappers)', (d) => /libc|ld-linux/.test(d)],
	['wfrt other', (d) => /wfrt/.test(d)],
	['other', () => true],
];
const shares = new Map();
const top = new Map();
const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
	const m = /^\s+([\d.]+)%\s+(\S+)\s+\[[.k]\]\s+(.*)$/.exec(line);
	if (!m) continue;
	const [, p, dso, sym] = m;
	const a = AREAS.find(([, t]) => t(dso, sym.trim()))[0];
	shares.set(a, (shares.get(a) ?? 0) + Number(p));
	if (a === 'wfrt other') top.set(sym.trim(), Number(p));
}
console.log('| Area (self time of the wfrt process) | Share |\n|---|---|');
for (const [a, p] of [...shares].sort((x, y) => y[1] - x[1])) console.log(`| ${a} | ${p.toFixed(1)}% |`);
console.log('\nLargest symbols in "wfrt other":', [...top].sort((x, y) => y[1] - x[1]).slice(0, 12).map(([s, p]) => `${s} ${p}%`).join('; '));
