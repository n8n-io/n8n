import { test } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CycleImages } from './cycles';
import { runRotationCycle, runUpgradeCycle } from './cycles';
import { createCycleContext, CycleFailure } from './harness';
import { collectCurrentLogs, logTail } from './instances';

export type Backend = 'sqlite' | 'postgres';
export type Mode = 'upgrade' | 'rotation';

/** DB=sqlite|postgres|both (default both) picks the per-backend tests. */
export function backends(): Backend[] {
	const db = process.env.DB ?? 'both';
	if (db === 'sqlite' || db === 'postgres') return [db];
	return ['sqlite', 'postgres'];
}

export function cycleImages(): CycleImages {
	return {
		// Pinned so the suite is repeatable; bump deliberately when the
		// compatibility baseline changes.
		from: process.env.FROM_IMAGE ?? 'n8nio/n8n:2.37.10',
		to: process.env.TO_IMAGE ?? 'n8nio/n8n:local',
	};
}

let cachedWorkRoot: string | undefined;
/** One work root per process; the CI artifact globs point at WORK_ROOT. */
export function workRoot(): string {
	cachedWorkRoot ??= process.env.WORK_ROOT ?? mkdtempSync(join(tmpdir(), 'encryption-cycle-'));
	return cachedWorkRoot;
}

function commandOk(command: string): boolean {
	try {
		execSync(command, { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

/**
 * Skips when the environment cannot run the cycle: no docker, or the default
 * locally-built image is absent. The encryption CI workflow builds the image
 * and sets ENCRYPTION_CYCLE_REQUIRED=true, so a broken build fails loudly
 * there instead of skipping.
 */
function skipUnlessRunnable(images: CycleImages): void {
	const required = process.env.ENCRYPTION_CYCLE_REQUIRED === 'true';
	const dockerUp = commandOk('docker info');
	if (required && !dockerUp) throw new Error('docker is not available');
	test.skip(!dockerUp, 'docker is not available');

	if (images.to === 'n8nio/n8n:local') {
		const imagePresent = commandOk(`docker image inspect ${images.to}`);
		if (required && !imagePresent) {
			throw new Error(`${images.to} not found; run \`pnpm build:docker\` first`);
		}
		test.skip(
			!imagePresent,
			`${images.to} not found — run \`pnpm build:docker\`, or set TO_IMAGE to a published tag`,
		);
	}
}

/**
 * Runs one backend cycle with the loud failure contract: on any error the
 * running container's log is collected, the stack is torn down, the log tail
 * is printed, and the log/metrics files are attached to the test.
 */
export async function runBackendCycle(mode: Mode, backend: Backend): Promise<void> {
	const images = cycleImages();
	skipUnlessRunnable(images);

	const ctx = createCycleContext(mode, backend, workRoot());
	try {
		if (mode === 'rotation') {
			await runRotationCycle(ctx, images);
		} else {
			await runUpgradeCycle(ctx, images);
		}
	} catch (error) {
		const message =
			error instanceof CycleFailure
				? `${error.message}${error.details ? `\n${error.details}` : ''}`
				: String(error);
		console.log(`[${backend}/${ctx.phase}] FAIL: ${mode}-cycle - ${message}`);
		await collectCurrentLogs(ctx);
		await ctx.stack?.stop().catch(() => {});
		console.log(`--- last 40 log lines (${ctx.logFile}) ---`);
		console.log(logTail(ctx));
		throw error;
	} finally {
		for (const [name, path] of [
			[`${backend}-n8n.log`, ctx.logFile],
			[`${backend}-metrics.csv`, ctx.metricsFile],
		] as const) {
			if (existsSync(path)) {
				await test.info().attach(name, { path, contentType: 'text/plain' });
			}
		}
	}
}
