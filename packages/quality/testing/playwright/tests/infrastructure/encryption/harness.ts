import { test } from '@playwright/test';
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { N8NStack } from 'n8n-containers/stack';

/** One backend run's mutable state: paths, metrics, and the current phase. */
export interface CycleContext {
	mode: 'upgrade' | 'rotation';
	backend: 'sqlite' | 'postgres';
	homeDir: string;
	logFile: string;
	metricsFile: string;
	/** The backend's stack, set by bootStack() and cleared by finishCycle(). */
	stack?: N8NStack;
	phase: string;
	phaseStartedMs: number;
}

export function createCycleContext(
	mode: 'upgrade' | 'rotation',
	backend: 'sqlite' | 'postgres',
	workRoot: string,
): CycleContext {
	const backendDir = join(workRoot, backend);
	const ctx: CycleContext = {
		mode,
		backend,
		homeDir: join(backendDir, 'home'),
		logFile: join(backendDir, 'n8n.log'),
		metricsFile: join(backendDir, 'metrics.csv'),
		phase: 'setup',
		phaseStartedMs: Date.now(),
	};
	// A reused WORK_ROOT must start clean: a leftover home dir would boot the
	// seed phase on the previous run's database.
	rmSync(backendDir, { recursive: true, force: true });
	mkdirSync(ctx.homeDir, { recursive: true });
	writeFileSync(ctx.metricsFile, '');
	writeFileSync(ctx.logFile, '');
	return ctx;
}

const ts = () => new Date().toTimeString().slice(0, 8);

export function metric(ctx: CycleContext, kind: string, label: string, value: number): void {
	appendFileSync(ctx.metricsFile, `${kind},${label},${value}\n`);
}

/** Rolls the phase over for metrics/logging and runs the body as a test step. */
export async function runPhase(
	ctx: CycleContext,
	name: string,
	body: () => Promise<void>,
): Promise<void> {
	metric(ctx, 'phase_s', ctx.phase, Math.round((Date.now() - ctx.phaseStartedMs) / 1000));
	ctx.phase = name;
	ctx.phaseStartedMs = Date.now();
	console.log('');
	console.log(`[${ts()}] ================ [${ctx.backend}] ${name} ================`);
	await test.step(name, body);
}

export function step(ctx: CycleContext, msg: string): void {
	console.log(`[${ts()}] [${ctx.backend}/${ctx.phase}] ${msg}`);
}

export function ok(ctx: CycleContext, msg: string): void {
	console.log(`[${ts()}] [${ctx.backend}/${ctx.phase}]   OK: ${msg}`);
}

/** A failed check. run.ts turns it into the loud FAIL output and exit 1. */
export class CycleFailure extends Error {
	constructor(
		message: string,
		readonly details?: string,
	) {
		super(message);
		this.name = 'CycleFailure';
	}
}

export function fail(msg: string, details?: string): never {
	throw new CycleFailure(msg, details);
}

/** Prints the per-backend metrics block the CI summary parses. */
export function summary(ctx: CycleContext): void {
	metric(ctx, 'phase_s', ctx.phase, Math.round((Date.now() - ctx.phaseStartedMs) / 1000));

	const phaseSeconds = new Map<string, number>();
	const decrypts = new Map<string, number[]>();
	const rotates: number[] = [];
	const journeyExecs: number[] = [];
	const lines = readFileSync(ctx.metricsFile, 'utf8')
		.split('\n')
		.filter((l) => l.length > 0);
	for (const line of lines) {
		const [kind, label, value] = line.split(',');
		if (kind === 'phase_s' && label !== 'setup') {
			phaseSeconds.set(label, (phaseSeconds.get(label) ?? 0) + Number(value));
		} else if (kind === 'decrypt_ms') {
			const list = decrypts.get(label) ?? [];
			list.push(Number(value));
			decrypts.set(label, list);
		} else if (kind === 'rotate_ms') {
			rotates.push(Number(value));
		} else if (kind === 'journey_exec_ms') {
			journeyExecs.push(Number(value));
		}
	}

	const row = (label: string, secs: number | string, count: string, avg: string, max: string) =>
		`${label.padEnd(14)} ${String(secs).padStart(8)}s ${count.padStart(15)} ${avg.padStart(8)} ${max.padStart(8)}`;

	console.log('');
	console.log(`=== metrics [${ctx.backend}] ===`);
	console.log(
		`${'phase'.padEnd(14)} ${'duration'.padStart(9)} ${'decrypt checks'.padStart(15)} ${'avg ms'.padStart(8)} ${'max ms'.padStart(8)}`,
	);
	let totalSecs = 0;
	const allMs: number[] = [];
	for (const [label, secs] of phaseSeconds) {
		totalSecs += secs;
		const ms = decrypts.get(label) ?? [];
		allMs.push(...ms);
		const avg = ms.length ? (ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(1) : '-';
		const max = ms.length ? Math.max(...ms).toFixed(1) : '-';
		console.log(row(label, secs, String(ms.length), avg, max));
	}
	const avgAll = allMs.length ? (allMs.reduce((a, b) => a + b, 0) / allMs.length).toFixed(1) : '-';
	const maxAll = allMs.length ? Math.max(...allMs).toFixed(1) : '-';
	console.log(row('total', totalSecs, String(allMs.length), avgAll, maxAll));
	if (rotates.length) {
		const avg = (rotates.reduce((a, b) => a + b, 0) / rotates.length).toFixed(1);
		console.log(
			`rotate api: ${rotates.length} calls, avg ${avg} ms, max ${Math.max(...rotates).toFixed(1)} ms`,
		);
	}
	if (journeyExecs.length) {
		const avg = (journeyExecs.reduce((a, b) => a + b, 0) / journeyExecs.length / 1000).toFixed(1);
		const max = (Math.max(...journeyExecs) / 1000).toFixed(1);
		console.log(
			`scheduled executions: ${journeyExecs.length} boots verified, avg ${avg} s, max ${max} s to a fresh success`,
		);
	}
}

export function passLine(msg: string): void {
	console.log('');
	console.log(`[${ts()}] ${msg}`);
}
