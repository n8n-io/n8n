import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
	enrichComponent,
	enrichSbom,
	buildFirstPartyOsiMap,
	isPhantomNpm,
	FIRST_PARTY_LICENSE_REF,
	ELECTED_PROPERTY,
} from './enrich-sbom.mjs';
import { loadSpdxIds, checkSbom } from './check-sbom-licenses.mjs';

const LICENSE_TEXT = '# n8n Sustainable Use License\n\nfull text here';
const ctx = (over = {}) => ({
	overrides: {},
	elections: {},
	licenseText: LICENSE_TEXT,
	firstPartyOsi: new Map(),
	matchedOverrides: new Set(),
	matchedElections: new Set(),
	...over,
});

describe('enrichComponent', () => {
	it('stamps a first-party package with the LicenseRef and embeds the license text', () => {
		const out = enrichComponent(
			{ name: 'db', group: '@n8n', purl: 'pkg:npm/%40n8n/db@1.0.0' },
			ctx(),
		);
		assert.equal(out.licenses[0].license.name, FIRST_PARTY_LICENSE_REF);
		assert.equal(out.licenses[0].license.text.content, LICENSE_TEXT);
		assert.equal(out.licenses[0].license.text.contentType, 'text/markdown');
	});

	it('keeps a first-party package on its real OSI license when source declares one', () => {
		const firstPartyOsi = new Map([['@n8n/tournament', 'Apache-2.0']]);
		const out = enrichComponent(
			{ name: 'tournament', group: '@n8n', purl: 'pkg:npm/%40n8n/tournament@1.0.0' },
			ctx({ firstPartyOsi }),
		);
		assert.deepEqual(out.licenses, [{ license: { id: 'Apache-2.0' } }]);
	});

	it('applies an override and does not leak the internal disk-text flag', () => {
		const overrides = { 'pkg:npm/duck@0.1.12': { license: 'BSD-2-Clause' } };
		const out = enrichComponent({ name: 'duck', purl: 'pkg:npm/duck@0.1.12' }, ctx({ overrides }));
		assert.deepEqual(out.licenses, [{ license: { id: 'BSD-2-Clause' } }]);
		assert.equal('_overrideSkipDiskText' in out, false);
	});

	it('records a dual-license election as a property without rewriting the expression', () => {
		const elections = { 'pkg:npm/jszip@3.10.1': { elected: 'MIT' } };
		const out = enrichComponent(
			{
				name: 'jszip',
				purl: 'pkg:npm/jszip@3.10.1',
				licenses: [{ expression: '(MIT OR GPL-3.0-or-later)' }],
			},
			ctx({ elections }),
		);
		assert.deepEqual(out.licenses, [{ expression: '(MIT OR GPL-3.0-or-later)' }]);
		const elected = out.properties.find((p) => p.name === ELECTED_PROPERTY);
		assert.equal(elected.value, 'MIT');
	});

	it('leaves a third-party component with a valid license untouched', () => {
		const input = {
			name: 'lodash',
			purl: 'pkg:npm/lodash@4.0.0',
			licenses: [{ license: { id: 'MIT' } }],
		};
		const out = enrichComponent(input, ctx());
		assert.deepEqual(out.licenses, input.licenses);
	});
});

describe('enrichSbom stale-config detection', () => {
	it('reports an override PURL that matches no component', () => {
		const sbom = {
			components: [{ name: 'a', purl: 'pkg:npm/a@1', licenses: [{ license: { id: 'MIT' } }] }],
		};
		const { staleOverrides } = enrichSbom(sbom, {
			overrides: { 'pkg:npm/gone@9': { license: 'MIT' } },
			elections: {},
			licenseText: LICENSE_TEXT,
		});
		assert.deepEqual(staleOverrides, ['pkg:npm/gone@9']);
	});

	it('reports an election PURL that matches no component', () => {
		const sbom = { components: [] };
		const { staleElections } = enrichSbom(sbom, {
			overrides: {},
			elections: { 'pkg:npm/gone@9': { elected: 'MIT' } },
			licenseText: LICENSE_TEXT,
		});
		assert.deepEqual(staleElections, ['pkg:npm/gone@9']);
	});
});

