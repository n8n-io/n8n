import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
	renderSbom,
	qualifiedName,
	isFirstParty,
	licenseKey,
	licenseTextFor,
	copyrightFor,
	applyOverride,
	loadOverrides,
	readLicenseFromDisk,
} from './render-licenses-md.mjs';

const mit = { license: { id: 'MIT' } };

describe('qualifiedName', () => {
	it('includes group for scoped packages', () => {
		assert.equal(qualifiedName({ group: '@smithy', name: 'core' }), '@smithy/core');
	});

	it('returns bare name for unscoped packages', () => {
		assert.equal(qualifiedName({ name: 'busboy' }), 'busboy');
	});

	it('treats empty/missing group as unscoped', () => {
		assert.equal(qualifiedName({ group: '', name: 'busboy' }), 'busboy');
		assert.equal(qualifiedName({ group: undefined, name: 'busboy' }), 'busboy');
	});
});

describe('isFirstParty', () => {
	it('matches n8n scoped packages', () => {
		assert.equal(isFirstParty('pkg:npm/%40n8n/config@2.22.0'), true);
		assert.equal(isFirstParty('pkg:npm/%40n8n_io/license-sdk@2.25.0'), true);
	});

	it('matches unscoped n8n packages', () => {
		assert.equal(isFirstParty('pkg:npm/n8n-workflow@2.23.0'), true);
		assert.equal(isFirstParty('pkg:npm/n8n@2.23.0'), true);
	});

	it('rejects other scoped packages', () => {
		assert.equal(isFirstParty('pkg:npm/%40smithy/core@3.23.12'), false);
		assert.equal(isFirstParty('pkg:npm/busboy@1.6.0'), false);
	});
});

describe('licenseKey', () => {
	it('returns SPDX id from single license', () => {
		assert.equal(licenseKey([mit]), 'MIT');
	});

	it('returns expression when present', () => {
		assert.equal(licenseKey([{ expression: '(MIT OR Apache-2.0)' }]), '(MIT OR Apache-2.0)');
	});

	it('returns null when no licenses', () => {
		assert.equal(licenseKey([]), null);
		assert.equal(licenseKey(null), null);
	});

	it('joins multiple distinct licenses with OR (CycloneDX choice semantics)', () => {
		assert.equal(
			licenseKey([{ license: { id: 'MIT' } }, { license: { id: 'Apache-2.0' } }]),
			'(MIT OR Apache-2.0)',
		);
	});
});

describe('applyOverride', () => {
	it('replaces licenses array when override exists for purl', () => {
		const component = {
			name: 'ssh2',
			version: '1.15.0',
			purl: 'pkg:npm/ssh2@1.15.0',
			licenses: [],
		};
		const overrides = { 'pkg:npm/ssh2@1.15.0': { license: 'MIT' } };
		const result = applyOverride(component, overrides);
		assert.equal(licenseKey(result.licenses), 'MIT');
	});

	it('leaves component untouched when no override matches', () => {
		const component = { purl: 'pkg:npm/other@1.0.0', licenses: [mit] };
		const result = applyOverride(component, {});
		assert.equal(result, component);
	});
});

describe('renderSbom — scope handling (regression)', () => {
	const sbom = {
		components: [
			{ group: '@smithy', name: 'core', version: '3.23.12', purl: 'pkg:npm/%40smithy/core@3.23.12', licenses: [mit] },
			{ group: '@opentelemetry', name: 'core', version: '2.7.1', purl: 'pkg:npm/%40opentelemetry/core@2.7.1', licenses: [mit] },
			{ group: '@aws-sdk', name: 'core', version: '3.808.0', purl: 'pkg:npm/%40aws-sdk/core@3.808.0', licenses: [mit] },
			{ name: 'busboy', version: '1.6.0', purl: 'pkg:npm/busboy@1.6.0', licenses: [mit] },
			{ group: '@n8n', name: 'config', version: '2.22.0', purl: 'pkg:npm/%40n8n/config@2.22.0', licenses: [mit] },
		],
	};

	it('preserves scope in rendered package names', async () => {
		const { markdown } = await renderSbom(sbom, {});
		assert.match(markdown, /^\* @smithy\/core 3\.23\.12$/m);
		assert.match(markdown, /^\* @opentelemetry\/core 2\.7\.1$/m);
		assert.match(markdown, /^\* @aws-sdk\/core 3\.808\.0$/m);
	});

	it('does not emit bare "* core" lines when scoped variants exist', async () => {
		const { markdown } = await renderSbom(sbom, {});
		assert.equal(
			/^\* core\s/m.test(markdown),
			false,
			'bare "* core" line found — scope was stripped',
		);
	});

	it('keeps unscoped packages unscoped', async () => {
		const { markdown } = await renderSbom(sbom, {});
		assert.match(markdown, /^\* busboy 1\.6\.0$/m);
	});

	it('filters first-party @n8n/* packages', async () => {
		const { summary } = await renderSbom(sbom, {});
		assert.equal(summary.skippedFirstParty, 1);
		assert.equal(summary.externalComponents, 4);
	});

	it('reports unresolved components with qualified name', async () => {
		const sbomMissing = {
			components: [
				{ group: '@smithy', name: 'core', version: '1.0.0', purl: 'pkg:npm/%40smithy/core@1.0.0' },
			],
		};
		const { unresolved } = await renderSbom(sbomMissing, {});
		assert.equal(unresolved.length, 1);
		assert.match(unresolved[0], /^@smithy\/core@1\.0\.0\t/);
	});
});

