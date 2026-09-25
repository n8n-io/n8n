import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
	loadSpdxIds,
	isCopyleft,
	validateExpression,
	validateComponentLicenses,
	checkSbom,
} from './check-sbom-licenses.mjs';

// A small SPDX set is enough for the pure-function tests; the integration tests
// below load the real vendored list so they exercise the shipped data too.
const SPDX = new Set([
	'MIT',
	'Apache-2.0',
	'ISC',
	'BSD-2-Clause',
	'BSD-3-Clause',
	'GPL-3.0-or-later',
	'EUPL-1.1',
	'Zlib',
]);
const N8N_REF = 'LicenseRef-n8n-sustainable-use';
const allow = new Set([N8N_REF]);

const lic = (id) => ({ license: { id } });
const named = (name) => ({ license: { name } });
const expr = (expression) => ({ expression });

describe('isCopyleft', () => {
	it('flags GPL/AGPL/LGPL/EUPL/SSPL families', () => {
		for (const id of ['GPL-3.0-or-later', 'AGPL-3.0', 'LGPL-2.1', 'EUPL-1.1', 'SSPL-1.0']) {
			assert.equal(isCopyleft(id), true, id);
		}
	});

	it('does not flag permissive licenses', () => {
		for (const id of ['MIT', 'Apache-2.0', 'ISC', 'BSD-3-Clause', 'Zlib']) {
			assert.equal(isCopyleft(id), false, id);
		}
	});

	it('handles the + (or-later) suffix', () => {
		assert.equal(isCopyleft('EUPL-1.1+'), true);
	});
});

describe('validateExpression', () => {
	it('accepts a single valid id', () => {
		assert.equal(validateExpression('MIT', SPDX, allow).valid, true);
	});

	it('accepts AND / OR / parenthesised compounds', () => {
		assert.equal(validateExpression('(MIT OR Apache-2.0)', SPDX, allow).valid, true);
		assert.equal(validateExpression('MIT AND BSD-3-Clause', SPDX, allow).valid, true);
		assert.equal(
			validateExpression('(BSD-2-Clause OR MIT OR Apache-2.0)', SPDX, allow).valid,
			true,
		);
	});

	it('accepts the + suffix and WITH exceptions', () => {
		assert.equal(validateExpression('EUPL-1.1+', SPDX, allow).valid, true);
		assert.equal(
			validateExpression('Apache-2.0 WITH Classpath-exception-2.0', SPDX, allow).valid,
			true,
		);
	});

	it('rejects unknown tokens and reports them', () => {
		const result = validateExpression('MIT License', SPDX, allow);
		assert.equal(result.valid, false);
		assert.deepEqual(result.badTokens, ['License']);
	});

	it('rejects free-text non-SPDX strings', () => {
		assert.equal(validateExpression('SEE LICENSE IN LICENSE.md', SPDX, allow).valid, false);
	});

	it('only accepts a LicenseRef when explicitly allowed', () => {
		assert.equal(validateExpression(N8N_REF, SPDX, allow).valid, true);
		assert.equal(validateExpression(N8N_REF, SPDX, new Set()).valid, false);
	});

	it('detects a copyleft alternative inside an OR', () => {
		assert.equal(validateExpression('(MIT OR GPL-3.0-or-later)', SPDX, allow).hasCopyleftOr, true);
		assert.equal(validateExpression('(MIT OR Apache-2.0)', SPDX, allow).hasCopyleftOr, false);
		// AND with copyleft is not an election choice — not flagged as a dual warning.
		assert.equal(validateExpression('MIT AND BSD-3-Clause', SPDX, allow).hasCopyleftOr, false);
	});
});

