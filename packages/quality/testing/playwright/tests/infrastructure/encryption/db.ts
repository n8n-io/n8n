import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { CycleContext } from './harness';
import { fail } from './harness';

/**
 * Raw database access for the assertions. sqlite reads the database file on
 * the host (the container home is bind-mounted and host-owned); postgres runs
 * psql inside the postgres container. Both return pipe-separated rows, so the
 * call sites stay backend-agnostic.
 */
export async function dbQuery(ctx: CycleContext, sql: string): Promise<string> {
	if (ctx.backend === 'postgres') {
		const pg = ctx.stack?.serviceResults.postgres?.container;
		if (!pg) return fail('postgres container is not running');
		const result = await pg.exec([
			'psql',
			'-U',
			'n8n_user',
			'-d',
			'n8n_db',
			'-tA',
			'-F|',
			'-c',
			sql,
		]);
		if (result.exitCode !== 0) {
			return fail(`psql failed: ${sql}`, result.output);
		}
		return result.output.trim();
	}

	// The running container writes this file concurrently (WAL mode), so a
	// read can hit SQLITE_BUSY: give sqlite a busy timeout and retry the
	// whole open+read a few times before failing loudly.
	const dbPath = join(ctx.homeDir, '.n8n', 'database.sqlite');
	let lastError: unknown;
	for (let attempt = 0; attempt < 5; attempt++) {
		if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 300));
		let db: DatabaseSync | undefined;
		try {
			db = new DatabaseSync(dbPath, { readOnly: true, timeout: 5000 });
			const rows = db.prepare(sql).all() as Array<Record<string, unknown>>;
			return rows.map((r) => Object.values(r).join('|')).join('\n');
		} catch (error) {
			lastError = error;
		} finally {
			db?.close();
		}
	}
	return fail(`sqlite query failed after retries: ${sql}`, String(lastError));
}