describe('renderSbom — unused override detection', () => {
	it('reports overrides whose PURL did not match any component', async () => {
		const sbom = {
			components: [
				{ name: 'busboy', version: '1.6.0', purl: 'pkg:npm/busboy@1.6.0', licenses: [mit] },
			],
		};
		const overrides = {
			'pkg:npm/busboy@1.6.0': { license: 'MIT' },
			'pkg:npm/ssh2@1.15.0': { license: 'MIT' },
			'pkg:npm/utf7@1.0.2': { license: 'MIT' },
		};

		const { unusedOverrides, summary } = await renderSbom(sbom, overrides);
		assert.deepEqual(unusedOverrides.sort(), [
			'pkg:npm/ssh2@1.15.0',
			'pkg:npm/utf7@1.0.2',
		]);
		assert.equal(summary.unusedOverrides, 2);
	});

	it('reports zero unused overrides when every override matches', async () => {
		const sbom = {
			components: [
				{ name: 'busboy', version: '1.6.0', purl: 'pkg:npm/busboy@1.6.0', licenses: [] },
			],
		};
		const overrides = { 'pkg:npm/busboy@1.6.0': { license: 'MIT' } };
		const { unusedOverrides, summary } = await renderSbom(sbom, overrides);
		assert.deepEqual(unusedOverrides, []);
		assert.equal(summary.unusedOverrides, 0);
	});
});

describe('renderSbom — disk text lookup', () => {
	it('calls readDiskText with rawComponent (not override-mutated)', async () => {
		const sbom = {
			components: [
				{
					group: '@smithy',
					name: 'core',
					version: '1.0.0',
					purl: 'pkg:npm/%40smithy/core@1.0.0',
					licenses: [],
				},
			],
		};
		const overrides = { 'pkg:npm/%40smithy/core@1.0.0': { license: 'MIT' } };

		const seen = [];
		const readDiskText = async (component) => {
			seen.push({ group: component.group, name: component.name });
			return 'MIT TEXT';
		};

		const { markdown } = await renderSbom(sbom, overrides, { readDiskText });
		assert.deepEqual(seen, [{ group: '@smithy', name: 'core' }]);
		assert.match(markdown, /MIT TEXT/);
	});

	it('skips disk text lookup when override sets skipDiskText:true', async () => {
		const sbom = {
			components: [
				{
					name: 'utf7',
					version: '1.0.2',
					purl: 'pkg:npm/utf7@1.0.2',
					licenses: [],
				},
			],
		};
		const overrides = {
			'pkg:npm/utf7@1.0.2': { license: 'BSD-3-Clause', skipDiskText: true },
		};

		let called = false;
		const readDiskText = async () => {
			called = true;
			return 'should not appear';
		};

		const { markdown } = await renderSbom(sbom, overrides, { readDiskText });
		assert.equal(called, false);
		assert.doesNotMatch(markdown, /should not appear/);
	});
});

describe('licenseKey — additional branches', () => {
	it('falls back to license.name when id/expression are absent', () => {
		assert.equal(licenseKey([{ license: { name: 'Custom License' } }]), 'Custom License');
	});

	it('returns null when every entry has no usable field', () => {
		assert.equal(licenseKey([{ license: {} }, { license: { id: null } }]), null);
	});

	it('wraps multi-entry licenses in parens with OR (CycloneDX choice)', () => {
		assert.equal(
			licenseKey([
				{ license: { id: 'MIT' } },
				{ license: { id: 'Apache-2.0' } },
				{ license: { id: 'BSD-3-Clause' } },
			]),
			'(MIT OR Apache-2.0 OR BSD-3-Clause)',
		);
	});
});

