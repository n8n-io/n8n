import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';
import type { N8NConfig, N8NStack } from 'n8n-containers/stack';
import { mkdtempSync } from 'node:fs';
import { cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect } from '../base';
import { INSTALLABLE_PACKAGES, LEGACY_PACKAGE_V3_UPDATE } from './fixture-packages';
import type { PackageDisk } from './index';
import type { ApiHelpers } from '../../services/api-helper';

/**
 * Shared by the startup guard specs. The state they test is produced the way
 * it happens in the wild: a compatible release is installed, so the package
 * has a database row, then its folder on disk is swapped for a release
 * declaring node API level 3, and n8n restarts on the same user folder. The
 * user folder is a bind mount, so the swap is a plain file operation.
 */

/** The release that gets installed, and the release that ends up on disk. */
export const installed = INSTALLABLE_PACKAGES.legacy;
export const onDisk = LEGACY_PACKAGE_V3_UPDATE;

/** Host directory mounted as the container's home, so it outlives the restart. */
export const HOME_DIR = mkdtempSync(join(tmpdir(), 'community-packages-startup-'));

const hostUser = () => `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;

/** Stack for `test.use({ capability })`: registry, host-owned home, reinstall on. */
export const STARTUP_STACK: N8NConfig = {
	services: ['npmRegistry'],
	env: {
		N8N_UNVERIFIED_PACKAGES_ENABLED: 'true',
		N8N_REINSTALL_MISSING_PACKAGES: 'true',
		HOME: '/home/node',
		N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'false',
	},
	userHomeHostDir: HOME_DIR,
	user: hostUser(),
};

export async function removeHomeDir() {
	await rm(HOME_DIR, { recursive: true, force: true });
}

/** Installs the compatible release, swaps the level 3 release onto disk, and restarts n8n. */
export async function restartWithLevel3OnDisk(api: ApiHelpers, disk: PackageDisk, stack: N8NStack) {
	await api.enableFeature('communityNodes:customRegistry');
	const install = await api.communityPackages.install(`${installed.name}@${installed.version}`);
	expect(install.status()).toBe(200);

	const packageDir = join(HOME_DIR, '.n8n', 'nodes', 'node_modules', onDisk.name);
	await rm(packageDir, { recursive: true, force: true });
	await cp(onDisk.directory, packageDir, { recursive: true });
	await expect(disk.stateOf(onDisk.name)).resolves.toMatchObject({
		installedVersion: onDisk.version,
	});

	await stack.replaceN8N({ image: TEST_CONTAINER_IMAGES.n8n });
}

/** Everything the main container logged since it started. */
export async function readMainLogs(stack: N8NStack): Promise<string> {
	const [container] = stack.findContainers(/-n8n$/);
	if (!container) throw new Error('no n8n main container in this stack');
	const stream = await container.logs();
	const chunks: Buffer[] = [];
	await new Promise<void>((resolve) => {
		stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
		stream.on('end', resolve);
		stream.on('error', () => resolve());
		setTimeout(resolve, 2000);
	});
	return Buffer.concat(chunks).toString('utf8');
}
