import { expect, importMarkerName, nodeType, test } from '../../../fixtures/community-packages';
import {
	onDisk,
	readMainLogs,
	removeHomeDir,
	restartWithLevel3OnDisk,
	STARTUP_STACK,
} from '../../../fixtures/community-packages/startup';

/**
 * The startup guard: a package on disk that requires a newer node API than the
 * instance supports is not imported, does not take the instance down, and
 * shows as failed to load in Settings > Community nodes. On an instance that
 * supports the level, the same package loads.
 */
test.use({ capability: STARTUP_STACK });

test.describe('Community node API version guard at startup @mode:sqlite', () => {
	test.afterAll(removeHomeDir);

	test(
		'skips an installed package whose on-disk release requires a newer node API',
		{ annotation: [{ type: 'owner', description: 'NODES' }] },
		async ({ api, n8n, n8nContainer, packageDisk, supportedNodesApiVersion }) => {
			test.skip(supportedNodesApiVersion >= 3, 'this instance supports level 3');
			await restartWithLevel3OnDisk(api, packageDisk, n8nContainer);

			await expect(api.communityPackages.find(onDisk.name)).resolves.toMatchObject({
				failedLoading: true,
			});
			await expect(api.communityPackages.nodeTypeNames()).resolves.not.toContain(nodeType(onDisk));

			const logs = await readMainLogs(n8nContainer);
			expect(logs).toContain(`Skipping package "${onDisk.name}"`);
			expect(logs).toContain(`Not reinstalling package "${onDisk.name}"`);

			const state = await packageDisk.stateOf(onDisk.name);
			expect(state.importMarkers).not.toContain(importMarkerName(onDisk));

			await n8n.navigate.toCommunityNodes();
			await expect(n8n.communityNodes.getCommunityCard(onDisk.name)).toBeVisible();
			await expect(n8n.communityNodes.getFailedToLoadIcon(onDisk.name)).toBeVisible();
		},
	);

	test(
		'loads an installed package whose on-disk release declares the supported node API',
		{ annotation: [{ type: 'owner', description: 'NODES' }] },
		async ({ api, n8n, n8nContainer, packageDisk, supportedNodesApiVersion }) => {
			test.skip(supportedNodesApiVersion < 3, 'this instance does not support level 3');
			await restartWithLevel3OnDisk(api, packageDisk, n8nContainer);

			await expect(api.communityPackages.find(onDisk.name)).resolves.toMatchObject({
				failedLoading: false,
			});
			await expect(api.communityPackages.nodeTypeNames()).resolves.toContain(nodeType(onDisk));
			await expect(readMainLogs(n8nContainer)).resolves.not.toContain(
				`Skipping package "${onDisk.name}"`,
			);
			const state = await packageDisk.stateOf(onDisk.name);
			expect(state.importMarkers).toContain(importMarkerName(onDisk));

			await n8n.navigate.toCommunityNodes();
			await expect(n8n.communityNodes.getCommunityCard(onDisk.name)).toBeVisible();
			await expect(n8n.communityNodes.getFailedToLoadIcon(onDisk.name)).toBeHidden();
		},
	);
});
