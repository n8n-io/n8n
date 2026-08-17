import type { CatalogData } from '../utils/workspace-parser.js';

/**
 * Look a dependency's concrete range up from the manifest section it is declared in, following a
 * `catalog:` / `catalog:<name>` indirection.
 *
 * The generated consumer takes its toolchain versions from the target package's own manifest, so
 * the fixture always compiles against the Vue and TypeScript the package was built with. A pinned
 * copy in this file would drift from the catalog silently, and a floating `latest` would turn an
 * upstream release into a red `main` that nobody caused.
 *
 * Returns `null` when the dependency is absent or resolves to a workspace package, which the
 * caller must treat as an error rather than a default: a silently dropped toolchain dependency
 * makes the generated consumer typecheck against whatever npm happens to hoist.
 */
export function resolveCatalogDep(
	depName: string,
	declared: Record<string, string>,
	catalog: CatalogData,
): string | null {
	const spec = declared[depName];
	if (spec === undefined) return null;
	if (!spec.startsWith('catalog:')) return spec.startsWith('workspace:') ? null : spec;

	const catalogName = spec.slice('catalog:'.length);
	const table = catalogName === '' ? catalog.default : catalog.named[catalogName];
	const version = table?.[depName];
	return typeof version === 'string' && !version.startsWith('workspace:') ? version : null;
}
