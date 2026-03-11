import { SandboxManager } from '@anthropic-ai/sandbox-runtime';
import { execSync } from 'child_process';
import { accessSync, constants } from 'fs';

import { BubblewrapDriver } from './drivers/BubblewrapDriver';
import { CommandServiceDriver } from './drivers/CommandServiceDriver';
import { DockerDriver } from './drivers/DockerDriver';
import { HostDriver } from './drivers/HostDriver';
import type { ICommandExecutor, IVolumeManager } from './drivers/ICommandExecutor';
import { SandboxRuntimeDriver } from './drivers/SandboxRuntimeDriver';

export type DriverType =
	| 'host'
	| 'docker'
	| 'bubblewrap'
	| 'sandbox-runtime'
	| 'command-service'
	| 'auto';

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

function isSandboxRuntimeAvailable(): boolean {
	if (process.platform !== 'linux' && process.platform !== 'darwin') {
		return false;
	}
	const { errors } = SandboxManager.checkDependencies();
	return errors.length === 0;
}

export function createDriver(driverType: DriverType = 'auto'): DriverSelection {
	const requested =
		driverType === 'auto'
			? ((process.env.N8N_SECURE_EXEC_DRIVER as DriverType | undefined) ?? 'auto')
			: driverType;

	switch (requested) {
		case 'command-service': {
			const serviceUrl = process.env.N8N_SECURE_EXEC_COMMAND_SERVICE_URL;
			if (!serviceUrl) {
				throw new Error(
					'N8N_SECURE_EXEC_COMMAND_SERVICE_URL must be set when using the command-service driver',
				);
			}
			return {
				driver: new CommandServiceDriver(serviceUrl),
				type: 'command-service',
				isUnsafeFallback: false,
			};
		}
		case 'docker':
			return { driver: new DockerDriver(), type: 'docker', isUnsafeFallback: false };
		case 'bubblewrap':
			return { driver: new BubblewrapDriver(), type: 'bubblewrap', isUnsafeFallback: false };
		case 'sandbox-runtime':
			return {
				driver: new SandboxRuntimeDriver(),
				type: 'sandbox-runtime',
				isUnsafeFallback: false,
			};
		case 'host':
			return { driver: new HostDriver(), type: 'host', isUnsafeFallback: false };
		case 'auto':
		default: {
			// command-service is never auto-detected — must be explicitly configured
			if (isDockerAvailable()) {
				return { driver: new DockerDriver(), type: 'docker', isUnsafeFallback: false };
			}
			if (isSandboxRuntimeAvailable()) {
				return {
					driver: new SandboxRuntimeDriver(),
					type: 'sandbox-runtime',
					isUnsafeFallback: false,
				};
			}
			if (process.platform === 'linux' && isBwrapAvailable()) {
				return { driver: new BubblewrapDriver(), type: 'bubblewrap', isUnsafeFallback: false };
			}
			return { driver: new HostDriver(), type: 'host', isUnsafeFallback: true };
		}
	}
}

/**
 * Type guard to check whether a driver supports volume management.
 * Only the CommandServiceDriver implements IVolumeManager.
 */
export function isVolumeManager(
	driver: ICommandExecutor,
): driver is ICommandExecutor & IVolumeManager {
	return 'createVolume' in driver && 'listVolumes' in driver && 'deleteVolume' in driver;
}
