#!/usr/bin/env node
/**
 * Measures one case in this process and prints one JSON line.
 *
 * Usage: node --expose-gc run-case.mjs <label> <buildDir> <vm|quickjs> <general|transfer> <shape> <expr>
 *
 * `buildDir` is a built `@n8n/expression-runtime` package directory.
 */

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [label, buildDir, engine, matrix, shapeName, exprName] = process.argv.slice(2);
const requireBuild = createRequire(resolve(buildDir, 'package.json'));
const { shapes, exprs } = await import(`./cases-${matrix}.mjs`);

const BRIDGE_OPTIONS = { timeout: 120_000, memoryLimit: 1024 };
const MIN_RUNS = 11;
const MAX_RUNS = 1500;
const MEASURE_MS = 400;
/** A case slower than this runs fewer times, so the matrix stays short. */
const SLOW_CASE_MS = 200;
const SLOW_CASE_RUNS = 5;

/** Returns the bridge and a function that reads the used guest memory in bytes. */
async function createBridge() {
	if (engine === 'quickjs') {
		const { QuickJsBridge } = requireBuild('./dist/cjs/bridge/quickjs-bridge.js');
		const bridge = new QuickJsBridge(BRIDGE_OPTIONS);
		await bridge.initialize();
		const guestUsed = () => {
			const handle = bridge.runtime.computeMemoryUsage();
			const usage = bridge.vm.dump(handle);
			handle.dispose();
			return usage.memory_used_size;
		};
		return { bridge, guestUsed };
	}
	const { IsolatedVmBridge } = requireBuild('./dist/cjs/bridge/isolated-vm-bridge.js');
	const bridge = new IsolatedVmBridge(BRIDGE_OPTIONS);
	await bridge.initialize();
	return { bridge, guestUsed: () => bridge.isolate.getHeapStatisticsSync().used_heap_size };
}

/**
 * A text form of the result that keeps what JSON drops: Map, Set, Date, Error,
 * undefined, the length of an array, and a value that the result holds more than once.
 */
function describeResult(root) {
	const ids = new Map();
	const describe = (value) => {
		if (value === null || typeof value !== 'object') {
			return `${typeof value}:${Object.is(value, -0) ? '-0' : String(value)}`;
		}
		if (ids.has(value)) {
			return `ref:${ids.get(value)}`;
		}
		ids.set(value, ids.size);
		if (value instanceof Date) {
			return `Date:${value.getTime()}`;
		}
		if (value instanceof Map) {
			return `Map{${[...value].map(([key, item]) => `${describe(key)}=>${describe(item)}`).join(',')}}`;
		}
		if (value instanceof Set) {
			return `Set{${[...value].map(describe).join(',')}}`;
		}
		const fields = Object.keys(value).map((key) => `${key}:${describe(value[key])}`);
		const error = value instanceof Error ? `${value.name}|${value.message}|` : '';
		const primitive = typeof value.valueOf === 'function' ? value.valueOf() : value;
		const boxed = primitive === value ? '' : `${describe(primitive)}|`;
		const length = Array.isArray(value) ? `length:${value.length}|` : '';
		return `${Object.prototype.toString.call(value)}{${error}${boxed}${length}${fields.join(',')}}`;
	};
	return describe(root);
}

/** A short hash of the result, to see that two builds return the same value. */
function hashResult(result) {
	return createHash('sha1').update(describeResult(result)).digest('hex').slice(0, 10);
}

/** Sorted wall times in ms of warm runs. */
function measureWarmRuns(run) {
	const firstStart = performance.now();
	run();
	const isSlow = performance.now() - firstStart > SLOW_CASE_MS;
	const minRuns = isSlow ? SLOW_CASE_RUNS : MIN_RUNS;
	if (!isSlow) {
		for (let i = 0; i < 4; i++) {
			run();
		}
	}
	const times = [];
	const start = performance.now();
	while (
		times.length < minRuns ||
		(performance.now() - start < MEASURE_MS && times.length < MAX_RUNS)
	) {
		const runStart = performance.now();
		run();
		times.push(performance.now() - runStart);
	}
	return times.sort((a, b) => a - b);
}

const toKB = (bytes) => Math.round(bytes / 1024);

const shape = shapes[shapeName]();
const data = shape.__data ?? { $json: shape };
const code = exprs[exprName];
const { bridge, guestUsed } = await createBridge();
const guestAfterInit = guestUsed();
const out = { variant: label, engine, shape: shapeName, expr: exprName, ok: true };

global.gc();
global.gc();
// No collection after the run: the growth is what one run allocates on the host,
// not what the host keeps.
const hostHeapBefore = process.memoryUsage().heapUsed;
try {
	const result = bridge.execute(code, data);
	out.hostAllocKB = toKB(process.memoryUsage().heapUsed - hostHeapBefore);
	out.guestKB = toKB(guestUsed() - guestAfterInit);
	out.hash = hashResult(result);
	const times = measureWarmRuns(() => bridge.execute(code, data));
	out.runs = times.length;
	out.med = Number(times[Math.floor(times.length / 2)].toFixed(4));
	out.p95 = Number(times[Math.floor(times.length * 0.95)].toFixed(4));
} catch (error) {
	out.ok = false;
	out.error = String(error?.message).slice(0, 80);
}
out.guestInitKB = toKB(guestAfterInit);

console.log(JSON.stringify(out));
// Do not force the exit: a forced exit can drop the end of the output line.
process.exitCode = 0;
