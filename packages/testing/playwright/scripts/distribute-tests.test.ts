import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

// @ts-expect-error — JS module without types; runtime export is what we test.
import { BROAD, EXPECTATIONS_CONSUMERS, resolveExpectationConsumers } from './distribute-tests.mjs';

// vitest runs with cwd = the playwright package root (see vitest.config.ts).
const PLAYWRIGHT_DIR = process.cwd();

// Expectations folders that legitimately have no consuming spec (recorded data
// with no current reader). Keep in sync with the omissions in
// EXPECTATIONS_CONSUMERS. The drift guard below allows exactly these.
const KNOWN_ORPHANS = new Set(['instance-ai-memory']);

// The AST impact walker can't see runtime fs reads, so a changed expectations
// file must be routed to its consuming spec(s) — or fail open to broad. This is
// the guard that keeps a change to expectations/ from silently skipping E2E.
describe('resolveExpectationConsumers — expectations → consuming specs', () => {
	it('maps an inline-loadExpectations folder to its exact consuming specs', () => {
		expect(resolveExpectationConsumers('expectations/langchain/foo.json')).toEqual(
			EXPECTATIONS_CONSUMERS.langchain,
		);
	});

	it('extracts the top-level folder from a nested (instance-ai/<slug>) path', () => {
		expect(
			resolveExpectationConsumers('expectations/instance-ai/weather-alert/trace.jsonl'),
		).toEqual(['tests/e2e/instance-ai/fixtures.ts']);
	});

	it('maps a fixture-backed folder to its fixture entrypoint', () => {
		expect(resolveExpectationConsumers('expectations/chat-hub/x.json')).toEqual([
			'tests/e2e/chat-hub/fixtures.ts',
		]);
	});

	it('returns BROAD for an orphaned expectations folder (no consumer)', () => {
		expect(resolveExpectationConsumers('expectations/instance-ai-memory/x.json')).toBe(BROAD);
	});

	it('returns BROAD for a non-expectations internal file', () => {
		expect(resolveExpectationConsumers('README.md')).toBe(BROAD);
	});
});

describe('EXPECTATIONS_CONSUMERS — drift & existence guards', () => {
	it('every expectations subfolder is mapped or a known orphan', () => {
		const dir = path.join(PLAYWRIGHT_DIR, 'expectations');
		const folders = fs
			.readdirSync(dir, { withFileTypes: true })
			.filter((d) => d.isDirectory())
			.map((d) => d.name);

		for (const folder of folders) {
			const mapped = folder in EXPECTATIONS_CONSUMERS || KNOWN_ORPHANS.has(folder);
			expect(
				mapped,
				`expectations/${folder} has no consumer mapping (add to EXPECTATIONS_CONSUMERS or KNOWN_ORPHANS)`,
			).toBe(true);
		}
	});

	it('every mapped consumer entrypoint exists on disk', () => {
		for (const entries of Object.values(EXPECTATIONS_CONSUMERS) as string[][]) {
			for (const entry of entries) {
				expect(fs.existsSync(path.join(PLAYWRIGHT_DIR, entry)), `missing consumer: ${entry}`).toBe(
					true,
				);
			}
		}
	});
});