describe('validateComponentLicenses', () => {
	it('fails a component with no licenses (the unlicensed case)', () => {
		assert.equal(validateComponentLicenses({}, SPDX, allow).ok, false);
		assert.equal(validateComponentLicenses({ licenses: [] }, SPDX, allow).ok, false);
	});

	it('passes a valid SPDX id', () => {
		assert.equal(validateComponentLicenses({ licenses: [lic('MIT')] }, SPDX, allow).ok, true);
	});

	it('fails a non-SPDX id', () => {
		const r = validateComponentLicenses({ licenses: [lic('MIT/X11')] }, SPDX, allow);
		assert.equal(r.ok, false);
		assert.match(r.reason, /non-SPDX license id/);
	});

	it('fails a non-SPDX free-text name', () => {
		assert.equal(validateComponentLicenses({ licenses: [named('BSD')] }, SPDX, allow).ok, false);
		assert.equal(
			validateComponentLicenses({ licenses: [named('UNLICENSED')] }, SPDX, allow).ok,
			false,
		);
	});

	it('passes an allowed LicenseRef carried in name (enriched first-party)', () => {
		assert.equal(validateComponentLicenses({ licenses: [named(N8N_REF)] }, SPDX, allow).ok, true);
	});

	it('passes a valid expression and surfaces a dual-copyleft warning', () => {
		const r = validateComponentLicenses(
			{ licenses: [expr('(MIT OR GPL-3.0-or-later)')] },
			SPDX,
			allow,
		);
		assert.equal(r.ok, true);
		assert.match(r.warning, /copyleft/);
	});
});

describe('checkSbom (integration)', () => {
	it('fails an SBOM containing any unlicensed component', () => {
		const sbom = {
			components: [
				{ name: 'good', version: '1.0.0', purl: 'pkg:npm/good@1.0.0', licenses: [lic('MIT')] },
				{ name: 'bad', version: '1.0.0', purl: 'pkg:npm/bad@1.0.0' }, // no licenses
			],
		};
		const { failures } = checkSbom(sbom, { validIds: SPDX, allowRefs: allow });
		assert.equal(failures.length, 1);
		assert.equal(failures[0].label, 'bad@1.0.0');
	});

	it('passes a fully-licensed SBOM with only dual-license warnings', () => {
		const sbom = {
			components: [
				{ name: 'a', version: '1', purl: 'pkg:npm/a@1', licenses: [lic('MIT')] },
				{ name: 'b', version: '1', purl: 'pkg:npm/b@1', licenses: [named(N8N_REF)] },
				{
					name: 'c',
					version: '1',
					purl: 'pkg:npm/c@1',
					licenses: [expr('(MIT OR GPL-3.0-or-later)')],
				},
			],
		};
		const { failures, warnings } = checkSbom(sbom, { validIds: SPDX, allowRefs: allow });
		assert.equal(failures.length, 0);
		assert.equal(warnings.length, 1);
	});

	it('--enforce-prefix gates only matching purls (npm), skips OS packages', () => {
		const sbom = {
			components: [
				{ name: 'lodash', version: '4', purl: 'pkg:npm/lodash@4', licenses: [lic('MIT')] },
				{ name: 'badnpm', version: '1', purl: 'pkg:npm/badnpm@1' }, // unlicensed npm -> must fail
				{ name: 'busybox', version: '1', purl: 'pkg:apk/alpine/busybox@1' }, // OS, no license -> skipped
				{ name: 'zlib', version: '1', purl: 'pkg:apk/alpine/zlib@1', licenses: [named('custom')] }, // OS non-SPDX -> skipped
			],
		};
		const { failures, summary } = checkSbom(sbom, {
			validIds: SPDX,
			allowRefs: allow,
			enforcePrefixes: ['pkg:npm/'],
		});
		assert.equal(failures.length, 1, JSON.stringify(failures));
		assert.equal(failures[0].label, 'badnpm@1');
		assert.equal(summary.skipped, 2);
		assert.equal(summary.enforced, 2);
	});
});

describe('vendored SPDX id list', () => {
	let realIds;
	before(async () => {
		realIds = await loadSpdxIds();
	});

	it('contains every id the shipped n8n SBOM relies on', () => {
		for (const id of [
			'MIT',
			'Apache-2.0',
			'ISC',
			'BSD-2-Clause',
			'BSD-3-Clause',
			'BlueOak-1.0.0',
			'Unlicense',
			'MIT-0',
			'0BSD',
			'Python-2.0',
			'GPL-3.0-or-later',
			'EUPL-1.1',
			'WTFPL',
			'Zlib',
			'UPL-1.0',
			'AFL-2.1',
		]) {
			assert.equal(realIds.has(id), true, `missing SPDX id: ${id}`);
		}
	});

	it('does not contain non-SPDX noise', () => {
		for (const noise of ['MIT/X11', 'UNLICENSED', 'BSD', 'SEE LICENSE IN LICENSE.md']) {
			assert.equal(realIds.has(noise), false, noise);
		}
	});
});
