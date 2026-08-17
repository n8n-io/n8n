import { describe, expect, it } from 'vitest';

import { buildFixture, type FixtureInput } from './fixture.js';

const INPUT: FixtureInput = {
	packageName: '@n8n/design-system',
	tarballDeps: {
		'@n8n/design-system': 'file:/tmp/x/n8n-design-system-2.34.0.tgz',
		'@n8n/utils': 'file:/tmp/x/n8n-utils-0.1.0.tgz',
	},
	toolchainDeps: { vue: '^3.5.13', 'vue-tsc': '^2.2.8' },
	moduleSpecifiers: ['@n8n/design-system', '@n8n/design-system/icons/lucide'],
	styleSpecifiers: ['@n8n/design-system/css/_tokens', '@n8n/design-system/css/mixins/motion'],
	cssSpecifiers: ['@n8n/design-system/style.css'],
};

interface ConsumerManifest {
	dependencies: Record<string, string>;
	overrides: Record<string, unknown>;
}

function parseManifest(raw: string): ConsumerManifest {
	try {
		return JSON.parse(raw) as ConsumerManifest;
	} catch (cause) {
		throw new Error('buildFixture emitted a package.json that is not valid JSON', { cause });
	}
}

describe('buildFixture', () => {
	const files = buildFixture(INPUT);

	it('writes a project that can be installed, typechecked, built and loaded', () => {
		expect(Object.keys(files).sort()).toEqual([
			'index.html',
			'package.json',
			'runtime-probe.mjs',
			'src/App.vue',
			'src/main.ts',
			'src/shims.d.ts',
			'src/styles.scss',
			'src/type-probe.ts',
			'tsconfig.json',
			'vite.config.mts',
		]);
	});

	it('forces every packed workspace package to its local tarball', () => {
		const manifest = parseManifest(files['package.json']);
		// Without the overrides, npm resolves a published copy at the same version and the run
		// verifies a tarball nobody built.
		expect(manifest.overrides['@n8n/utils']).toBe(INPUT.tarballDeps['@n8n/utils']);
		expect(manifest.dependencies['@n8n/design-system']).toMatch(/^file:/);
	});

	it('omits the styles entry when nothing imports a stylesheet subpath', () => {
		const withoutStyles = buildFixture({ ...INPUT, styleSpecifiers: [] });
		expect(withoutStyles['src/styles.scss']).toBeUndefined();
		expect(withoutStyles['src/main.ts']).not.toContain('./styles.scss');
	});

	it('gives each stylesheet `@use` its own namespace', () => {
		// Several of these define the same token names; sharing a namespace would fail for a
		// reason that has nothing to do with whether the stylesheet shipped.
		expect(files['src/styles.scss']).toContain("@use '@n8n/design-system/css/_tokens' as probe0;");
		expect(files['src/styles.scss']).toContain(
			"@use '@n8n/design-system/css/mixins/motion' as probe1;",
		);
	});

	it('probes every module specifier one at a time', () => {
		// A single module importing all of them stops at the first failure and hides the rest.
		expect(files['runtime-probe.mjs']).toContain('for (const specifier of SPECIFIERS)');
		for (const specifier of INPUT.moduleSpecifiers) {
			expect(files['runtime-probe.mjs']).toContain(specifier);
		}
	});

	it('derives the expected icon chunks from the entry rather than from a directory listing', () => {
		// A listing makes the check agree with whatever is present: delete a chunk and it would
		// verify one fewer and still pass.
		expect(files['runtime-probe.mjs']).toContain('entrySource.matchAll');
		expect(files['runtime-probe.mjs']).not.toContain('readdirSync');
	});

	it('uses a statically named slot, which `vue-tsc` can actually check', () => {
		expect(files['src/App.vue']).toContain('<template #item="{ item, cells }">');
		expect(files['src/App.vue']).not.toContain('#[');
	});

	it('asserts the published types have not degraded to `any`', () => {
		expect(files['src/type-probe.ts']).toContain('type IsAny<T> = 0 extends 1 & T ? true : false');
		expect(files['src/type-probe.ts']).toContain('@ts-expect-error');
	});

	it('registers no icon plugin, so the chunks have to be pre-built', () => {
		expect(files['vite.config.mts']).not.toContain('lucide');
		expect(files['vite.config.mts']).toContain('vue()');
	});
});
