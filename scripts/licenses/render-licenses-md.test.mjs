import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	renderSbom,
	qualifiedName,
	isFirstParty,
	licenseKey,
	applyOverride,
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

	it('joins multiple distinct licenses with AND', () => {
		assert.equal(
			licenseKey([{ license: { id: 'MIT' } }, { license: { id: 'Apache-2.0' } }]),
			'MIT AND Apache-2.0',
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
});
