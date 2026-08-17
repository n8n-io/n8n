import { describe, expect, it } from 'vitest';

import { resolveCatalogDep } from './catalog-versions.js';
import type { CatalogData } from '../utils/workspace-parser.js';

const CATALOG: CatalogData = {
	default: { typescript: '6.0.2', vite: '^8.0.2' },
	named: { frontend: { vue: '^3.5.13', 'vue-tsc': '^2.2.8' } },
};

describe('resolveCatalogDep', () => {
	it('follows the default catalog', () => {
		expect(resolveCatalogDep('typescript', { typescript: 'catalog:' }, CATALOG)).toBe('6.0.2');
	});

	it('follows a named catalog', () => {
		expect(resolveCatalogDep('vue', { vue: 'catalog:frontend' }, CATALOG)).toBe('^3.5.13');
	});

	it('passes a literal range through', () => {
		expect(resolveCatalogDep('sass', { sass: '^1.71.1' }, CATALOG)).toBe('^1.71.1');
	});

	it('returns null for a dependency the manifest does not declare', () => {
		expect(resolveCatalogDep('vue', {}, CATALOG)).toBeNull();
	});

	it('returns null for a workspace protocol, which never resolves outside the workspace', () => {
		expect(resolveCatalogDep('@n8n/utils', { '@n8n/utils': 'workspace:*' }, CATALOG)).toBeNull();
	});

	it('returns null when the named catalog has no such entry', () => {
		// Silently defaulting here would let the fixture compile against whatever npm hoisted,
		// which is the opposite of pinning the toolchain the package is built with.
		expect(resolveCatalogDep('vue', { vue: 'catalog:backend' }, CATALOG)).toBeNull();
	});
});
