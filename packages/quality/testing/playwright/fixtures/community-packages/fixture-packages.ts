import { join } from 'node:path';

/** Complete packages under `packages/`; each ships `dist/CompatProbe.node.js`, which writes an import marker when required. */
const PACKAGES_DIR = join(__dirname, 'packages');

export const IMPORT_MARKER_DIR = '.n8n/community-package-imports';

export type Requirement = { kind: 'level'; level: number } | { kind: 'malformed' };

export interface FixturePackage {
	name: string;
	version: string;
	directory: string;
	nodesApiVersion: number | string | undefined;
	requirement: Requirement;
}

const fixturePackage = (
	name: string,
	version: string,
	nodesApiVersion: number | string | undefined,
	requirement: Requirement,
): FixturePackage => ({
	name,
	version,
	directory: join(PACKAGES_DIR, `${name}-${version}`),
	nodesApiVersion,
	requirement,
});

export const INSTALLABLE_PACKAGES = {
	legacy: fixturePackage('n8n-nodes-compat-legacy', '1.0.0', undefined, {
		kind: 'level',
		level: 1,
	}),
	v1: fixturePackage('n8n-nodes-compat-v1', '1.0.0', 1, { kind: 'level', level: 1 }),
	v3: fixturePackage('n8n-nodes-compat-v3', '1.0.0', 3, { kind: 'level', level: 3 }),
	malformed: fixturePackage('n8n-nodes-compat-malformed', '1.0.0', 'not-a-level', {
		kind: 'malformed',
	}),
} as const satisfies Record<string, FixturePackage>;

export const LEGACY_PACKAGE_V3_UPDATE = fixturePackage('n8n-nodes-compat-legacy', '2.0.0', 3, {
	kind: 'level',
	level: 3,
});

/** Publish order matters: the last version published becomes `latest`. */
export const PUBLISHED_PACKAGES: readonly FixturePackage[] = [
	INSTALLABLE_PACKAGES.legacy,
	INSTALLABLE_PACKAGES.v1,
	INSTALLABLE_PACKAGES.v3,
	INSTALLABLE_PACKAGES.malformed,
	LEGACY_PACKAGE_V3_UPDATE,
];

export const importMarkerName = (pkg: FixturePackage): string => `${pkg.name}@${pkg.version}`;

export const nodeType = (pkg: FixturePackage): string => `${pkg.name}.compatProbe`;
