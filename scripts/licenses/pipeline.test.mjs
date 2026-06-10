import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, readFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// End-to-end test of the release-blocking license chain: enrich-sbom feeds
// check-sbom-licenses, driven as real CLIs (main(), arg parsing, exit codes,
// file I/O, one stage consuming the previous stage's output file) against a
// committed fixture captured from real cdxgen output. It catches what the
// per-stage unit tests can't: a regressed exit code or a cdxgen output-shape
// change that makes a downstream stage mis-parse. (render-licenses-md is a
// full-closure renderer covered end-to-end by its own suite; it intentionally
// rejects a subset fixture via its unused-override check, so it's excluded here.)

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(scriptDir, '__fixtures__', 'sample.cdx.json');
const ENRICH = path.join(scriptDir, 'enrich-sbom.mjs');
const CHECK = path.join(scriptDir, 'check-sbom-licenses.mjs');
const ALLOW_REFS = [
	'--allow-ref=LicenseRef-n8n-sustainable-use',
	'--allow-ref=LicenseRef-n8n-enterprise',
];

const run = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf-8' });

describe('license-generation chain (real CLIs end-to-end)', () => {
	let dir, raw, enriched;
	before(async () => {
		dir = await mkdtemp(path.join(os.tmpdir(), 'lic-chain-'));
		raw = path.join(dir, 'sbom.cdx.json');
		enriched = path.join(dir, 'enriched.cdx.json');
		await copyFile(FIXTURE, raw);
	});
	after(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('rejects the raw (un-enriched) SBOM at the gate (exit 1)', () => {
		const r = run(CHECK, [raw, ...ALLOW_REFS]);
		assert.equal(r.status, 1, r.stderr);
		assert.match(r.stderr, /binascii/); // empty-license component is named
	});

	it('enriches the SBOM (exit 0) and writes valid JSON resolving every path', async () => {
		// --lenient-config: the fixture is a representative subset, so overrides for
		// packages not in it are expected-absent, not stale pins (same as an image scan).
		const r = run(ENRICH, [raw, enriched, '--lenient-config']);
		assert.equal(r.status, 0, r.stderr);

		const sbom = JSON.parse(await readFile(enriched, 'utf-8'));
		const byPurl = Object.fromEntries(sbom.components.map((c) => [c.purl, c]));
		// override applied
		assert.equal(byPurl['pkg:npm/binascii@0.0.2'].licenses[0].license.id, 'MIT');
		// first-party -> LicenseRef
		assert.equal(
			byPurl['pkg:npm/%40n8n/db@1.25.0'].licenses[0].license.name,
			'LicenseRef-n8n-sustainable-use',
		);
		// first-party published under a real OSI license -> kept (read from source package.json)
		assert.equal(byPurl['pkg:npm/%40n8n/tournament@1.2.0'].licenses[0].license.id, 'Apache-2.0');
		// dual-license election recorded
		const elected = byPurl['pkg:npm/jszip@3.10.1'].properties.find(
			(p) => p.name === 'cdx:license:elected',
		);
		assert.equal(elected.value, 'MIT');
	});

	it('passes the gate on the enriched SBOM (exit 0, dual-license warning only)', () => {
		const r = run(CHECK, [enriched, ...ALLOW_REFS]);
		assert.equal(r.status, 0, r.stderr);
		assert.match(r.stderr, /jszip/); // surfaced as a dual-license warning, not a failure
	});
});
