import { expect } from '../base';
import { importMarkerName, nodeType, type FixturePackage } from './fixture-packages';
import type { PackageDisk } from './index';
import type { n8nPage } from '../../pages/n8nPage';
import type { ApiHelpers } from '../../services/api-helper';

export const versionedName = (pkg: FixturePackage) => `${pkg.name}@${pkg.version}`;

export async function expectInstalled(api: ApiHelpers, disk: PackageDisk, pkg: FixturePackage) {
	await expect(api.communityPackages.find(pkg.name)).resolves.toMatchObject({
		installedVersion: pkg.version,
	});
	await expect(api.communityPackages.nodeTypeNames()).resolves.toContain(nodeType(pkg));
	const state = await disk.stateOf(pkg.name);
	expect(state.installedVersion).toBe(pkg.version);
	expect(state.importMarkers).toContain(importMarkerName(pkg));
}

export async function expectAbsent(api: ApiHelpers, disk: PackageDisk, pkg: FixturePackage) {
	await expect(api.communityPackages.find(pkg.name)).resolves.toBeUndefined();
	await expect(api.communityPackages.nodeTypeNames()).resolves.not.toContain(nodeType(pkg));
	await expect(disk.stateOf(pkg.name)).resolves.toEqual({
		installedVersion: undefined,
		importMarkers: [],
	});
}

export async function expectRejectedOnSettingsPage(
	{ n8n, api, packageDisk }: { n8n: n8nPage; api: ApiHelpers; packageDisk: PackageDisk },
	pkg: FixturePackage,
	error: RegExp,
) {
	await n8n.navigate.toCommunityNodes();
	await n8n.communityNodes.submitInstall(versionedName(pkg));
	await expect(
		n8n.notifications.getNotificationByTitle('Package not compatible with this n8n version'),
	).toBeVisible();
	await expect(n8n.communityNodes.getInstallModalError(error)).toBeVisible();
	await expectAbsent(api, packageDisk, pkg);
}