describe('enrich on a container image (OS + npm subset)', () => {
	it('passes OS packages through untouched and still enriches npm', () => {
		const sbom = {
			components: [
				{
					name: 'busybox',
					purl: 'pkg:apk/alpine/busybox@1.36',
					licenses: [{ license: { name: 'GPL-2.0-only' } }],
				},
				{
					name: 'db',
					group: '@n8n',
					purl: 'pkg:npm/%40n8n/db@1.0.0',
					licenses: [{ expression: 'SEE LICENSE IN LICENSE.md' }],
				},
			],
		};
		const { sbom: out } = enrichSbom(sbom, {
			overrides: {},
			elections: {},
			licenseText: LICENSE_TEXT,
		});
		const busybox = out.components.find((c) => c.name === 'busybox');
		const db = out.components.find((c) => c.name === 'db');
		assert.deepEqual(busybox.licenses, [{ license: { name: 'GPL-2.0-only' } }]); // OS untouched
		assert.equal(db.licenses[0].license.name, FIRST_PARTY_LICENSE_REF); // npm first-party stamped
	});

	it('reports unmatched overrides for a partial (per-image) closure without erroring', () => {
		// runners image lacks most npm deps; overrides for absent packages are not stale, just absent.
		const sbom = {
			components: [
				{ name: 'ms', purl: 'pkg:npm/ms@2.1.3', licenses: [{ license: { id: 'MIT' } }] },
			],
		};
		const { staleOverrides } = enrichSbom(sbom, {
			overrides: { 'pkg:npm/binascii@0.0.2': { license: 'MIT' } },
			elections: {},
			licenseText: LICENSE_TEXT,
		});
		// enrichSbom surfaces them; the CLI's --lenient-config decides not to exit non-zero.
		assert.deepEqual(staleOverrides, ['pkg:npm/binascii@0.0.2']);
	});
});

describe('isPhantomNpm (cdxgen image-scan noise)', () => {
	const src = (p) => ({ properties: [{ name: 'SrcFile', value: p }] });

	it('flags versionless npm components (exports subpaths, fixtures)', () => {
		assert.equal(
			isPhantomNpm({ name: 'genai/web', group: '@google', purl: 'pkg:npm/%40google/genai%2Fweb' }),
			true,
		);
		assert.equal(isPhantomNpm({ name: 'false_main', purl: 'pkg:npm/false_main' }), true);
	});

	it('flags versioned components nested inside another package (test/benchmark fixtures)', () => {
		assert.equal(
			isPhantomNpm({
				name: 'tedious-benchmarks',
				version: '1.0.0',
				purl: 'pkg:npm/tedious-benchmarks@1.0.0',
				...src('/x/node_modules/tedious/benchmarks/package.json'),
			}),
			true,
		);
	});

	it('keeps a real package at its canonical node_modules path (e.g. version-drifted ssh2)', () => {
		assert.equal(
			isPhantomNpm({
				name: 'ssh2',
				version: '1.16.0',
				purl: 'pkg:npm/ssh2@1.16.0',
				...src('/x/node_modules/ssh2/package.json'),
			}),
			false,
		);
	});

	it('keeps a real scoped package and never touches non-npm (OS) components', () => {
		assert.equal(
			isPhantomNpm({
				name: 'db',
				group: '@n8n',
				version: '1.0.0',
				purl: 'pkg:npm/%40n8n/db@1.0.0',
				...src('/x/node_modules/@n8n/db/package.json'),
			}),
			false,
		);
		assert.equal(isPhantomNpm({ name: 'busybox', purl: 'pkg:apk/alpine/busybox@1.36' }), false);
	});

	it('keeps a versioned npm component with no SrcFile (cannot prove phantom)', () => {
		assert.equal(
			isPhantomNpm({ name: 'lodash', version: '4.0.0', purl: 'pkg:npm/lodash@4.0.0' }),
			false,
		);
	});
});

describe('enrichSbom dropPhantomNpm + byName', () => {
	it('drops phantoms only when asked and resolves byName regardless of version', () => {
		const sbom = {
			components: [
				{ name: 'genai/web', group: '@google', purl: 'pkg:npm/%40google/genai%2Fweb' }, // phantom
				{
					name: 'ssh2',
					version: '1.16.0',
					purl: 'pkg:npm/ssh2@1.16.0',
					properties: [{ name: 'SrcFile', value: '/x/node_modules/ssh2/package.json' }],
				},
			],
		};
		const byName = { ssh2: { license: 'MIT' } };

		const off = enrichSbom(sbom, {
			overrides: {},
			byName,
			elections: {},
			licenseText: LICENSE_TEXT,
		});
		assert.equal(off.droppedPhantoms, 0);
		assert.equal(off.sbom.components.length, 2);

		const on = enrichSbom(sbom, {
			overrides: {},
			byName,
			elections: {},
			licenseText: LICENSE_TEXT,
			dropPhantomNpm: true,
		});
		assert.equal(on.droppedPhantoms, 1);
		assert.equal(on.sbom.components.length, 1);
		assert.equal(on.sbom.components[0].name, 'ssh2');
		assert.deepEqual(on.sbom.components[0].licenses, [{ license: { id: 'MIT' } }]); // byName, version-agnostic
	});
});

