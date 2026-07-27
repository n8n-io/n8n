import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	loadSpdxIds,
	validateExpression,
	validateComponentLicenses,
	checkSbom,
	isCopyleft,
} from './check-sbom-licenses.mjs';
import {
	loadLicenseConfig,
	buildFirstPartyOsiMap,
	enrichSbom,
	isPhantomNpm,
	FIRST_PARTY_LICENSE_REF,
} from './enrich-sbom.mjs';
import { isFirstParty } from './render-licenses-md.mjs';

// Property + metamorphic suite. The example suites pin the cases we imagined;
// these assert the *rules* across enumerated domains, and the enrich<->gate
// pairing is the oracle: enrich's job is precisely to produce an SBOM the gate
// accepts, so "enrich then gate passes" pins both without a hand-written answer.
// (Deterministic generators — fast-check is not yet vendored in this repo.)

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = path.resolve(HERE, '..', '..', 'packages');
const ALLOW = new Set([FIRST_PARTY_LICENSE_REF]);
const NPM = ['pkg:npm/'];

const powerset = (arr) =>
	Array.from({ length: 1 << arr.length }, (_, m) => arr.filter((_, i) => m & (1 << i)));

let spdxIds, overrides, byName, elections, firstPartyOsi;
const cfg = () => ({
	overrides,
	byName,
	elections,
	licenseText: 'n8n Sustainable Use License text',
	firstPartyOsi,
	dropPhantomNpm: true,
});

before(async () => {
	spdxIds = await loadSpdxIds();
	({ overrides, byName, elections } = await loadLicenseConfig());
	firstPartyOsi = await buildFirstPartyOsiMap(PACKAGES_DIR, spdxIds);
});

describe('check — properties', () => {
	it('EVERY-VENDORED-ID-VALIDATES: the validator accepts every id the loader returns', () => {
		// Guards the validator against the list: a validator that rejects a listed
		// id (e.g. a stripPlus/case regression) is caught. NOTE this is circular
		// w.r.t. the loader (both sides come from loadSpdxIds) — list integrity is
		// pinned independently by SPDX-LIST-INTEGRITY below.
		for (const id of spdxIds) {
			assert.equal(
				validateComponentLicenses({ licenses: [{ license: { id } }] }, spdxIds, ALLOW).ok,
				true,
				id,
			);
		}
	});

	it('SPDX-LIST-INTEGRITY: the loader returns the full vendored list (independent of the loader)', () => {
		// Independent oracle: read the file directly and use its self-recorded
		// _count. A loader that silently truncates (slice/cap) is caught because
		// this side does not go through loadSpdxIds.
		const raw = JSON.parse(readFileSync(path.join(HERE, 'spdx-license-ids.json'), 'utf-8'));
		assert.equal(raw.licenseIds.length, raw._count);
		assert.equal(spdxIds.size, raw._count);
	});

	it('OR-PERMUTATION-INVARIANT: operand order never changes OR-expression validity', () => {
		const ids = ['MIT', 'Apache-2.0', 'NOPE-1.0', 'ISC'];
		for (const a of ids)
			for (const b of ids) {
				const ab = validateExpression(`(${a} OR ${b})`, spdxIds, ALLOW).valid;
				const ba = validateExpression(`(${b} OR ${a})`, spdxIds, ALLOW).valid;
				assert.equal(ab, ba, `${a} OR ${b}`);
			}
	});

	it('AND-PERMUTATION-INVARIANT: operand order never changes AND-expression validity', () => {
		const ids = ['MIT', 'BSD-3-Clause', 'BOGUS', 'Zlib'];
		for (const a of ids)
			for (const b of ids) {
				assert.equal(
					validateExpression(`${a} AND ${b}`, spdxIds, ALLOW).valid,
					validateExpression(`${b} AND ${a}`, spdxIds, ALLOW).valid,
					`${a} AND ${b}`,
				);
			}
	});

	it('PAREN-WRAP-INVARIANT: wrapping an expression in parens preserves validity', () => {
		for (const expr of ['MIT', '(MIT OR Apache-2.0)', 'MIT AND ISC', 'NOPE', '(MIT OR BOGUS)']) {
			assert.equal(
				validateExpression(expr, spdxIds, ALLOW).valid,
				validateExpression(`(${expr})`, spdxIds, ALLOW).valid,
				expr,
			);
		}
	});

	it('COPYLEFT-OR-SYMMETRIC: a copyleft alternative is detected regardless of operand order', () => {
		for (const c of ['GPL-3.0-or-later', 'AGPL-3.0', 'EUPL-1.1']) {
			assert.equal(validateExpression(`(MIT OR ${c})`, spdxIds, ALLOW).hasCopyleftOr, true, c);
			assert.equal(validateExpression(`(${c} OR MIT)`, spdxIds, ALLOW).hasCopyleftOr, true, c);
		}
		assert.equal(isCopyleft('MIT'), false);
	});
});

