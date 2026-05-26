import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { MigrationTimestampRule } from './migration-timestamp.rule.js';

// Reference "now" used by tests. Chosen so that the existing master-state
// future migrations (1783000000000, 1784000000000) are still ahead of `now` —
// the regime the rule has to handle until real-time catches up.
const NOW = 1_778_000_000_000;

const COMMON_DIR = path.join('packages', '@n8n', 'db', 'src', 'migrations', 'common');
const POSTGRES_DIR = path.join('packages', '@n8n', 'db', 'src', 'migrations', 'postgresdb');
const SQLITE_DIR = path.join('packages', '@n8n', 'db', 'src', 'migrations', 'sqlite');

function createTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-migration-test-'));
}

function writeMigration(rootDir: string, dir: string, fileName: string): string {
	const fullPath = path.join(rootDir, dir, fileName);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, 'export {};\n');
	return path.join(dir, fileName);
}

describe('MigrationTimestampRule', () => {
	let tmpDir: string;
	let rule: MigrationTimestampRule;

	beforeEach(() => {
		tmpDir = createTempDir();
		rule = new MigrationTimestampRule();
		rule.configure({ options: { now: NOW } });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function context(changedFiles?: string[]): CodeHealthContext {
		return { rootDir: tmpDir, changedFiles };
	}

	describe('future-jump invariant (always on)', () => {
		it('flags a timestamp far above the floor + buffer', async () => {
			writeMigration(tmpDir, COMMON_DIR, '1777000000000-Existing.ts');
			writeMigration(tmpDir, COMMON_DIR, '1820000000000-FabricatedJump.ts');

			const violations = await rule.analyze(context());

			const jumpViolation = violations.find((v) => v.file.endsWith('FabricatedJump.ts'));
			expect(jumpViolation).toBeDefined();
			expect(jumpViolation!.message).toContain('future timestamp');
			expect(jumpViolation!.message).toContain('1820000000000');
		});

		it('flags a future jump even when no past migrations exist', async () => {
			writeMigration(tmpDir, COMMON_DIR, '1900000000000-Lonely.ts');

			const violations = await rule.analyze(context());

			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain('future timestamp');
		});

		it('flags the head when its timestamp is beyond now + ceiling buffer', async () => {
			// Mirrors current master: 1784000000000 is the head, well above
			// now (1778…) + 1s buffer.
			writeMigration(tmpDir, COMMON_DIR, '1700000000000-Old.ts');
			writeMigration(tmpDir, COMMON_DIR, '1784000000000-Head.ts');

			const violations = await rule.analyze(context());

			const headViolation = violations.find((v) => v.file.endsWith('Head.ts'));
			expect(headViolation).toBeDefined();
			expect(headViolation!.message).toContain('future timestamp');
		});

		it('does not fire future-jump on historical past timestamps', async () => {
			// A whole tree of past migrations — none should be flagged.
			writeMigration(tmpDir, COMMON_DIR, '1700000000000-A.ts');
			writeMigration(tmpDir, COMMON_DIR, '1750000000000-B.ts');
			writeMigration(tmpDir, COMMON_DIR, '1777000000000-C.ts');

			const violations = await rule.analyze(context());

			expect(violations).toHaveLength(0);
		});
	});

	describe('ordering invariant (only when changedFiles is supplied)', () => {
		it('does NOT flag historical sub-max files when changedFiles is omitted', async () => {
			// Without CI-provided changedFiles, the rule does not run the
			// ordering check at all — preventing 237 false positives on the
			// existing migration tree.
			writeMigration(tmpDir, COMMON_DIR, '1700000000000-Old.ts');
			writeMigration(tmpDir, COMMON_DIR, '1750000000000-Mid.ts');
			writeMigration(tmpDir, COMMON_DIR, '1777000000000-Head.ts');

			const violations = await rule.analyze(context());

			expect(violations).toHaveLength(0);
		});

		it('flags a newly-added sub-floor migration', async () => {
			writeMigration(tmpDir, COMMON_DIR, '1700000000000-Pre-existing.ts');
			writeMigration(tmpDir, COMMON_DIR, '1784000000000-Head.ts');
			const newlyAdded = writeMigration(tmpDir, COMMON_DIR, '1750000000000-NewBelowFloor.ts');

			const violations = await rule.analyze(context([newlyAdded]));

			const ordering = violations.find((v) => v.file.endsWith('NewBelowFloor.ts'));
			expect(ordering).toBeDefined();
			expect(ordering!.message).toContain('at or below the highest existing migration');
			expect(ordering!.message).toContain('1784000000000');
		});

		it('does NOT flag a historical sub-max file even when other files are added', async () => {
			writeMigration(tmpDir, COMMON_DIR, '1700000000000-Old.ts');
			writeMigration(tmpDir, COMMON_DIR, '1750000000000-AlsoOld.ts');
			const newlyAdded = writeMigration(tmpDir, COMMON_DIR, '1777000000000-Head.ts');

			const violations = await rule.analyze(context([newlyAdded]));

			// Head is the new file but it's at the top — no ordering issue.
			// The two pre-existing sub-max files are NOT in changedFiles,
			// so they're not checked.
			expect(violations).toHaveLength(0);
		});

		it('accepts a multi-migration PR that strictly ascends above the floor', async () => {
			rule.configure({ options: { now: 1_800_000_000_000 } });
			writeMigration(tmpDir, COMMON_DIR, '1700000000000-Pre-existing.ts');
			const a = writeMigration(tmpDir, COMMON_DIR, '1799000000001-A.ts');
			const b = writeMigration(tmpDir, COMMON_DIR, '1799000000002-B.ts');
			const head = writeMigration(tmpDir, COMMON_DIR, '1799000000003-Head.ts');

			const violations = await rule.analyze(context([a, b, head]));

			// `a` and `b` are below the new head — they violate ordering.
			// This is intentional and expected for a multi-migration PR: each
			// added migration must be greater than every other migration
			// including the others added in the same PR. Authors should
			// instead order them so each is strictly the head at the time
			// of its conceptual insertion.
			const violatingFiles = violations.map((v) => path.basename(v.file)).sort();
			expect(violatingFiles).toEqual(['1799000000001-A.ts', '1799000000002-B.ts']);
		});

		it('flags a newly-added migration that exactly ties the head', async () => {
			writeMigration(tmpDir, COMMON_DIR, '1700000000000-Pre-existing.ts');
			writeMigration(tmpDir, COMMON_DIR, '1777000000000-Head.ts');
			const tie = writeMigration(tmpDir, POSTGRES_DIR, '1777000000000-Tie.ts');

			const violations = await rule.analyze(context([tie]));

			const tieViolation = violations.find((v) => v.file.endsWith('Tie.ts'));
			expect(tieViolation).toBeDefined();
			expect(tieViolation!.message).toContain('at or below');
		});

		it('flags a newly-added migration whose path uses a leading "./"', async () => {
			writeMigration(tmpDir, COMMON_DIR, '1777000000000-Head.ts');
			const added = writeMigration(tmpDir, COMMON_DIR, '1700000000000-Below.ts');

			const violations = await rule.analyze(context([`./${added}`]));

			// Should still match after path normalisation.
			const found = violations.find((v) => v.file.endsWith('Below.ts'));
			expect(found).toBeDefined();
		});

		it('flags a modified historical migration if listed in changedFiles', async () => {
			// Documented trade-off: changedFiles comes from ci-filter's
			// changed-files output, which includes modifications. A PR that
			// edits an existing migration (rare — bug fix in up/down) will
			// trip ordering here even though the timestamp didn't change.
			// Author should either bump the timestamp (preferred when the
			// edit changes semantics) or add to the baseline. This test
			// pins that behaviour so anyone re-introducing added-files-only
			// semantics has to revisit it intentionally.
			writeMigration(tmpDir, COMMON_DIR, '1777000000000-Head.ts');
			const modified = writeMigration(tmpDir, COMMON_DIR, '1620000000000-Historical.ts');

			const violations = await rule.analyze(context([modified]));

			const historical = violations.find((v) => v.file.endsWith('Historical.ts'));
			expect(historical).toBeDefined();
			expect(historical!.message).toContain('at or below');
		});
	});

	describe('dialect overrides', () => {
		it('allows common/<ts>-<name>.ts paired with sqlite/<ts>-<name>.ts', async () => {
			// SQLite override pattern: same timestamp + same suffix means same
			// TypeORM class — the postgres index imports the common version,
			// the sqlite index imports its own. One logical migration, two
			// dialect-specific files. Both should be accepted as the head.
			writeMigration(tmpDir, COMMON_DIR, '1700000000000-Pre-existing.ts');
			const commonHead = writeMigration(
				tmpDir,
				COMMON_DIR,
				'1777000000000-CreateAgentHistoryTable.ts',
			);
			const sqliteOverride = writeMigration(
				tmpDir,
				SQLITE_DIR,
				'1777000000000-CreateAgentHistoryTable.ts',
			);

			const violations = await rule.analyze(context([commonHead, sqliteOverride]));

			expect(violations).toEqual([]);
		});

		it('allows common/<ts>-<name>.ts paired with postgresdb/<ts>-<name>.ts', async () => {
			writeMigration(tmpDir, COMMON_DIR, '1700000000000-Pre-existing.ts');
			const commonHead = writeMigration(tmpDir, COMMON_DIR, '1777000000000-NewTable.ts');
			const postgresOverride = writeMigration(tmpDir, POSTGRES_DIR, '1777000000000-NewTable.ts');

			const violations = await rule.analyze(context([commonHead, postgresOverride]));

			expect(violations).toEqual([]);
		});

		it('still flags two unrelated migrations colliding on the same timestamp', async () => {
			// Same timestamp + DIFFERENT suffix = genuine collision. Override
			// pairing must be by filename, not just by timestamp.
			writeMigration(tmpDir, COMMON_DIR, '1700000000000-Pre-existing.ts');
			const commonHead = writeMigration(tmpDir, COMMON_DIR, '1777000000000-Foo.ts');
			const collision = writeMigration(tmpDir, SQLITE_DIR, '1777000000000-Bar.ts');

			const violations = await rule.analyze(context([commonHead, collision]));

			const files = violations.map((v) => path.basename(v.file)).sort();
			expect(files).toEqual(['1777000000000-Bar.ts', '1777000000000-Foo.ts']);
		});

		it('still flags a sub-floor override file', async () => {
			// An override pair below the head is still out of order — the
			// floor is computed from non-self slots, so the pair shares one
			// slot at the override timestamp but is still below the head.
			writeMigration(tmpDir, COMMON_DIR, '1777000000000-Head.ts');
			const commonLate = writeMigration(tmpDir, COMMON_DIR, '1700000000000-Override.ts');
			const sqliteLate = writeMigration(tmpDir, SQLITE_DIR, '1700000000000-Override.ts');

			const violations = await rule.analyze(context([commonLate, sqliteLate]));

			const files = violations.map((v) => path.basename(v.file)).sort();
			expect(files).toEqual(['1700000000000-Override.ts', '1700000000000-Override.ts']);
		});
	});

	describe('ceiling configuration', () => {
		it('respects a custom ceilingBufferMs option', async () => {
			rule.configure({ options: { now: 1_800_000_000_000, ceilingBufferMs: 10 } });
			writeMigration(tmpDir, COMMON_DIR, '1799000000000-Existing.ts');
			writeMigration(tmpDir, COMMON_DIR, '1800000000050-JustOverBuffer.ts');

			const violations = await rule.analyze(context());

			const overBuffer = violations.find((v) => v.file.endsWith('JustOverBuffer.ts'));
			expect(overBuffer).toBeDefined();
			expect(overBuffer!.message).toContain('future timestamp');
		});
	});

	describe('discovery + filename hygiene', () => {
		it('ignores index.ts and other non-migration files', async () => {
			writeMigration(tmpDir, COMMON_DIR, 'index.ts');
			writeMigration(tmpDir, COMMON_DIR, 'README.md');

			const violations = await rule.analyze(context());

			expect(violations).toHaveLength(0);
		});

		it('scans every configured migration directory', async () => {
			const common = writeMigration(tmpDir, COMMON_DIR, '1700000000000-Common.ts');
			const postgres = writeMigration(tmpDir, POSTGRES_DIR, '1750000000000-Postgres.ts');
			const sqlite = writeMigration(tmpDir, SQLITE_DIR, '1755000000000-Sqlite.ts');

			const violations = await rule.analyze(context([common, postgres, sqlite]));

			// Common and Postgres are below Sqlite's head — both trip
			// ordering, proving every directory is scanned and changedFiles
			// matches across directories.
			const files = violations.map((v) => path.basename(v.file)).sort();
			expect(files).toEqual(['1700000000000-Common.ts', '1750000000000-Postgres.ts']);
		});
	});
});
