import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import type { StartedNetwork } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult } from './types';

const HOSTNAME = 'mysql';

export interface MySqlMeta {
	database: string;
	username: string;
	password: string;
	port: number;
	internalHost: string;
	externalHost: string;
	externalPort: number;
}

export type MySqlResult = ServiceResult<MySqlMeta> & {
	container: StartedMySqlContainer;
};

export const mysqlService: Service<MySqlResult> = {
	description: 'MySQL database for integration testing',

	async start(network: StartedNetwork, projectName: string): Promise<MySqlResult> {
		const container = await new MySqlContainer(TEST_CONTAINER_IMAGES.mysql)
			.withNetwork(network)
			.withNetworkAliases(HOSTNAME)
			.withDatabase('n8n_test')
			.withUsername('n8n_user')
			.withRootPassword('root_password')
			.withUserPassword('test_password')
			.withStartupTimeout(60_000)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': HOSTNAME,
			})
			.withName(`${projectName}-${HOSTNAME}`)
			.withReuse()
			.start();

		return {
			container,
			meta: {
				database: container.getDatabase(),
				username: container.getUsername(),
				password: container.getUserPassword(),
				port: 3306,
				internalHost: HOSTNAME,
				externalHost: container.getHost(),
				externalPort: container.getPort(),
			},
		};
	},

	env(): Record<string, string> {
		return {};
	},
};
