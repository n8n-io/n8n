// Floor 6 (the host): the CPU of entering V8 for trivial work, in the
// forms that the fallback host uses. Process CPU time (user + system) per
// call, after a warm-up, so the JIT has compiled the hot code.
//   node bench/floor/host-v8.mjs
import vm from 'node:vm';

const cpuNs = () => {
	const u = process.cpuUsage();
	return (u.user + u.system) * 1000;
};

function measure(name, iters, fn) {
	for (let i = 0; i < Math.min(iters, 20000); i++) fn(i); // warm-up
	const t = cpuNs();
	let sink = 0;
	for (let i = 0; i < iters; i++) sink ^= fn(i) ? 1 : 0;
	const ns = (cpuNs() - t) / iters;
	console.log(`host-v8 ${name} ns_per_call=${ns.toFixed(1)} iters=${iters} sink=${sink}`);
	return ns;
}

// 1. A plain JavaScript call (inlined by the JIT): the lower bound.
const add = (a, b) => a + b;
measure('js_call', 50_000_000, (i) => add(i, 1));

// 2. A function compiled in a separate vm context, called from the main
//    context (a Code step whose source was compiled once).
const ctx = vm.createContext({});
const fnInCtx = vm.runInContext('(function (items) { return items.length + 1; })', ctx);
const items = [{ json: { id: 1 } }];
measure('vm_context_fn_call', 10_000_000, () => fnInCtx(items));

// 3. Running a precompiled Script in a context each time (the form of a
//    Code step that is not cached as a function).
const script = new vm.Script('1 + 1');
measure('vm_script_run', 1_000_000, () => script.runInContext(ctx));

// 4. The whole minimal step as a host worker does it: parse the frame,
//    run the user function on the items, serialize the result.
const frame = JSON.stringify({ id: 1, step: 'Code', items: [{ json: { id: 'A-1001', n: 1, amount: 12.5, status: 'open', email: 'user1@example.com' } }] });
const user = vm.runInContext('(function (items) { return items.map((i) => ({ json: { ...i.json, total: i.json.amount * 2 } })); })', ctx);
measure('step_parse_run_stringify', 1_000_000, () => {
	const f = JSON.parse(frame);
	const out = user(f.items);
	return JSON.stringify({ id: f.id, items: out }).length;
});

// 5. A new context per step (isolation per step, as a fresh sandbox).
measure('vm_new_context', 2_000, () => vm.createContext({}) !== null);
