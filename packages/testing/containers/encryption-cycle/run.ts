#!/usr/bin/env tsx
/**
 * run.ts — repeatable tests for the encryption-key rollout, on the
 * n8n-containers Testcontainers stack. See README.md in this folder.
 *
 * MODE=upgrade (default): P1 seed on the old release -> P2 upgrade (flag
 * off, byte-compatible writes) -> P3 downgrade-read -> P4 write-on+rotate.
 * MODE=rotation: the build under test only, fresh database, flag ON:
 * R1 seed -> R2 rotate x2 -> R3 restart-read.
 *
 * Params (env): MODE (upgrade | rotation), DB (sqlite | postgres | both),
 * FROM_IMAGE (pinned old release; upgrade mode), TO_IMAGE (default
 * n8nio/n8n:local — run `pnpm build:docker` first), WORK_ROOT (default
 * mktemp). Postgres image: TEST_IMAGE_POSTGRES. Needs docker.
 * Exit: 0 PASS, 1 FAIL (loud, with log tail), 77 SKIP (docker unavailable).
 */
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CycleImages } from './cycles';
import { runRotationCycle, runUpgradeCycle } from './cycles';
import { createCycleContext, CycleFailure, passLine } from './harness';
import { collectCurrentLogs, logTail } from './instances';

const MODE = (process.env.MODE ?? 'upgrade') as 'upgrade' | 'rotation';
const DB = process.env.DB ?? 'both';
const SPEC_NAME = MODE === 'rotation' ? 'rotation-cycle' : 'upgrade-cycle';

const images: CycleImages = {
	// Pinned so the suite is repeatable; bump deliberately when the
	// compatibility baseline changes.
	from: process.env.FROM_IMAGE ?? 'n8nio/n8n:2.37.10',
	to: process.env.TO_IMAGE ?? 'n8nio/n8n:local',
};

function ensureDocker(): void {
	try {
		execSync('docker info', { stdio: 'ignore' });
	} catch {
		console.log(`SKIP: ${SPEC_NAME} - docker not available`);
		process.exit(77);
	}
}

function ensureToImage(): void {
	try {
		execSync(`docker image inspect ${images.to}`, { stdio: 'ignore' });
	} catch {
		if (images.to === 'n8nio/n8n:local') {
			console.log(`FAIL: ${SPEC_NAME} - ${images.to} not found; run \`pnpm build:docker\` first`);
			process.exit(1);
		}
		// A published TO image is pulled by testcontainers on first use.
	}
}

async function main(): Promise<void> {
	if (!['upgrade', 'rotation'].includes(MODE)) {
		console.log(`FAIL: unknown MODE '${MODE}' (use upgrade | rotation)`);
		process.exit(1);
	}
	if (!['sqlite', 'postgres', 'both'].includes(DB)) {
		console.log(`FAIL: unknown DB '${DB}' (use sqlite | postgres | both)`);
		process.exit(1);
	}
	ensureDocker();
	ensureToImage();

	const workRoot = process.env.WORK_ROOT ?? mkdtempSync(join(tmpdir(), `${SPEC_NAME}-`));
	passLine(`${SPEC_NAME} | work root: ${workRoot}`);
	if (MODE === 'rotation') {
		passLine(`MODE: rotation | image under test: ${images.to} | DB: ${DB}`);
	} else {
		passLine(`FROM: ${images.from} | TO: ${images.to} | DB: ${DB}`);
	}

	const backends = DB === 'both' ? (['sqlite', 'postgres'] as const) : ([DB] as const);

	for (const backend of backends) {
		const ctx = createCycleContext(MODE, backend as 'sqlite' | 'postgres', workRoot);
		try {
			if (MODE === 'rotation') {
				await runRotationCycle(ctx, images);
			} else {
				await runUpgradeCycle(ctx, images);
			}
		} catch (error) {
			// Every failure gets the same loud treatment: message, container log
			// collection, the log tail, stack teardown, exit 1.
			const message =
				error instanceof CycleFailure
					? error.message
					: `unexpected error: ${error instanceof Error ? error.message : String(error)}`;
			console.log(
				`[${new Date().toTimeString().slice(0, 8)}] [${backend}/${ctx.phase}] FAIL: ${SPEC_NAME} - ${message}`,
			);
			if (error instanceof CycleFailure && error.details) console.log(error.details);
			if (!(error instanceof CycleFailure)) console.error(error);
			await collectCurrentLogs(ctx);
			await ctx.stack?.stop().catch(() => {});
			console.log(`--- last 40 log lines (${ctx.logFile}) ---`);
			console.log(logTail(ctx));
			process.exit(1);
		}
	}

	passLine(`PASS: ${SPEC_NAME} — all requested backends green (${DB})`);
	process.exit(0);
}

void main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
