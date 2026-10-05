import { N8N_NODES_API_VERSION } from '@n8n/constants';

import { test as base } from '../base';
import { IMPORT_MARKER_DIR, PUBLISHED_PACKAGES, type FixturePackage } from './fixture-packages';

export * from './fixture-packages';
export { expect } from '../base';

export interface PackageDiskState {
	/** `version` of `~/.n8n/nodes/node_modules/<name>/package.json`, `undefined` when not on disk. */
	installedVersion: string | undefined;
	/** Import markers (`<name>@<version>`) the package's node module wrote when required. */
	importMarkers: string[];
}

export interface PackageDisk {
	stateOf(packageName: string): Promise<PackageDiskState>;
}

type Fixtures = {
	/** Publishes every fixture package into the stack's registry, once per worker, before any test runs. */
	publishedPackages: readonly FixturePackage[];
	/** Node API level the instance supports: 2.x runs level 1, 3.x runs level 3. */
	supportedNodesApiVersion: number;
	/** What the package left on the instance's disk; follows the main container across a restart. */
	packageDisk: PackageDisk;
};

/** `test` for specs that install real community packages; needs the `community-packages` capability. */
export const test = base.extend<
	Pick<Fixtures, 'supportedNodesApiVersion' | 'packageDisk'>,
	Pick<Fixtures, 'publishedPackages'>
>({
	publishedPackages: [
		async ({ n8nContainer }, use) => {
			if (n8nContainer) {
				for (const pkg of PUBLISHED_PACKAGES) {
					await n8nContainer.services.npmRegistry.publishDirectory(pkg.directory);
				}
			}
			await use(PUBLISHED_PACKAGES);
		},
		{ scope: 'worker', auto: true },
	],

	supportedNodesApiVersion: async (_fixtures, use) => {
		await use(N8N_NODES_API_VERSION);
	},

	packageDisk: async ({ n8nContainer }, use) => {
		const main = () => {
			const [container] = n8nContainer.findContainers(/-n8n(-main-1)?$/);
			if (!container) throw new Error('no n8n main container in this stack');
			return container;
		};
		const read = async (command: string[]) => {
			const { output, exitCode } = await main().exec(command);
			return exitCode === 0 ? output.trim() : undefined;
		};
		const userFolder = async () =>
			(await read(['printenv', 'N8N_USER_FOLDER'])) ?? (await read(['printenv', 'HOME']));

		await use({
			async stateOf(packageName) {
				const home = await userFolder();
				const manifest = await read([
					'cat',
					`${home}/.n8n/nodes/node_modules/${packageName}/package.json`,
				]);
				const markers = await read(['ls', '-1', `${home}/${IMPORT_MARKER_DIR}`]);
				return {
					installedVersion: manifest && (JSON.parse(manifest) as { version: string }).version,
					importMarkers: (markers?.split('\n') ?? []).filter((marker) =>
						marker.startsWith(`${packageName}@`),
					),
				};
			},
		});
	},
});