describe('licenseTextFor', () => {
	it('returns inline text content from first license entry that has it', () => {
		const text = licenseTextFor([
			{ license: { id: 'MIT' } },
			{ license: { id: 'Apache-2.0', text: { content: 'INLINE APACHE TEXT' } } },
		]);
		assert.equal(text, 'INLINE APACHE TEXT');
	});

	it('returns null when no entry has text', () => {
		assert.equal(licenseTextFor([{ license: { id: 'MIT' } }]), null);
		assert.equal(licenseTextFor([]), null);
		assert.equal(licenseTextFor(null), null);
	});

	it('treats whitespace-only content as missing', () => {
		assert.equal(licenseTextFor([{ license: { text: { content: '   \n\t' } } }]), null);
	});
});

describe('copyrightFor', () => {
	it('returns trimmed copyright string', () => {
		assert.equal(copyrightFor({ copyright: '  Copyright (c) 2024 Foo  ' }), 'Copyright (c) 2024 Foo');
	});

	it('returns null for missing or blank copyright', () => {
		assert.equal(copyrightFor({}), null);
		assert.equal(copyrightFor({ copyright: '   ' }), null);
	});
});

describe('copyright rendering in markdown', () => {
	it('appends trimmed copyright after version, comma-separated', async () => {
		const sbom = {
			components: [
				{
					name: 'busboy',
					version: '1.6.0',
					purl: 'pkg:npm/busboy@1.6.0',
					licenses: [mit],
					copyright: '  Copyright (c) 2024 Foo  ',
				},
			],
		};
		const { markdown } = await renderSbom(sbom, {});
		assert.match(markdown, /^\* busboy 1\.6\.0, Copyright \(c\) 2024 Foo$/m);
	});

	it('omits the trailing comma when copyright is missing', async () => {
		const sbom = {
			components: [
				{ name: 'busboy', version: '1.6.0', purl: 'pkg:npm/busboy@1.6.0', licenses: [mit] },
			],
		};
		const { markdown } = await renderSbom(sbom, {});
		assert.match(markdown, /^\* busboy 1\.6\.0$/m);
	});
});

describe('applyOverride — additional branches', () => {
	it('overwrites an existing (wrong) license declaration', () => {
		const component = {
			purl: 'pkg:npm/utf7@1.0.2',
			licenses: [{ license: { id: 'BSD-3-Clause' } }],
		};
		const overrides = { 'pkg:npm/utf7@1.0.2': { license: 'MIT' } };
		const result = applyOverride(component, overrides);
		assert.equal(licenseKey(result.licenses), 'MIT');
	});

	it('records matched keys when matchedKeys set is provided', () => {
		const component = { purl: 'pkg:npm/x@1', licenses: [] };
		const overrides = { 'pkg:npm/x@1': { license: 'MIT' } };
		const matched = new Set();
		applyOverride(component, overrides, matched);
		assert.ok(matched.has('pkg:npm/x@1'));
	});
});

