import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from './n8n-test-container-utils';

// Default credentials - always used for the initial admin user
const DEFAULT_ADMIN = 'giteaadmin';
const DEFAULT_PASSWORD = 'giteapassword';
const DEFAULT_REPO = 'n8n-test-repo';
const DEFAULT_EMAIL = 'admin@example.com';

/**
 * Setup Gitea container with default admin user (giteaadmin/giteapassword) and test repository
 */
export async function setupGitea({
	giteaImage = 'gitea/gitea:1.24.6',
	projectName,
	network,
}: {
	giteaImage?: string;
	projectName: string;
	network: StartedNetwork;
}): Promise<StartedTestContainer> {
	const { consumer, throwWithLogs } = createSilentLogConsumer();

	try {
		const container = await new GenericContainer(giteaImage)
			.withNetwork(network)
			.withNetworkAliases('gitea')
			.withExposedPorts(3000, 22)
			.withEnvironment({
				GITEA__database__DB_TYPE: 'sqlite3',
				GITEA__server__DOMAIN: 'gitea',
				GITEA__server__ROOT_URL: 'http://gitea:3000/',
				GITEA__server__SSH_DOMAIN: 'gitea',
				GITEA__security__INSTALL_LOCK: 'true',
				GITEA__security__SECRET_KEY: 'gitea-test-secret-key',
				GITEA__service__DISABLE_REGISTRATION: 'true',
			})
			.withWaitStrategy(Wait.forListeningPorts())
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'gitea',
			})
			.withName(`${projectName}-gitea`)
			.withReuse()
			.withLogConsumer(consumer)
			.start();

		await addGiteaUser(container, DEFAULT_ADMIN, DEFAULT_PASSWORD, DEFAULT_EMAIL, true);
		await addGiteaRepo(container, DEFAULT_REPO, DEFAULT_ADMIN, DEFAULT_PASSWORD);

		return container;
	} catch (error) {
		return throwWithLogs(error);
	}
}

/**
 * Add a user to Gitea
 */
export async function addGiteaUser(
	container: StartedTestContainer,
	username: string,
	password: string,
	email: string,
	admin = false,
): Promise<void> {
	const adminFlag = admin ? '--admin' : '';
	await container.exec([
		'bash',
		'-c',
		`cd /data/gitea && su git -c "/usr/local/bin/gitea admin user create --config /data/gitea/conf/app.ini --username ${username} --password ${password} --email ${email} ${adminFlag} --must-change-password=false"`,
	]);
}

/**
 * Add a repository to Gitea
 */
export async function addGiteaRepo(
	container: StartedTestContainer,
	repoName: string,
	username = DEFAULT_ADMIN,
	password = DEFAULT_PASSWORD,
): Promise<void> {
	await container.exec([
		'curl',
		'-X',
		'POST',
		'http://localhost:3000/api/v1/user/repos',
		'-H',
		'Content-Type: application/json',
		'-u',
		`${username}:${password}`,
		'-d',
		`{"name":"${repoName}","private":false,"auto_init":true}`,
	]);
}
