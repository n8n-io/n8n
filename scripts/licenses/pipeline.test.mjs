import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, readFile, copyFile, writeFile } from 'node:fs/promises';
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
//
// Both fixtures are frozen: the SBOM and the override config it needs are a
// matched pair, so the chain runs strict and no dependency change can break it.
// The *shipped* license-overrides.json is validated by render-licenses-md.test.mjs.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(scriptDir, '__fixtures__', 'sample.cdx.json');
const FIXTURE_OVERRIDES = path.join(scriptDir, '__fixtures__', 'license-overrides.json');
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
		// No --lenient-config: every entry in the fixture config matches a fixture
		// component, so the strict stale-config gate must stay quiet.
		const r = run(ENRICH, [raw, enriched, `--overrides=${FIXTURE_OVERRIDES}`]);
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

	it('fails on a stale override pin (exit 3) unless --lenient-config', async () => {
		const stale = path.join(dir, 'stale-overrides.json');
		await writeFile(
			stale,
			JSON.stringify({ overrides: { 'pkg:npm/not-in-the-sbom@1.0.0': { license: 'MIT' } } }),
		);
		const args = [raw, path.join(dir, 'stale.cdx.json'), `--overrides=${stale}`];

		const strict = run(ENRICH, args);
		assert.equal(strict.status, 3, strict.stderr);
		assert.match(strict.stderr, /not-in-the-sbom/);

		assert.equal(run(ENRICH, [...args, '--lenient-config']).status, 0);
	});
});
