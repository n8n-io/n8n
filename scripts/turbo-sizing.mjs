/**
 * Shared RAM-aware sizing for turbo runs.
 *
 * A `vue-tsc` / `tsc` worker peaks between 2.3 GB and 6.9 GB of resident
 * memory. Turbo's own default concurrency (10) therefore asks for far more
 * memory than a laptop has, and the machine swaps. This module derives one
 * concurrency value and one per-process old-space cap from the machine, so
 * `concurrency x cap` stays inside the installed RAM.
 *
 * The consumers are `scripts/turbo-sized.mjs` (the root `build` and
 * `typecheck` scripts) and `scripts/agent-setup.mjs`. Keep the logic here;
 * do not copy it into a consumer.
 *
 * Override precedence, highest first:
 *   1. an explicit `--concurrency` / `--concurrency=<n>` argument
 *   2. the `TURBO_CONCURRENCY` environment variable
 *   3. the computed default from this module
 *
 * Under CI the whole module is a no-op: every workflow already pins the
 * concurrency and the memory cap it wants per job.
 *
 * See N8N-383 for design notes.
 */
import { availableParallelism, totalmem } from 'node:os';

/** Per-process old-space cap in MB. Matches the CI typecheck job. */
export const DEFAULT_PROCESS_MEM_MB = 6144;

/**
 * Memory left to the operating system, the editor, and the turbo parent
 * process. Without it a machine whose RAM is an exact multiple of the cap
 * gets one worker too many.
 */
export const RESERVED_SYSTEM_MB = 2048;

/** Never serialize completely, and never exceed turbo's own default. */
export const MIN_CONCURRENCY = 1;
export const MAX_CONCURRENCY = 10;

/** Name of the environment variable that overrides the computed default. */
export const CONCURRENCY_ENV_VAR = 'TURBO_CONCURRENCY';

/**
 * Concurrency that fits `processMemMb` workers into the machine's RAM.
 *
 * Pure — every input is explicit, so the callers in the tests can ask for a
 * machine profile they are not running on.
 *
 * @param {object} machine
 * @param {number} machine.totalMemMb installed RAM in MB
 * @param {number} machine.cpuCount usable CPU count
 * @param {number} [machine.processMemMb] per-process old-space cap in MB
 * @returns {number} concurrency, between MIN_CONCURRENCY and MAX_CONCURRENCY
 */
export function computeConcurrency({
	totalMemMb,
	cpuCount,
	processMemMb = DEFAULT_PROCESS_MEM_MB,
}) {
	// A machine smaller than one worker still has to run that one worker.
	const budgetMb = Math.max(totalMemMb - RESERVED_SYSTEM_MB, processMemMb);
	const byMemory = Math.floor(budgetMb / processMemMb);
	const byCpu = Math.max(1, Math.floor(cpuCount));
	return Math.min(Math.max(Math.min(byMemory, byCpu), MIN_CONCURRENCY), MAX_CONCURRENCY);
}

/** Reads the machine this process runs on. */
export function readMachine() {
	return {
		totalMemMb: Math.floor(totalmem() / 1024 / 1024),
		cpuCount: availableParallelism(),
	};
}

/**
 * Parses the `--concurrency` value out of a turbo argument list.
 *
 * Accepts `--concurrency=<value>` and `--concurrency <value>`. Returns the
 * raw string so an invalid value still counts as "the caller decided" and
 * reaches turbo, which reports the error better than this module can.
 *
 * @param {string[]} args
 * @returns {string | undefined}
 */
export function findConcurrencyArg(args) {
	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (arg === '--concurrency') return args[i + 1];
		if (arg.startsWith('--concurrency=')) return arg.slice('--concurrency='.length);
	}
	return undefined;
}

/**
 * Parses the environment override. Rejects anything that is not a positive
 * integer or a percentage, which is what turbo itself accepts.
 *
 * @param {string | undefined} raw
 * @returns {string | undefined}
 */
