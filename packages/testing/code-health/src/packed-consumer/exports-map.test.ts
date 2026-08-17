import { describe, expect, it } from 'vitest';

import { classifyTarget, collectExportEntries, resolveSpecifier } from './exports-map.js';

const PKG = '@n8n/design-system';

// The shape `@n8n/design-system` publishes, trimmed to what the resolver has to reason about.
const EXPORTS = {
	'.': { types: './dist/index.d.ts', import: './dist/index.js' },
	'./icons/lucide': {
		types: './dist/icons/lucide/index.d.ts',
		import: './dist/icons/lucide/index.js',
	},
	'./style.css': './dist/style.css',
	'./css/*': './dist/css/*',
	'./package.json': './package.json',
};

describe('classifyTarget', () => {
	it('separates modules, declarations, stylesheets and the manifest', () => {
		expect(classifyTarget('./dist/index.js')).toBe('module');
		expect(classifyTarget('./dist/index.d.ts')).toBe('types');
		expect(classifyTarget('./dist/style.css')).toBe('style');
		expect(classifyTarget('./dist/css/_tokens.scss')).toBe('style');
		expect(classifyTarget('./package.json')).toBe('manifest');
	});

	it('reads `.d.ts` as declarations rather than as a module', () => {
		// `.d.ts` ends in `.ts`, not `.js`, but an ordering mistake here would probe a declaration
		// file with a runtime `import()` and fail on a healthy package.
		expect(classifyTarget('./dist/icons/lucide/index.d.ts')).toBe('types');
	});
});

describe('collectExportEntries', () => {
	it('gives every subpath the specifier a consumer writes', () => {
		const entries = collectExportEntries(PKG, EXPORTS);
		const specifiers = entries.map((e) => e.specifier);
		expect(specifiers).toContain(PKG);
		expect(specifiers).toContain(`${PKG}/icons/lucide`);
		expect(specifiers).toContain(`${PKG}/style.css`);
	});

	it('leaves a wildcard key without a specifier', () => {
		const wildcard = collectExportEntries(PKG, EXPORTS).find((e) => e.subpath === './css/*');
		expect(wildcard?.isWildcard).toBe(true);
		expect(wildcard?.specifier).toBeUndefined();
	});

	it('collects both the types and the import condition', () => {
		const root = collectExportEntries(PKG, EXPORTS).find((e) => e.subpath === '.');
		expect(root?.targets.map((t) => t.condition).sort()).toEqual(['import', 'types']);
	});

	it('treats a bare string `exports` as the root entry', () => {
		const entries = collectExportEntries(PKG, './dist/index.js');
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({ subpath: '.', specifier: PKG });
	});

	it('returns nothing when `exports` is absent, so the caller can fail loudly', () => {
		expect(collectExportEntries(PKG, undefined)).toEqual([]);
	});
});

describe('resolveSpecifier', () => {
	const entries = collectExportEntries(PKG, EXPORTS);

	it('matches the bare specifier to the root', () => {
		expect(resolveSpecifier(PKG, PKG, entries)?.entry.subpath).toBe('.');
	});

	it('prefers an exact key over a wildcard', () => {
		const withBoth = collectExportEntries(PKG, {
			'./css/*': './dist/css/*',
			'./css/index.scss': './dist/css/main.scss',
		});
		const match = resolveSpecifier(PKG, `${PKG}/css/index.scss`, withBoth);
		expect(match?.entry.subpath).toBe('./css/index.scss');
		expect(match?.targets[0].target).toBe('./dist/css/main.scss');
	});

	it('substitutes the captured segment into a wildcard target', () => {
		const match = resolveSpecifier(PKG, `${PKG}/css/mixins/motion`, entries);
		expect(match?.entry.subpath).toBe('./css/*');
		expect(match?.targets[0].target).toBe('./dist/css/mixins/motion');
	});

	it('returns null for a subpath the map does not cover', () => {
		// The deep-import regression: resolves through a build-time alias inside the workspace,
		// resolves nowhere for a consumer outside it.
		expect(resolveSpecifier(PKG, `${PKG}/components/N8nIcon/icons`, entries)).toBeNull();
	});

	it('returns null for a specifier belonging to another package', () => {
		expect(resolveSpecifier(PKG, '@n8n/design-system-extra/thing', entries)).toBeNull();
	});

	it('picks the longest static prefix when two wildcards both match', () => {
		const nested = collectExportEntries(PKG, {
			'./css/*': './dist/css/*',
			'./css/mixins/*': './dist/scss-mixins/*',
		});
		const match = resolveSpecifier(PKG, `${PKG}/css/mixins/motion`, nested);
		expect(match?.entry.subpath).toBe('./css/mixins/*');
		expect(match?.targets[0].target).toBe('./dist/scss-mixins/motion');
	});
});
