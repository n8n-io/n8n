import { CURATED_LIBS } from './scripts/single-instance/single-instance-libs.mjs';

/**
 * syncpack enforces one rule for the single-instance-sensitive libraries: they
 * must be consumed via the pnpm catalog (`catalog:` protocol), so there is a
 * single source of truth for their version. A raw semver range for any of them
 * fails the check. Everything else is out of scope here — this is deliberately
 * narrow, not a monorepo-wide version-consistency gate.
 *
 * The dependencies-shape policy (peerDependencies vs dependencies) is enforced by
 * scripts/single-instance/check-single-instance-peers.mjs, which needs report-first nuance that a
 * declarative syncpack rule cannot express.
 */
export default {
	versionGroups: [
		{
			label: 'Single-instance libraries must be consumed via the pnpm catalog (catalog:)',
			dependencies: CURATED_LIBS,
			policy: 'catalog',
		},
		{
			label: 'Out of scope — only the curated single-instance libraries are enforced here',
			isIgnored: true,
		},
	],
};
