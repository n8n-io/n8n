import { describe, expect, it } from 'vitest';

import {
	extractSpecifiers,
	isInternalSourceSpecifier,
	targetCandidates,
} from './consumer-specifiers.js';

const PKG = '@n8n/design-system';

describe('extractSpecifiers', () => {
	it('finds an import, a type-only import and a sass `@use`', () => {
		const source = [
			"import { N8nButton } from '@n8n/design-system';",
			"import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';",
			'@use "@n8n/design-system/css/mixins/motion" as motion;',
		].join('\n');
		expect(extractSpecifiers(source, PKG).sort()).toEqual([
			PKG,
			`${PKG}/components/N8nIcon/icons`,
			`${PKG}/css/mixins/motion`,
		]);
	});

	it('ignores an unquoted mention in prose', () => {
		// Failing a build over a sentence in a comment is how a check earns a reputation for
		// crying wolf, and a check nobody trusts is worse than no check.
		const source = '// Legacy tree component in @n8n/design-system/components. Use N8nTree2.';
		expect(extractSpecifiers(source, PKG)).toEqual([]);
	});

	it('ignores a tsconfig `paths` pattern', () => {
		expect(extractSpecifiers('"@n8n/design-system/src*": ["./src*"]', PKG)).toEqual([]);
	});

	it('does not match a package whose name merely starts the same', () => {
		// Without a boundary this reads as a bare import of `@n8n/design-system`, i.e. a different
		// package reported as this one.
		expect(extractSpecifiers("import x from '@n8n/design-system-icons';", PKG)).toEqual([]);
	});

	it('strips trailing punctuation from a `url()` or statement', () => {
		expect(extractSpecifiers("@import '@n8n/design-system/css/index.scss';", PKG)).toEqual([
			`${PKG}/css/index.scss`,
		]);
	});

	it('deduplicates repeated specifiers', () => {
		const source = "import a from '@n8n/design-system';\nimport b from '@n8n/design-system';";
		expect(extractSpecifiers(source, PKG)).toEqual([PKG]);
	});
});

describe('isInternalSourceSpecifier', () => {
	it('recognises the alias-only `src` form', () => {
		expect(isInternalSourceSpecifier(PKG, `${PKG}/src`)).toBe(true);
		expect(isInternalSourceSpecifier(PKG, `${PKG}/src/icons/lucide/vite`)).toBe(true);
	});

	it('does not excuse a published subpath', () => {
		expect(isInternalSourceSpecifier(PKG, `${PKG}/icons/lucide`)).toBe(false);
		expect(isInternalSourceSpecifier(PKG, `${PKG}/srcfoo`)).toBe(false);
	});
});

describe('targetCandidates', () => {
	it('takes an explicit extension literally', () => {
		expect(targetCandidates('./dist/index.js')).toEqual(['dist/index.js']);
		expect(targetCandidates('./dist/css/markdown.scss')).toEqual(['dist/css/markdown.scss']);
	});

	it("offers sass's candidates for an extensionless stylesheet target", () => {
		// `@n8n/design-system/css/mixins/motion` is legal sass and resolves to `motion.scss`;
		// Node's own exports resolution would stop at the extensionless name.
		expect(targetCandidates('./dist/css/mixins/motion')).toContain('dist/css/mixins/motion.scss');
	});

	it('offers the partial and index forms too', () => {
		const candidates = targetCandidates('./dist/css/_tokens');
		expect(candidates).toContain('dist/css/_tokens.scss');
		expect(targetCandidates('./dist/css/mixins')).toContain('dist/css/mixins/index.scss');
	});
});
