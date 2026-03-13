import { BubblewrapDriver } from './drivers/BubblewrapDriver';
import { CommandServiceDriver } from './drivers/CommandServiceDriver';
import { CommandServiceVolumeManager } from './drivers/CommandServiceVolumeManager';
import type { ICommandExecutor, IVolumeManager } from './drivers/ICommandExecutor';
import { LocalVolumeManager } from './drivers/LocalVolumeManager';

export type DriverType = 'bubblewrap' | 'command-service';

export interface DriverSelection {
	driver: ICommandExecutor;
	volumeManager: IVolumeManager;
	type: DriverType;
}

const SUPPORTED_DRIVERS: readonly DriverType[] = ['bubblewrap', 'command-service'];

export function createDriver(): DriverSelection {
	const requested = process.env.N8N_SECURE_EXEC_DRIVER;

	if (!requested || !SUPPORTED_DRIVERS.includes(requested as DriverType)) {
		throw new Error(
			`N8N_SECURE_EXEC_DRIVER must be set to one of: ${SUPPORTED_DRIVERS.join(', ')}. ` +
				`Got: ${requested ?? '(not set)'}`,
		);
	}

	switch (requested as DriverType) {
		case 'command-service': {
			const serviceUrl = process.env.N8N_SECURE_EXEC_COMMAND_SERVICE_URL;
			if (!serviceUrl) {
				throw new Error(
					'N8N_SECURE_EXEC_COMMAND_SERVICE_URL must be set when using the command-service driver',
				);
			}
			return {
				driver: new CommandServiceDriver(serviceUrl),
				volumeManager: new CommandServiceVolumeManager(serviceUrl),
				type: 'command-service',
			};
		}
		case 'bubblewrap':
			return {
				driver: new BubblewrapDriver(),
				volumeManager: new LocalVolumeManager(),
				type: 'bubblewrap',
			};
	}
}