// A spread of component classes the pipeline must be able to resolve. Built so
// every subset (powerset below) is fully resolvable — the enrich<->gate oracle.
const RESOLVABLE = [
	{
		group: '@n8n',
		name: 'db',
		version: '1.0.0',
		purl: 'pkg:npm/%40n8n/db@1.0.0',
		licenses: [{ expression: 'SEE LICENSE IN LICENSE.md' }],
	}, // first-party ref
	{ group: '@n8n', name: 'tournament', version: '9.9.9', purl: 'pkg:npm/%40n8n/tournament@9.9.9' }, // first-party OSI (Apache-2.0)
	{ name: 'binascii', version: '0.0.2', purl: 'pkg:npm/binascii@0.0.2' }, // purl-pinned override
	{
		name: 'ssh2',
		version: '9.9.9',
		purl: 'pkg:npm/ssh2@9.9.9',
		properties: [{ name: 'SrcFile', value: '/x/node_modules/ssh2/package.json' }],
	}, // byName (version drift)
	{ name: 'false_main', purl: 'pkg:npm/false_main' }, // phantom -> dropped
	{
		name: 'lodash',
		version: '4.0.0',
		purl: 'pkg:npm/lodash@4.0.0',
		licenses: [{ license: { id: 'MIT' } }],
	}, // already valid
	{
		name: 'busybox',
		purl: 'pkg:apk/alpine/busybox@1',
		licenses: [{ license: { name: 'custom' } }],
	}, // OS -> not gated
	{
		name: 'jszip',
		version: '3.10.1',
		purl: 'pkg:npm/jszip@3.10.1',
		licenses: [{ expression: '(MIT OR GPL-3.0-or-later)' }],
	}, // dual -> election
];

describe('enrich — properties', () => {
	it('ENRICH-THEN-GATE-PASSES: every subset of resolvable components survives enrich -> gate', () => {
		// The oracle pairing. 2^8 = 256 generated SBOMs; after enrichment none may
		// fail the npm gate (warnings — e.g. jszip's dual license — are allowed).
		for (const components of powerset(RESOLVABLE)) {
			const { sbom } = enrichSbom({ components }, cfg());
			const { failures } = checkSbom(sbom, {
				validIds: spdxIds,
				allowRefs: ALLOW,
				enforcePrefixes: NPM,
			});
			assert.equal(
				failures.length,
				0,
				JSON.stringify({ in: components.map((c) => c.name), failures }),
			);
		}
	});

	it('ENRICH-IDEMPOTENT: enriching an already-enriched SBOM changes nothing', () => {
		for (const components of powerset(RESOLVABLE).filter((s) => s.length <= 4)) {
			const once = enrichSbom({ components }, cfg()).sbom;
			// Snapshot before re-enriching: a non-idempotent bug that aliases and
			// retroactively mutates `once` must not be able to hide by making both
			// sides equal — compare the second pass to a frozen copy of the first.
			const snapshot = structuredClone(once);
			const twice = enrichSbom(once, cfg()).sbom;
			assert.deepEqual(twice, snapshot, JSON.stringify(components.map((c) => c.name)));
		}
	});

	it('ENRICH-INPUT-UNMUTATED: enrichSbom is pure (never mutates its input)', () => {
		const input = { components: structuredClone(RESOLVABLE) };
		const snapshot = structuredClone(input);
		enrichSbom(input, cfg());
		assert.deepEqual(input, snapshot);
	});

	it('NO-FIRST-PARTY-UNLICENSED: no first-party component is left without a license', () => {
		const { sbom } = enrichSbom({ components: structuredClone(RESOLVABLE) }, cfg());
		for (const c of sbom.components) {
			if (isFirstParty(c.purl)) assert.ok((c.licenses ?? []).length > 0, c.purl);
		}
	});
});