export function parseConcurrencyEnv(raw) {
	if (raw === undefined) return undefined;
	const value = raw.trim();
	if (value === '') return undefined;
	if (/^[1-9][0-9]*%?$/.test(value)) return value;
	return undefined;
}

/**
 * Applies the precedence rules and reports which one won.
 *
 * `source` is `'flag'`, `'env'`, `'ci'`, or `'computed'`. `'ci'` means no
 * default was injected: CI pins its own concurrency per job, so this module
 * must not change what a workflow already runs.
 *
 * @param {object} input
 * @param {string[]} input.args turbo arguments the caller passed through
 * @param {Record<string, string | undefined>} input.env
 * @param {{ totalMemMb: number, cpuCount: number }} input.machine
 * @param {number} [input.processMemMb]
 * @returns {{ concurrency: string | undefined, source: string, inject: boolean }}
 */
export function resolveConcurrency({ args, env, machine, processMemMb = DEFAULT_PROCESS_MEM_MB }) {
	const fromFlag = findConcurrencyArg(args);
	if (fromFlag !== undefined) {
		return { concurrency: fromFlag, source: 'flag', inject: false };
	}

	const fromEnv = parseConcurrencyEnv(env[CONCURRENCY_ENV_VAR]);
	if (fromEnv !== undefined) {
		return { concurrency: fromEnv, source: 'env', inject: true };
	}

	if (env.CI) {
		return { concurrency: undefined, source: 'ci', inject: false };
	}

	const computed = computeConcurrency({ ...machine, processMemMb });
	return { concurrency: String(computed), source: 'computed', inject: true };
}

/**
 * Adds the per-process old-space cap to NODE_OPTIONS.
 *
 * By default a cap the caller already set wins: the concurrency arithmetic
 * above is only valid for the cap it was computed with, but a developer who
 * pins the cap by hand has taken that arithmetic over. Pass `override` when
 * the cap came from an explicit flag, which outranks the environment.
 *
 * @param {string | undefined} nodeOptions current NODE_OPTIONS
 * @param {number} processMemMb
 * @param {{ override?: boolean }} [options]
 * @returns {string}
 */
export function resolveNodeOptions(
	nodeOptions,
	processMemMb = DEFAULT_PROCESS_MEM_MB,
	{ override = false } = {},
) {
	const current = nodeOptions?.trim() ?? '';
	if (!override && current.includes('--max-old-space-size')) return current;
	const cap = `--max-old-space-size=${processMemMb}`;
	// Node applies the last --max-old-space-size it reads, so appending wins.
	return current === '' ? cap : `${current} ${cap}`;
}

/**
 * Composes the two decisions above into everything a runner needs.
 *
 * WARNING: under CI this returns the caller's arguments and NODE_OPTIONS
 * unchanged. Every n8n workflow pins its own concurrency and memory cap per
 * job. A default injected here would silently change those jobs.
 *
 * @param {object} input
 * @param {string[]} input.args turbo arguments the caller passed through
 * @param {Record<string, string | undefined>} input.env
 * @param {{ totalMemMb: number, cpuCount: number }} input.machine
 * @param {number} [input.processMemMb]
 * @returns {{ args: string[], nodeOptions: string | undefined, concurrency: string | undefined, source: string }}
 */
export function resolveSizing({ args, env, machine, processMemMb = DEFAULT_PROCESS_MEM_MB }) {
	if (env.CI) {
		// Report what the workflow chose, if anything, but change nothing.
		const { concurrency } = resolveConcurrency({ args, env, machine, processMemMb });
		return { args, nodeOptions: env.NODE_OPTIONS, concurrency, source: 'ci' };
	}

	const { concurrency, inject, source } = resolveConcurrency({ args, env, machine, processMemMb });
	return {
		args: inject ? [`--concurrency=${concurrency}`, ...args] : args,
		nodeOptions: resolveNodeOptions(env.NODE_OPTIONS, processMemMb),
		concurrency,
		source,
	};
}
