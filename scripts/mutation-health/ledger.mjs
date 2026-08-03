#!/usr/bin/env node
/**
 * Read-all ledger access.
 *
 * One call returns every row in the live BigQuery ledger across every
 * package — call sites no longer need to invoke per package. Per-package
 * behaviour is preserved by passing `pkg`, which narrows the same
 * single-pass read to one package without re-fetching.
 *
 * Accepted body shapes (matching the reader-webhook contract):
 *
 *   ''                          → { rows: [] }
 *   '{"ledger":[]}'             → { rows: [] }
 *   '{"ledger":[ {row}, ... ]}' → { rows: [ {row}, ... ] }
 *
 * The empty-body case mirrors the reader webhook's response for packages
 * it has never scored — the picker must still synthesise `new` rows from
 * the source tree in that situation.
 *
 * Malformed JSON or a missing `ledger` array throw, leaving the caller
 * to decide whether to die or fall back.
 */

import { readFile } from 'node:fs/promises';

/**
 * Pure parser. Used directly by tests and via the `readLedger` wrapper.
 */
export function parseLedgerBody(raw, { pkg } = {}) {
	const trimmed = typeof raw === 'string' ? raw.trim() : '';
	const payload = trimmed === '' ? { ledger: [] } : JSON.parse(trimmed);
	if (!payload || !Array.isArray(payload.ledger)) {
		throw new Error('Ledger payload missing `ledger` array.');
	}
	const all = payload.ledger;
	if (pkg === undefined) return { rows: all };
	return { rows: all.filter((r) => r && r.package === pkg) };
}

/**
 * Read the ledger file and return all rows in one pass. With `pkg`, the
 * same single read is narrowed to one package — existing per-package call
 * sites stay structurally identical, the pipeline can later switch to a
 * single fetch shared across packages without touching the call site.
 */
export async function readLedger({ path, pkg } = {}) {
	if (!path) throw new TypeError('readLedger requires a `path`');
	const raw = await readFile(path, 'utf8');
	return parseLedgerBody(raw, { pkg });
}