describe('buildFirstPartyOsiMap', () => {
	let dir, spdx;
	before(async () => {
		spdx = await loadSpdxIds();
		dir = await mkdtemp(path.join(os.tmpdir(), 'osi-map-'));
		const write = async (rel, json) => {
			await mkdir(path.join(dir, path.dirname(rel)), { recursive: true });
			await writeFile(path.join(dir, rel), JSON.stringify(json));
		};
		await write('tournament/package.json', { name: '@n8n/tournament', license: 'Apache-2.0' });
		await write('zod/package.json', { name: '@n8n/json-schema-to-zod', license: 'ISC' });
		await write('db/package.json', { name: '@n8n/db', license: 'SEE LICENSE IN LICENSE.md' });
		await write('config/package.json', { name: '@n8n/config' }); // no license field
		await write('node_modules/dep/package.json', { name: 'dep', license: 'MIT' }); // skipped
		await write('cli/dist/template/package.json', { name: '{{placeholder}}', license: 'MIT' }); // skipped
	});
	after(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('maps only first-party packages that declare a real OSI license', async () => {
		const map = await buildFirstPartyOsiMap(dir, spdx);
		assert.equal(map.get('@n8n/tournament'), 'Apache-2.0');
		assert.equal(map.get('@n8n/json-schema-to-zod'), 'ISC');
	});

	it('excludes n8n-license strings, missing fields, node_modules and dist', async () => {
		const map = await buildFirstPartyOsiMap(dir, spdx);
		assert.equal(map.has('@n8n/db'), false);
		assert.equal(map.has('@n8n/config'), false);
		assert.equal(map.has('dep'), false);
		assert.equal(map.has('{{placeholder}}'), false);
	});
});

describe('enrich -> gate round-trip (no unlicensed code survives)', () => {
	it('turns a raw SBOM the gate rejects into one it accepts', async () => {
		const spdx = await loadSpdxIds();
		const allow = new Set([FIRST_PARTY_LICENSE_REF]);

		const raw = {
			components: [
				{ name: 'binascii', purl: 'pkg:npm/binascii@0.0.2' }, // empty -> override
				{ name: 'duck', purl: 'pkg:npm/duck@0.1.12', licenses: [{ license: { name: 'BSD' } }] }, // override
				{
					name: 'db',
					group: '@n8n',
					purl: 'pkg:npm/%40n8n/db@1.0.0',
					licenses: [{ expression: 'SEE LICENSE IN LICENSE.md' }],
				}, // first-party
				{
					name: 'jszip',
					purl: 'pkg:npm/jszip@3.10.1',
					licenses: [{ expression: '(MIT OR GPL-3.0-or-later)' }],
				}, // election
				{ name: 'lodash', purl: 'pkg:npm/lodash@4.0.0', licenses: [{ license: { id: 'MIT' } }] }, // already fine
			],
		};

		// Raw SBOM fails the gate.
		const before = checkSbom(raw, { validIds: spdx, allowRefs: allow });
		assert.ok(
			before.failures.length >= 3,
			'raw SBOM should have multiple unlicensed/non-SPDX failures',
		);

		// Enrich with the same resolution the release pipeline uses.
		const { sbom: enriched } = enrichSbom(raw, {
			overrides: {
				'pkg:npm/binascii@0.0.2': { license: 'MIT' },
				'pkg:npm/duck@0.1.12': { license: 'BSD-2-Clause' },
			},
			elections: { 'pkg:npm/jszip@3.10.1': { elected: 'MIT' } },
			licenseText: LICENSE_TEXT,
		});

		// Enriched SBOM passes the gate, with only the dual-license warning.
		const after = checkSbom(enriched, { validIds: spdx, allowRefs: allow });
		assert.equal(after.failures.length, 0, JSON.stringify(after.failures));
		assert.equal(after.warnings.length, 1);
	});
});