describe('renderSbom — edge cases', () => {
	it('handles SBOM with missing components key', async () => {
		const { summary, markdown } = await renderSbom({}, {});
		assert.equal(summary.totalComponents, 0);
		assert.equal(summary.externalComponents, 0);
		assert.equal(summary.unresolved, 0);
		assert.match(markdown, /^# Third-Party Licenses/);
	});

	it('handles SBOM with empty components array', async () => {
		const { summary } = await renderSbom({ components: [] }, {});
		assert.equal(summary.totalComponents, 0);
		assert.equal(summary.externalComponents, 0);
	});

	it('reports unresolved when license entries have no usable fields', async () => {
		const sbom = {
			components: [
				{
					name: 'mystery',
					version: '1.0.0',
					purl: 'pkg:npm/mystery@1.0.0',
					licenses: [{ license: {} }],
				},
			],
		};
		const { unresolved, summary } = await renderSbom(sbom, {});
		assert.equal(summary.unresolved, 1);
		assert.match(unresolved[0], /^mystery@1\.0\.0\t/);
	});

	it('all documented overrides resolve to zero unresolved (end-to-end)', async () => {
		const purls = [
			'pkg:npm/%40ewoudenberg/difflib@0.1.0',
			'pkg:npm/binascii@0.0.2',
			'pkg:npm/busboy@1.6.0',
			'pkg:npm/imap@0.8.19',
			'pkg:npm/js-nacl@1.4.0',
			'pkg:npm/seq-queue@0.0.5',
			'pkg:npm/streamsearch@1.1.0',
			'pkg:npm/utf7@1.0.2',
			'pkg:npm/nub@0.0.0',
			'pkg:npm/xml-escape@1.1.0',
			'pkg:npm/duck@0.1.12',
		];
		const sbom = {
			components: purls.map((purl) => {
				const m = purl.match(/^pkg:npm\/(?:%40([^/]+)\/)?([^@]+)@(.+)$/);
				return {
					group: m[1] ? `@${m[1]}` : undefined,
					name: m[2],
					version: m[3],
					purl,
					licenses: [],
				};
			}),
		};

		const overridesModule = await loadOverrides();
		const { summary, unresolved, unusedOverrides } = await renderSbom(sbom, overridesModule);
		assert.equal(unresolved.length, 0, `unresolved: ${unresolved.join(', ')}`);
		assert.equal(summary.unresolved, 0);
		assert.equal(unusedOverrides.length, 0, `unused: ${unusedOverrides.join(', ')}`);
	});
});

describe('loadOverrides', () => {
	it('loads and parses license-overrides.json (happy path)', async () => {
		const overrides = await loadOverrides();
		assert.ok(typeof overrides === 'object' && overrides !== null);
		assert.ok(overrides['pkg:npm/busboy@1.6.0'], 'expected busboy override entry');
		assert.equal(overrides['pkg:npm/busboy@1.6.0'].license, 'MIT');
	});
});

describe('readLicenseFromDisk', () => {
	let tmpRoot;
	before(async () => {
		tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'license-disk-'));
	});
	after(async () => {
		if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true });
	});

	it('reads LICENSE file when present', async () => {
		const pkgDir = path.join(tmpRoot, 'pkga');
		await mkdir(pkgDir, { recursive: true });
		await writeFile(path.join(pkgDir, 'LICENSE'), 'PKGA LICENSE TEXT');
		const text = await readLicenseFromDisk(tmpRoot, { name: 'pkga' });
		assert.equal(text, 'PKGA LICENSE TEXT');
	});

	it('reads LICENSE for scoped package using group/name', async () => {
		const pkgDir = path.join(tmpRoot, '@scope', 'pkgb');
		await mkdir(pkgDir, { recursive: true });
		await writeFile(path.join(pkgDir, 'LICENSE.md'), 'SCOPED PKGB TEXT');
		const text = await readLicenseFromDisk(tmpRoot, { group: '@scope', name: 'pkgb' });
		assert.equal(text, 'SCOPED PKGB TEXT');
	});

	it('falls through README/CHANGELOG/package.json filenames', async () => {
		const pkgDir = path.join(tmpRoot, 'pkgc');
		await mkdir(pkgDir, { recursive: true });
		await writeFile(path.join(pkgDir, 'README.md'), 'not a license');
		await writeFile(path.join(pkgDir, 'CHANGELOG'), 'not a license');
		await writeFile(path.join(pkgDir, 'package.json'), '{}');
		await writeFile(path.join(pkgDir, 'COPYING'), 'COPYING IS A LICENSE');
		const text = await readLicenseFromDisk(tmpRoot, { name: 'pkgc' });
		assert.equal(text, 'COPYING IS A LICENSE');
	});

	it('returns null when nodeModulesDir is empty/falsy', async () => {
		assert.equal(await readLicenseFromDisk(null, { name: 'x' }), null);
		assert.equal(await readLicenseFromDisk('', { name: 'x' }), null);
	});

	it('returns null when package dir does not exist', async () => {
		assert.equal(await readLicenseFromDisk(tmpRoot, { name: 'does-not-exist' }), null);
	});

	it('rejects path traversal in component.name', async () => {
		assert.equal(await readLicenseFromDisk(tmpRoot, { name: '../etc' }), null);
		assert.equal(await readLicenseFromDisk(tmpRoot, { name: '..' }), null);
	});

	it('rejects path traversal in component.group', async () => {
		assert.equal(
			await readLicenseFromDisk(tmpRoot, { group: '../..', name: 'pkga' }),
			null,
		);
	});

	it('rejects absolute-path-looking component name', async () => {
		assert.equal(await readLicenseFromDisk(tmpRoot, { name: '/etc/passwd' }), null);
	});

	it('rejects component.group without leading @', async () => {
		assert.equal(
			await readLicenseFromDisk(tmpRoot, { group: 'noatsign', name: 'pkga' }),
			null,
		);
	});

	it('returns null for missing component.name', async () => {
		assert.equal(await readLicenseFromDisk(tmpRoot, {}), null);
	});
});
