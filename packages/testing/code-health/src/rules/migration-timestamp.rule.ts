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

const MIGRATION_FILENAME = /^(\d{10,16})-(.+\.ts)$/;

// Window above the ordering floor in which a new migration timestamp is
// permitted. 1 second of headroom = 1000 unique slots — plenty for any
// single PR adding multiple migrations 1ms apart, while still rejecting
// timestamps that jump days/months into the future.
const CEILING_BUFFER_MS = 1000;

interface ParsedMigration {
	filePath: string;
	relativePath: string;
	fileName: string;
	timestamp: number;
	// Slot key groups dialect-override pairs (same timestamp + suffix across
	// common/ and a dialect dir) into one logical ordering slot.
	slotKey: string;
}

export class MigrationTimestampRule extends BaseRule<CodeHealthContext> {
	readonly id = 'migration-timestamp';
	readonly name = 'Migration Timestamp Hygiene';
	readonly description =
		'Migration filenames must use a Date.now() timestamp that orders strictly after every existing migration and is not fabricated far in the future.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir, changedFiles } = context;
		const options = this.getOptions();

		const globs = Array.isArray(options.migrationGlobs)
			? (options.migrationGlobs as string[])
			: DEFAULT_MIGRATION_GLOBS;
		const now = typeof options.now === 'number' ? options.now : Date.now();
		const ceilingBuffer =
			typeof options.ceilingBufferMs === 'number' ? options.ceilingBufferMs : CEILING_BUFFER_MS;

		const files = await fg(globs, { cwd: rootDir, absolute: true });

		const parsed: ParsedMigration[] = [];
		for (const filePath of files) {
			const fileName = path.basename(filePath);
			const match = MIGRATION_FILENAME.exec(fileName);
			if (!match) continue;
			const timestamp = Number(match[1]);
			if (!Number.isFinite(timestamp)) continue;
			const suffix = match[2];
			parsed.push({
				filePath,
				relativePath: path.relative(rootDir, filePath),
				fileName,
				timestamp,
				slotKey: `${timestamp}-${suffix}`,
			});
		}

		// changedFilesSet is the universe of migrations that should be
		// subject to the ordering check. When CI passes the set of files
		// touched in this PR, we scope ordering to migrations within that
		// set; historical migrations don't get flagged for "being below the
		// current max." When the set is absent (local dev, or workflows
		// that don't supply it), we don't run the ordering check at all —
		// the future-jump check still applies globally and is the primary
		// backstop.
		const changedFilesSet =
			changedFiles && changedFiles.length > 0
				? new Set(changedFiles.map((p) => path.normalize(p)))
				: undefined;

		// Dedupe to ordering slots: a `common/<ts>-<name>.ts` paired with a
		// `postgresdb|sqlite/<ts>-<name>.ts` override is one logical migration
		// (same TypeORM class name, only one runs per dialect) and occupies a
		// single slot. Two files at the same timestamp with *different*
		// suffixes remain distinct slots and still trip ordering.
		const slotByKey = new Map<string, { timestamp: number; slotKey: string }>();
		for (const m of parsed) {
			if (!slotByKey.has(m.slotKey)) {
				slotByKey.set(m.slotKey, { timestamp: m.timestamp, slotKey: m.slotKey });
			}
		}
		const slotsDesc = Array.from(slotByKey.values()).sort((a, b) => {
			if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
			return a.slotKey.localeCompare(b.slotKey);
		});
		const globalMaxSlot = slotsDesc[0];
		const secondMaxSlot = slotsDesc[1];
		const globalMax = globalMaxSlot?.timestamp ?? 0;
		const secondMax = secondMaxSlot?.timestamp ?? 0;

		const violations: Violation[] = [];
		for (const migration of parsed) {
			const { filePath, relativePath, fileName, timestamp, slotKey } = migration;
			const isHeadSlot = globalMaxSlot?.slotKey === slotKey;
			const floor = isHeadSlot ? secondMax : globalMax;
			const ceiling = Math.max(now, floor + ceilingBuffer);

			const isChanged = changedFilesSet?.has(path.normalize(relativePath)) ?? false;

			if (changedFilesSet && isChanged && timestamp <= floor) {
				violations.push(
					this.createViolation(
						filePath,
						1,
						1,
						`${fileName} (${timestamp}) is at or below the highest existing migration timestamp (${floor}). New migrations must be strictly ordered — pick a timestamp greater than ${floor}.`,
						`Rename the file using a timestamp greater than ${floor} (e.g. ${floor + 1}).`,
					),
				);
				continue;
			}

			if (timestamp > ceiling) {
				violations.push(
					this.createViolation(
						filePath,
						1,
						1,
						`${fileName} is prefixed with a future timestamp (${timestamp}). Migration prefixes must reflect Date.now() at creation — AI agents commonly fabricate future timestamps.`,
						`Rename the file using a timestamp between ${floor + 1} and ${ceiling} (use Date.now() once it exceeds ${floor}).`,
					),
				);
			}
		}

		return violations;
	}
}
