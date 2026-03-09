import { accessSync, constants } from 'fs';
import { execSync } from 'child_process';

import { BubblewrapDriver } from './drivers/BubblewrapDriver';
import { DockerDriver } from './drivers/DockerDriver';
import { HostDriver } from './drivers/HostDriver';
import type { ICommandExecutor } from './drivers/ICommandExecutor';

export type DriverType = 'host' | 'docker' | 'bubblewrap' | 'auto';

export interface DriverSelection {
	driver: ICommandExecutor;
	type: Exclude<DriverType, 'auto'>;
	/** true when the host driver was chosen as last-resort fallback */
	isUnsafeFallback: boolean;
}

function isDockerAvailable(): boolean {
	try {
		accessSync('/var/run/docker.sock', constants.R_OK | constants.W_OK);
		return true;
	} catch {
		return false;
	}
}

function isBwrapAvailable(): boolean {
	try {
		execSync('which bwrap', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

export function createDriver(driverType: DriverType = 'auto'): DriverSelection {
	const requested =
		driverType === 'auto'
			? ((process.env.N8N_SECURE_EXEC_DRIVER as DriverType | undefined) ?? 'auto')
			: driverType;

	switch (requested) {
		case 'docker':
			return { driver: new DockerDriver(), type: 'docker', isUnsafeFallback: false };
		case 'bubblewrap':
			return { driver: new BubblewrapDriver(), type: 'bubblewrap', isUnsafeFallback: false };
		case 'host':
			return { driver: new HostDriver(), type: 'host', isUnsafeFallback: false };
		case 'auto':
		default: {
			if (isDockerAvailable()) {
				return { driver: new DockerDriver(), type: 'docker', isUnsafeFallback: false };
			}
			if (process.platform === 'linux' && isBwrapAvailable()) {
				return { driver: new BubblewrapDriver(), type: 'bubblewrap', isUnsafeFallback: false };
			}
			return { driver: new HostDriver(), type: 'host', isUnsafeFallback: true };
		}
	}
}