describe('checkSbom — properties', () => {
	const mixed = {
		components: [
			{ name: 'ok', version: '1', purl: 'pkg:npm/ok@1', licenses: [{ license: { id: 'MIT' } }] },
			{ name: 'badnpm', version: '1', purl: 'pkg:npm/badnpm@1' },
			{ name: 'os', version: '1', purl: 'pkg:apk/alpine/os@1' },
		],
	};

	it('ENFORCE-PREFIX-SUBSET: scoping to npm never adds failures vs gating everything', () => {
		const all = checkSbom(mixed, { validIds: spdxIds, allowRefs: ALLOW });
		const npm = checkSbom(mixed, { validIds: spdxIds, allowRefs: ALLOW, enforcePrefixes: NPM });
		const allPurls = new Set(all.failures.map((f) => f.purl));
		assert.ok(npm.failures.every((f) => allPurls.has(f.purl)));
		assert.ok(npm.failures.length <= all.failures.length);
	});

	it('ENFORCED-PLUS-SKIPPED-EQ-TOTAL: the partition is exhaustive', () => {
		const { summary } = checkSbom(mixed, {
			validIds: spdxIds,
			allowRefs: ALLOW,
			enforcePrefixes: NPM,
		});
		assert.equal(summary.enforced + summary.skipped, summary.totalComponents);
	});

	it('GATE-DETERMINISTIC: the same SBOM yields the same verdict every time', () => {
		const a = checkSbom(mixed, { validIds: spdxIds, allowRefs: ALLOW, enforcePrefixes: NPM });
		const b = checkSbom(mixed, { validIds: spdxIds, allowRefs: ALLOW, enforcePrefixes: NPM });
		assert.deepEqual(a, b);
	});
});

describe('isPhantomNpm — properties', () => {
	it('VERSIONLESS-NPM-ALWAYS-PHANTOM', () => {
		for (const purl of ['pkg:npm/x', 'pkg:npm/%40s/y', 'pkg:npm/%40s/y%2Fsub']) {
			assert.equal(isPhantomNpm({ purl, name: 'x' }), true, purl);
		}
	});

	it('CANONICAL-PATH-WITH-VERSION-NEVER-PHANTOM', () => {
		const node = (group, name) => ({
			group,
			name,
			version: '1.0.0',
			purl: `pkg:npm/${name}@1.0.0`,
			properties: [
				{
					name: 'SrcFile',
					value: `/x/node_modules/${group ? group + '/' : ''}${name}/package.json`,
				},
			],
		});
		assert.equal(isPhantomNpm(node('', 'ssh2')), false);
		assert.equal(isPhantomNpm(node('@n8n', 'db')), false);
	});

	it('NON-NPM-NEVER-PHANTOM: OS and other ecosystems are out of scope', () => {
		for (const purl of ['pkg:apk/alpine/busybox@1', 'pkg:deb/debian/libc@2', 'pkg:cargo/x@1']) {
			assert.equal(isPhantomNpm({ purl, name: 'x' }), false, purl);
		}
	});
});
