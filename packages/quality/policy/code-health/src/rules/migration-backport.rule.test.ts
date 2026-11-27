import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import { MigrationBackportRule } from './migration-backport.rule.js';

const COMMON = 'packages/@n8n/db/src/migrations/common';
const MIGRATION = `${COMMON}/1793553583760-AddResumeAttempts.ts`;
const RELEASE_BRANCH = 'release-candidate/2.50.x';

const MASTER_CONTENT = 'export class AddResumeAttempts1793553583760 {}\n';

describe('MigrationBackportRule', () => {
	let rootDir: string;
	let rule: MigrationBackportRule;

	function git(...args: string[]) {
		execFileSync(
			'git',
			[
				'-c',
				'user.name=test',
				'-c',
				'user.email=test@example.com',
				'-c',
				'commit.gpgsign=false',
				...args,
			],
			{ cwd: rootDir, stdio: 'ignore' },
		);
	}

	function write(file: string, content: string) {
		const fullPath = path.join(rootDir, file);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}

	function context(changedFiles: string[], overrides: Partial<CodeHealthContext> = {}) {
		return {
			rootDir,
			changedFiles,
			baseBranch: RELEASE_BRANCH,
			masterRef: 'master',
			...overrides,
		};
	}

	beforeEach(() => {
		rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-migration-backport-'));
		rule = new MigrationBackportRule();
		git('init', '--quiet', '--initial-branch=master');
		write(MIGRATION, MASTER_CONTENT);
		git('add', '.');
		git('commit', '--quiet', '-m', 'master');
	});

	afterEach(() => {
		fs.rmSync(rootDir, { recursive: true, force: true });
	});

	it('accepts a migration that is identical to master', async () => {
		expect(await rule.analyze(context([MIGRATION]))).toEqual([]);
	});

	it('flags a migration whose content differs from master', async () => {
		write(MIGRATION, 'export class AddResumeAttempts1793553583760 { changed = true; }\n');

		const violations = await rule.analyze(context([MIGRATION]));

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('different from the same file on master');
	});

	it('flags a migration that master does not have', async () => {
		const releaseOnly = `${COMMON}/1793553583761-ReleaseOnly.ts`;
		write(releaseOnly, 'export class ReleaseOnly1793553583761 {}\n');

		const violations = await rule.analyze(context([releaseOnly]));

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('is not on master');
	});

	it('checks a migration whose name has a hyphen or an underscore', async () => {
		const releaseOnly = `${COMMON}/1793553583763-Release_Only-Fix.ts`;
		write(releaseOnly, 'export class ReleaseOnly1793553583763 {}\n');

		expect(await rule.analyze(context([releaseOnly]))).toHaveLength(1);
	});

	it('does nothing when no files changed', async () => {
		expect(
			await rule.analyze({ rootDir, baseBranch: RELEASE_BRANCH, masterRef: 'master' }),
		).toEqual([]);
	});

	it('ignores a deleted migration', async () => {
		const deleted = `${COMMON}/1793553583762-Deleted.ts`;

		expect(await rule.analyze(context([deleted]))).toEqual([]);
	});

	it('ignores files that are not migrations', async () => {
		const files = [
			'packages/@n8n/db/src/migrations/postgresdb/index.ts',
			'packages/cli/src/server.ts',
		];
		for (const file of files) write(file, 'changed\n');

		const violations = await rule.analyze(context(files));

		expect(violations).toEqual([]);
	});

	it.each(['master', '3.x', 'bundle/2.x', undefined])(
		'does nothing when the base branch is %s',
		async (baseBranch) => {
			write(MIGRATION, 'changed\n');

			expect(await rule.analyze(context([MIGRATION], { baseBranch }))).toEqual([]);
		},
	);

	it.each(['release/3.4.0', '1.x', 'refs/heads/release-candidate/2.50.x'])(
		'checks the release branch %s',
		async (baseBranch) => {
			write(MIGRATION, 'changed\n');

			expect(await rule.analyze(context([MIGRATION], { baseBranch }))).toHaveLength(1);
		},
	);

	it('fails when no master ref is set', async () => {
		const violations = await rule.analyze(context([MIGRATION], { masterRef: undefined }));

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('CODE_HEALTH_MASTER_REF');
	});

	it('fails when the master ref is not available', async () => {
		const violations = await rule.analyze(context([MIGRATION], { masterRef: 'origin/master' }));

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('CODE_HEALTH_MASTER_REF');
	});
});
