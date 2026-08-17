/**
 * Specifiers that are knowingly outside the published `exports` surface when this check landed.
 *
 * A new gate over an existing codebase either grandfathers what it finds or blocks on work it does
 * not own. This package already takes the first route elsewhere — `endpoint-scope-coverage` ships
 * disabled precisely so ~129 existing routes can be reviewed into a baseline first — so this is the
 * same pattern, kept as small as it can be: exact specifier strings, each with its reason, printed
 * on every run, and self-clearing.
 *
 * This is deliberately not a directory or a glob. The hole this check shipped with was a
 * `dot: false` default that excluded `.storybook/` without anybody writing it down; an exclusion
 * that is invisible in the output is the defect, not the fact that an exception exists.
 */

export interface GrandfatheredSpecifier {
	specifier: string;
	/** Why it is not simply fixed, and what would resolve it. */
	reason: string;
}

export const GRANDFATHERED_SPECIFIERS: GrandfatheredSpecifier[] = [
	{
		specifier: '@n8n/design-system/plugin',
		reason:
			'`.storybook/preview.ts` imports it deeply on purpose (8ce1fdca557, 2026-07-27): preview.ts ' +
			'is a TurboSnap global, and the barrel\'s `export * from "./components"` would make every ' +
			'component a global dep, forcing a full Chromatic snapshot on any component change. The ' +
			'symbol is on the root barrel, so a root import compiles — but it costs that property. ' +
			'Resolution is `./plugin` as its own entry, like `./icons/lucide`: a plugin that pulls the ' +
			'whole component set is exactly the optional capability the barrel should not carry. ' +
			'Needs a build entry too — `dist/plugin.d.ts` ships today with no `dist/plugin.js`.',
	},
	{
		specifier: '@n8n/design-system/composables/useIconBodyLoader',
		reason:
			'Same import site and same TurboSnap reason as `@n8n/design-system/plugin`. Only ' +
			'`IconBodyLoaderKey` is needed, and it is on the root barrel. Resolution is the same: give ' +
			'the icon-loader contract a published subpath, or accept the barrel import here once the ' +
			'TurboSnap cost is measured rather than assumed.',
	},
];

export function findGrandfathered(specifier: string): GrandfatheredSpecifier | undefined {
	return GRANDFATHERED_SPECIFIERS.find((g) => g.specifier === specifier);
}
