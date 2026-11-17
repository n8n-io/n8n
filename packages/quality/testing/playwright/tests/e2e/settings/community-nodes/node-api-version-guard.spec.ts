import {
	expect,
	importMarkerName,
	INSTALLABLE_PACKAGES,
	LEGACY_PACKAGE_V3_UPDATE,
	test,
} from '../../../../fixtures/community-packages';
import {
	expectAbsent,
	expectInstalled,
	expectRejectedOnSettingsPage,
	versionedName,
} from '../../../../fixtures/community-packages/assertions';

/**
 * The node API compatibility guard, end to end: a real n8n installs real
 * packages from a registry the suite seeds. A 2.x image supports level 1 and
 * rejects level 3 packages, a 3.x image accepts them, and a malformed
 * declaration is rejected everywhere.
 */
test.use({ capability: 'community-packages' });

const { legacy, v1, v3, malformed } = INSTALLABLE_PACKAGES;
const legacyV3 = LEGACY_PACKAGE_V3_UPDATE;

test.describe(
	'Community node API version guard',
	{ annotation: [{ type: 'owner', description: 'NODES' }] },
	() => {
		test.beforeEach(async ({ api }) => {
			await api.enableFeature('communityNodes:customRegistry');
		});

		test.afterEach(async ({ api }) => {
			await api.communityPackages.uninstallAll();
		});

		test('installs packages declaring n8nNodesApiVersion 1 or none', async ({
			api,
			packageDisk,
		}) => {
			for (const pkg of [legacy, v1]) {
				const response = await api.communityPackages.install(versionedName(pkg));
				expect(response.status()).toBe(200);
				await expectInstalled(api, packageDisk, pkg);
			}
		});

		test('rejects a malformed n8nNodesApiVersion', async ({ api, packageDisk }) => {
			const response = await api.communityPackages.install(versionedName(malformed));
			expect(response.status()).toBe(400);
			const rejection = await api.communityPackages.readRejection(response);
			expect(rejection.message).toContain('declares an invalid n8n node API version');
			expect(rejection.meta.requiredNodesApiVersion).toBeNull();
			await expectAbsent(api, packageDisk, malformed);
		});

		test('reports a malformed n8nNodesApiVersion on the settings page', async ({
			n8n,
			api,
			packageDisk,
		}) => {
			await expectRejectedOnSettingsPage(
				{ n8n, api, packageDisk },
				malformed,
				/declares an invalid n8n node API version/,
			);
		});

		test.describe('on an instance below node API level 3', () => {
			test.beforeEach(({ supportedNodesApiVersion }) => {
				test.skip(supportedNodesApiVersion >= 3, 'this instance supports level 3');
			});

			test('rejects installing a level 3 package', async ({
				api,
				packageDisk,
				supportedNodesApiVersion,
			}) => {
				const response = await api.communityPackages.install(versionedName(v3));
				expect(response.status()).toBe(400);
				const rejection = await api.communityPackages.readRejection(response);
				expect(rejection.message).toContain("isn't compatible with your version of n8n");
				expect(rejection.meta.requiredNodesApiVersion).toBe('3.0');
				expect(String(rejection.meta.supportedNodesApiVersion)).toMatch(
					new RegExp(`^${supportedNodesApiVersion}(\\.\\d+)?$`),
				);
				await expectAbsent(api, packageDisk, v3);
			});

			test('explains the rejected install on the settings page', async ({
				n8n,
				api,
				packageDisk,
			}) => {
				await expectRejectedOnSettingsPage(
					{ n8n, api, packageDisk },
					v3,
					/isn't compatible with your version of n8n/,
				);
			});

			test('rejects updating to a level 3 release and keeps the installed one', async ({
				api,
				packageDisk,
			}) => {
				expect((await api.communityPackages.install(versionedName(legacy))).status()).toBe(200);

				const response = await api.communityPackages.update(legacyV3.name, legacyV3.version);
				expect(response.status()).toBe(400);
				const rejection = await api.communityPackages.readRejection(response);
				expect(rejection.meta.requiredNodesApiVersion).toBe('3.0');

				await expectInstalled(api, packageDisk, legacy);
				const state = await packageDisk.stateOf(legacyV3.name);
				expect(state.importMarkers).not.toContain(importMarkerName(legacyV3));
			});

			test('explains the rejected update on the settings page', async ({
				n8n,
				api,
				packageDisk,
			}) => {
				expect((await api.communityPackages.install(versionedName(legacy))).status()).toBe(200);

				await n8n.navigate.toCommunityNodes();
				await expect(n8n.communityNodes.getCommunityCard(legacy.name)).toContainText(
					`v${legacy.version}`,
				);
				await n8n.communityNodes.updatePackage(legacy.name);

				await expect(
					n8n.notifications.getNotificationByTitle('Update not compatible with this n8n version'),
				).toBeVisible();
				await expect(n8n.communityNodes.getCommunityCard(legacy.name)).toContainText(
					`v${legacy.version}`,
				);
				await expectInstalled(api, packageDisk, legacy);
				const state = await packageDisk.stateOf(legacyV3.name);
				expect(state.importMarkers).not.toContain(importMarkerName(legacyV3));
			});
		});

		test.describe('on an instance at node API level 3', () => {
			test.beforeEach(({ supportedNodesApiVersion }) => {
				test.skip(supportedNodesApiVersion < 3, 'this instance does not support level 3');
			});

			test('installs a level 3 package', async ({ api, packageDisk }) => {
				const response = await api.communityPackages.install(versionedName(v3));
				expect(response.status()).toBe(200);
				await expectInstalled(api, packageDisk, v3);
			});

			test('updates to a level 3 release', async ({ api, packageDisk }) => {
				expect((await api.communityPackages.install(versionedName(legacy))).status()).toBe(200);

				const response = await api.communityPackages.update(legacyV3.name, legacyV3.version);
				expect(response.status()).toBe(200);
				await expectInstalled(api, packageDisk, legacyV3);
			});
		});
	},
);
