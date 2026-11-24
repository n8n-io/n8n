import { appendFileSync, closeSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LogFollower, openNewLog, tailLines } from '../src/runtime/logs';

let dir: string;
let file: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'rig-logs-'));
	file = join(dir, 'main-1.log');
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

async function until(check: () => boolean, timeoutMs = 2000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (!check()) {
		if (Date.now() > deadline) throw new Error('timeout');
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
}

describe('LogFollower', () => {
	it('should print new lines quickly, without waiting for the fallback poll', async () => {
		writeFileSync(file, 'old\n');
		const lines: string[] = [];
		const follower = new LogFollower(file, (batch) => lines.push(...batch), true);
		follower.start();
		try {
			const started = Date.now();
			appendFileSync(file, 'new\n');
			await until(() => lines.length === 1);
			expect(lines).toEqual(['new']);
			expect(Date.now() - started).toBeLessThan(900);
		} finally {
			follower.stop();
		}
	});

	it('should follow the new file after a restart replaces the log', async () => {
		writeFileSync(file, '');
		const lines: string[] = [];
		const follower = new LogFollower(file, (batch) => lines.push(...batch), false);
		follower.start();
		try {
			appendFileSync(file, 'first run\n');
			await until(() => lines.length === 1);

			const fd = openNewLog(file, join(dir, 'main-1.1.log'), 'header');
			closeSync(fd);
			appendFileSync(file, 'second run\n');
			await until(() => lines.length === 3);
			expect(lines).toEqual(['first run', 'header', 'second run']);
		} finally {
			follower.stop();
		}
	});

	it('should keep a multi-byte character that a read splits', async () => {
		writeFileSync(file, '');
		const lines: string[] = [];
		const follower = new LogFollower(file, (batch) => lines.push(...batch), false);
		follower.start();
		try {
			const bytes = Buffer.from('ready ✔\n');
			appendFileSync(file, bytes.subarray(0, 7));
			await new Promise((resolve) => setTimeout(resolve, 50));
			appendFileSync(file, bytes.subarray(7));
			await until(() => lines.length === 1);
			expect(lines).toEqual(['ready ✔']);
		} finally {
			follower.stop();
		}
	});

	it('should deliver a burst of lines in few batches', async () => {
		writeFileSync(file, '');
		const batches: string[][] = [];
		const follower = new LogFollower(file, (batch) => batches.push(batch), false);
		follower.start();
		try {
			appendFileSync(file, Array.from({ length: 5000 }, (_, i) => `line ${i}`).join('\n') + '\n');
			await until(() => batches.flat().length === 5000);
			expect(batches.length).toBeLessThan(10);
		} finally {
			follower.stop();
		}
	});
});

describe('tailLines', () => {
	it('should return the last lines without the trailing empty line', () => {
		writeFileSync(file, 'a\nb\nc\n');
		expect(tailLines(file, 2)).toEqual(['b', 'c']);
	});
});
