import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import { MIGRATIONS_ROOT, isReleaseBranch } from './migration-analysis.js';

const MIGRATION_FILE = new RegExp(
	`^${MIGRATIONS_ROOT}/(?:common|postgresdb|sqlite)/\\d{10,16}-[^/]+\\.ts$`,
);

const BACKPORT_DOCS = 'See .github/backport_conventions.md#migrations.';

function toPosix(p: string): string {
	return path.normalize(p).split(path.sep).join('/');
}

function git(rootDir: string, args: string[]): string | undefined {
	try {
		return execFileSync('git', args, {
			cwd: rootDir,
			encoding: 'utf-8',
			stdio: ['ignore', 'pipe', 'ignore'],
			maxBuffer: 16 * 1024 * 1024,
		});
	} catch {
		return undefined;
	}
}

export class MigrationBackportRule extends BaseRule<CodeHealthContext> {
	readonly id = 'migration-backport';
	readonly name = 'Migration Backport';
	readonly description =
		'On a release branch, each migration that the PR adds or changes must be identical to the same file on master.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir, changedFiles, baseBranch, masterRef } = context;
		if (!isReleaseBranch(baseBranch)) return [];

		// A deleted migration has nothing to compare. Instances that ran it keep its record.
		const migrations = (changedFiles ?? [])
			.map(toPosix)
			.filter((file) => MIGRATION_FILE.test(file) && fs.existsSync(path.join(rootDir, file)));
		if (migrations.length === 0) return [];

		if (
			!masterRef ||
			git(rootDir, ['rev-parse', '--verify', '--quiet', `${masterRef}^{commit}`]) === undefined
		) {
			return migrations.map((file) =>
				this.createViolation(
					path.join(rootDir, file),
					1,
					1,
					`Cannot compare ${path.posix.basename(file)} with master: the git ref "${masterRef ?? ''}" is not available. Set CODE_HEALTH_MASTER_REF to a fetched master ref.`,
				),
			);
		}

		const violations: Violation[] = [];
		for (const file of migrations) {
			const fileName = path.posix.basename(file);
			const absolutePath = path.join(rootDir, file);
			const onMaster = git(rootDir, ['show', `${masterRef}:${file}`]);

			if (onMaster === undefined) {
				violations.push(
					this.createViolation(
						absolutePath,
						1,
						1,
						`${fileName} is not on master. A migration that only a release branch has makes the database of that release different from the databases of later versions.`,
						`Merge the migration to master first, then backport it with the same file name and content. ${BACKPORT_DOCS}`,
					),
				);
				continue;
			}

			if (fs.readFileSync(absolutePath, 'utf-8') !== onMaster) {
				violations.push(
					this.createViolation(
						absolutePath,
						1,
						1,
						`${fileName} is different from the same file on master. Instances that run this release record the migration as done and do not run the master version when they upgrade.`,
						`Copy the file from master without changes: git checkout ${masterRef} -- ${file}. ${BACKPORT_DOCS}`,
					),
				);
			}
		}
		return violations;
	}
}
