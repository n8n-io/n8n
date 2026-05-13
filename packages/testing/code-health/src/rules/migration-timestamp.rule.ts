import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import fg from 'fast-glob';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';

const DEFAULT_MIGRATION_GLOBS = [
	'packages/@n8n/db/src/migrations/common/*.ts',
	'packages/@n8n/db/src/migrations/postgresdb/*.ts',
	'packages/@n8n/db/src/migrations/sqlite/*.ts',
];

const MIGRATION_FILENAME = /^(\d{10,16})-.+\.ts$/;

export class MigrationTimestampRule extends BaseRule<CodeHealthContext> {
	readonly id = 'migration-timestamp';
	readonly name = 'Migration Timestamp Hygiene';
	readonly description =
		'Migration filenames must be prefixed with a Date.now() value from the past — not a future timestamp.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir } = context;
		const options = this.getOptions();

		const globs = Array.isArray(options.migrationGlobs)
			? (options.migrationGlobs as string[])
			: DEFAULT_MIGRATION_GLOBS;
		const now = typeof options.now === 'number' ? options.now : Date.now();

		const files = await fg(globs, { cwd: rootDir, absolute: true });

		const violations: Violation[] = [];
		for (const filePath of files) {
			const fileName = path.basename(filePath);
			const match = MIGRATION_FILENAME.exec(fileName);
			if (!match) continue;

			const timestamp = Number(match[1]);
			if (!Number.isFinite(timestamp)) continue;
			if (timestamp <= now) continue;

			violations.push(
				this.createViolation(
					filePath,
					1,
					1,
					`${fileName} is prefixed with a future timestamp (${timestamp}, ${formatDelta(timestamp - now)} ahead of now). Migration prefixes must be the exact Date.now() value at the time of creation — AI agents commonly fabricate future timestamps.`,
					"Rename the file using the current millisecond timestamp from Date.now() (or 'date +%s%3N').",
				),
			);
		}

		return violations;
	}
}

function formatDelta(ms: number): string {
	const abs = Math.abs(ms);
	const days = Math.floor(abs / 86_400_000);
	if (days >= 1) return `~${days}d`;
	const hours = Math.floor(abs / 3_600_000);
	if (hours >= 1) return `~${hours}h`;
	const minutes = Math.floor(abs / 60_000);
	return `~${minutes}m`;
}
