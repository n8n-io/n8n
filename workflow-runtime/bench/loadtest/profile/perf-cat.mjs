// Splits a `perf script` of wfrt (call graphs) into areas of the runtime.
//   perf script -i wfrt.perf.data -F ip,sym,dso | node perf-cat.mjs [--top 40]
//
// "Self" puts each sample in the area of its leaf frame (shared code such as
// memcpy goes to the first caller frame with an area). "Inclusive" counts a
// sample in every area that has a frame anywhere on its stack, so its
// shares do not add up to 100%. Kernel samples are split by system call.
import readline from 'node:readline';

const TOP = Number(process.argv[process.argv.indexOf('--top') + 1] || 40);
const AREAS = [
	['TLS (OpenSSL)', (s, d) => /libssl|libcrypto/.test(d) || /\b(ssl|tls|SSL_|EVP_|aes|sha256|chacha|ecp_|bn_)/i.test(s)],
	['JSON encode and decode', (s) => /json\./i.test(s)],
	['regions, heap and GC copy', (s) => /heap\.|arena\.|\bgc\b|Gc|collect|region/i.test(s)],
	['library natives (date, regex, xml, text, crypto helpers)', (s) => /\b(lib|date|regex|tz|numfmt|exactnum|xml|xmlrss|xmlent|unicase|textcodec|multipart|cron)\./.test(s)],
	['interpreter dispatch and ops', (s) => /\b(interp|ops|module|asm|core)\./.test(s)],
	['HTTP server and client (incl. HTTP/2, DNS)', (s) => /\b(http|http2|hpack|egress|server|dns|conn|socket)\./i.test(s)],
	['fallback-host IPC', (s) => /fallback|ipc|frame|wire/i.test(s)],
	['log, events, admin', (s) => /\b(log|logfmt|admin|event|events|journal|trace)\./i.test(s)],
	['credentials, gym, other shell', (s) => /\b(creds|gym|fixture|programs|growth|cronnext|static_data)\./.test(s)],
	['allocator (zig std / libc malloc)', (s) => /alloc|malloc|free|mmap|realloc/i.test(s)],
	['zig std and libc', (s, d) => /libc|ld-linux/.test(d) || /\bstd\./.test(s)],
];
const areaOf = (sym, dso) => (AREAS.find(([, t]) => t(sym, dso)) ?? ['other'])[0];

let frames = [];
let total = 0;
const self = new Map();
const incl = new Map();
const leafSym = new Map();
const kernelCalls = new Map();
let kernel = 0;
const add = (m, k, v = 1) => m.set(k, (m.get(k) ?? 0) + v);

function flush() {
	if (frames.length === 0) return;
	total++;
	const leaf = frames[0];
	add(leafSym, `${leaf.sym} [${leaf.dso.replace(/^.*\//, '')}]`);
	if (/kernel/.test(leaf.dso)) {
		kernel++;
		const sys = frames.find((f) => /__(x64|ia32)_sys_|__se_sys_|do_syscall/.test(f.sym));
		const user = frames.find((f) => !/kernel/.test(f.dso));
		add(kernelCalls, sys ? sys.sym.replace(/^__(x64|ia32)_sys_|^__se_sys_/, '') : user ? `(no syscall: ${user.sym.slice(0, 40)})` : '(interrupt or softirq)');
		add(self, 'kernel');
	} else {
		let a = 'other';
		for (const f of frames) {
			const x = areaOf(f.sym, f.dso);
			if (x !== 'allocator (zig std / libc malloc)' && x !== 'zig std and libc' && x !== 'other') {
				a = x;
				break;
			}
			if (a === 'other') a = x;
		}
		add(self, a);
	}
	const seen = new Set();
	for (const f of frames) seen.add(/kernel/.test(f.dso) ? 'kernel' : areaOf(f.sym, f.dso));
	for (const a of seen) add(incl, a);
	frames = [];
}

const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
	if (line.trim() === '') {
		flush();
		continue;
	}
	const m = /^\s+([0-9a-f]+)\s+(.*?)\s+\((.*)\)$/.exec(line);
	if (m) frames.push({ sym: m[2].replace(/\+0x[0-9a-f]+$/, ''), dso: m[3] });
}
flush();
const pc = (n) => `${((100 * n) / total).toFixed(1)}%`;
console.log(`${total} samples.\n\n| Area | Self | Inclusive |\n|---|---|---|`);
for (const [a, n] of [...self].sort((x, y) => y[1] - x[1])) console.log(`| ${a} | ${pc(n)} | ${pc(incl.get(a) ?? 0)} |`);
console.log(`\n| Kernel time by system call (share of all samples) | |\n|---|---|`);
for (const [c, n] of [...kernelCalls].sort((x, y) => y[1] - x[1]).slice(0, 15)) console.log(`| ${c} | ${pc(n)} |`);
console.log(`\n| Top leaf functions | Self |\n|---|---|`);
for (const [s, n] of [...leafSym].sort((x, y) => y[1] - x[1]).slice(0, TOP)) console.log(`| \`${s.replace(/\|/g, '/')}\` | ${pc(n)} |`);
