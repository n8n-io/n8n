import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { parseLedgerBody, readLedger } from './ledger.mjs';

const body = (rows) => JSON.stringify({ ledger: rows });

// A multi-package fixture store: rows for three onboarded vitest packages
// sit side-by-side. Shape mirrors what a read-all reader webhook would
// return when no `?package=` filter is applied.
const MULTI_PKG_FIXTURE = [
	{
		source_file_path: 'packages/workflow/src/a.ts',
		package: 'n8n-workflow',
		status: 'red',
		last_score: 30,
		last_checked_at: '2026-05-01T00:00:00.000Z',
	},
	{
		source_file_path: 'packages/workflow/src/b.ts',
		package: 'n8n-workflow',
		status: 'green',
		last_score: 95,
		last_checked_at: '2026-06-01T00:00:00.000Z',
	},
	{
		source_file_path: 'packages/@n8n/crdt/src/x.ts',
		package: '@n8n/crdt',
		status: 'red',
		last_score: 40,
		last_checked_at: '2026-05-15T00:00:00.000Z',
	},
	{
		source_file_path: 'packages/@n8n/decorators/src/y.ts',
		package: '@n8n/decorators',
		status: 'green',
		last_score: 85,
		last_checked_at: '2026-06-10T00:00:00.000Z',
	},
];

describe('parseLedgerBody', () => {
	it('treats an empty body as a zero-row ledger', () => {
		assert.deepEqual(parseLedgerBody(''), { rows: [] });
		assert.deepEqual(parseLedgerBody('   '), { rows: [] });
	});

	it('treats `{"ledger":[]}` as a zero-row ledger', () => {
		assert.deepEqual(parseLedgerBody('{"ledger":[]}'), { rows: [] });
	});

	it('throws on a payload missing the `ledger` array', () => {
		assert.throws(() => parseLedgerBody('{}'), /missing `ledger` array/);
		assert.throws(() => parseLedgerBody('{"ledger":"oops"}'), /missing `ledger` array/);
		assert.throws(() => parseLedgerBody('null'), /missing `ledger` array/);
	});

	it('lets malformed JSON throw via JSON.parse', () => {
		assert.throws(() => parseLedgerBody('not json'), SyntaxError);
	});
});

// PR-gate contract from DEVP-495:
//   "multi-package fixture store returns all rows in one call"
//
// The fixture holds rows for three packages. A single call must return
// every row, with no per-package invocation at the call site.
describe('read-all contract (DEVP-495 PR gate)', () => {
	it('returns every row across every package in one call (no filter)', () => {
		const { rows } = parseLedgerBody(body(MULTI_PKG_FIXTURE));
		assert.equal(rows.length, MULTI_PKG_FIXTURE.length);
		assert.deepEqual([...new Set(rows.map((r) => r.package))].sort(), [
			'@n8n/crdt',
			'@n8n/decorators',
			'n8n-workflow',
		]);
	});

	it('preserves row order from the underlying store', () => {
		const { rows } = parseLedgerBody(body(MULTI_PKG_FIXTURE));
		assert.deepEqual(
			rows.map((r) => r.source_file_path),
			MULTI_PKG_FIXTURE.map((r) => r.source_file_path),
		);
	});

	it('narrows to one package without re-reading when `pkg` is supplied', () => {
		const { rows } = parseLedgerBody(body(MULTI_PKG_FIXTURE), { pkg: 'n8n-workflow' });
		assert.equal(rows.length, 2);
		assert.ok(rows.every((r) => r.package === 'n8n-workflow'));
	});

	it('returns an empty set when narrowing to a package with no rows', () => {
		const { rows } = parseLedgerBody(body(MULTI_PKG_FIXTURE), { pkg: 'n8n-nonesuch' });
		assert.deepEqual(rows, []);
	});

	it('drops rows missing a `package` field when narrowing', () => {
		const { rows } = parseLedgerBody(
			body([...MULTI_PKG_FIXTURE, { source_file_path: 'stray.ts' }]),
			{ pkg: 'n8n-workflow' },
		);
		assert.equal(rows.length, 2);
		assert.ok(rows.every((r) => r.package === 'n8n-workflow'));
	});
});

describe('readLedger (file I/O)', () => {
	const tmp = mkdtempSync(path.join(tmpdir(), 'mh-ledger-'));

	it('reads a multi-package fixture file and returns every row in one pass', async () => {
		const file = path.join(tmp, 'multi.json');
		writeFileSync(file, body(MULTI_PKG_FIXTURE));
		const { rows } = await readLedger({ path: file });
		assert.equal(rows.length, MULTI_PKG_FIXTURE.length);
	});

	it('reads an empty-body file as a zero-row ledger (reader-webhook contract for unscored packages)', async () => {
		const file = path.join(tmp, 'empty.json');
		writeFileSync(file, '');
		const { rows } = await readLedger({ path: file });
		assert.deepEqual(rows, []);
	});

	it('filters to a single package on top of the single-pass read', async () => {
		const file = path.join(tmp, 'filtered.json');
		writeFileSync(file, body(MULTI_PKG_FIXTURE));
		const { rows } = await readLedger({ path: file, pkg: '@n8n/crdt' });
		assert.equal(rows.length, 1);
		assert.equal(rows[0].package, '@n8n/crdt');
	});

	it('requires a `path`', async () => {
		await assert.rejects(readLedger(), /requires a `path`/);
		await assert.rejects(readLedger({}), /requires a `path`/);
	});
});
