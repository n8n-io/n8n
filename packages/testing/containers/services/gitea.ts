import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

const HOSTNAME = 'gitea';
const HTTP_PORT = 3000;
const SSH_PORT = 22;
const DEFAULT_ADMIN = 'giteaadmin';
const DEFAULT_PASSWORD = 'giteapassword';
const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_REPO = 'n8n-test-repo';
const DEFAULT_BRANCHES = ['development', 'staging', 'production'];

export interface GiteaMeta {
	apiUrl: string;
	adminUsername: string;
	adminPassword: string;
	defaultRepo: string;
}

export type GiteaResult = ServiceResult<GiteaMeta>;

export const gitea: Service<GiteaResult> = {
	description: 'Git server (Gitea)',

	async start(network: StartedNetwork, projectName: string): Promise<GiteaResult> {
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.gitea)
				.withNetwork(network)
				.withNetworkAliases(HOSTNAME)
				.withExposedPorts(HTTP_PORT, SSH_PORT)
				.withEnvironment({
					GITEA__database__DB_TYPE: 'sqlite3',
					GITEA__server__DOMAIN: HOSTNAME,
					GITEA__server__ROOT_URL: `http://${HOSTNAME}:${HTTP_PORT}/`,
					GITEA__server__SSH_DOMAIN: HOSTNAME,
					GITEA__security__INSTALL_LOCK: 'true',
					GITEA__security__SECRET_KEY: 'gitea-test-secret-key',
					GITEA__service__DISABLE_REGISTRATION: 'true',
				})
				.withWaitStrategy(Wait.forListeningPorts())
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': HOSTNAME,
				})
				.withName(`${projectName}-${HOSTNAME}`)
				.withReuse()
				.withLogConsumer(consumer)
				.start();

			// Setup admin user and default repo
			await addUser(container, DEFAULT_ADMIN, DEFAULT_PASSWORD, DEFAULT_EMAIL, true);
			await addRepo(container, DEFAULT_REPO, DEFAULT_ADMIN, DEFAULT_PASSWORD);

			// Create default branches
			for (const branch of DEFAULT_BRANCHES) {
				await addBranch(container, DEFAULT_REPO, branch, DEFAULT_ADMIN, DEFAULT_PASSWORD);
			}

			return {
				container,
				meta: {
					apiUrl: `http://${container.getHost()}:${container.getMappedPort(HTTP_PORT)}`,
					adminUsername: DEFAULT_ADMIN,
					adminPassword: DEFAULT_PASSWORD,
					defaultRepo: DEFAULT_REPO,
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},

	env(): Record<string, string> {
		return {
			N8N_SOURCECONTROL_HOST: `http://${HOSTNAME}:${HTTP_PORT}`,
		};
	},
};

async function addUser(
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

async function addRepo(
	container: StartedTestContainer,
	repoName: string,
	username: string,
	password: string,
): Promise<void> {
	await container.exec([
		'curl',
		'-X',
		'POST',
		`http://localhost:${HTTP_PORT}/api/v1/user/repos`,
		'-H',
		'Content-Type: application/json',
		'-u',
		`${username}:${password}`,
		'-d',
		`{"name":"${repoName}","private":false,"auto_init":true}`,
	]);
}

async function addBranch(
	container: StartedTestContainer,
	repoName: string,
	branchName: string,
	username: string,
	password: string,
	fromBranch = 'main',
): Promise<void> {
	await container.exec([
		'curl',
		'-X',
		'POST',
		`http://localhost:${HTTP_PORT}/api/v1/repos/${username}/${repoName}/branches`,
		'-H',
		'Content-Type: application/json',
		'-u',
		`${username}:${password}`,
		'-d',
		`{"new_branch_name":"${branchName}","old_branch_name":"${fromBranch}"}`,
	]);
}

export class GiteaHelper {
	private readonly container: StartedTestContainer;
	private readonly meta: GiteaMeta;

	constructor(container: StartedTestContainer, meta: GiteaMeta) {
		this.container = container;
		this.meta = meta;
	}

	get apiUrl(): string {
		return this.meta.apiUrl;
	}

	get adminUsername(): string {
		return this.meta.adminUsername;
	}

	get adminPassword(): string {
		return this.meta.adminPassword;
	}

	get defaultRepo(): string {
		return this.meta.defaultRepo;
	}

	async createUser(
		username: string,
		password: string,
		email: string,
		admin = false,
	): Promise<void> {
		await addUser(this.container, username, password, email, admin);
	}

	async createRepo(repoName: string, username?: string, password?: string): Promise<void> {
		await addRepo(
			this.container,
			repoName,
			username ?? this.meta.adminUsername,
			password ?? this.meta.adminPassword,
		);
	}

	async createBranch(
		repoName: string,
		branchName: string,
		username?: string,
		password?: string,
		fromBranch = 'main',
	): Promise<void> {
		await addBranch(
			this.container,
			repoName,
			branchName,
			username ?? this.meta.adminUsername,
			password ?? this.meta.adminPassword,
			fromBranch,
		);
	}

	async addSSHKey(
		keyTitle: string,
		publicKey: string,
		username?: string,
		password?: string,
	): Promise<void> {
		await this.container.exec([
			'curl',
			'-X',
			'POST',
			`http://localhost:${HTTP_PORT}/api/v1/user/keys`,
			'-H',
			'Content-Type: application/json',
			'-u',
			`${username ?? this.meta.adminUsername}:${password ?? this.meta.adminPassword}`,
			'-d',
			`{"title":"${keyTitle}","key":"${publicKey}","read_only":false}`,
		]);
	}
}

export function createGiteaHelper(ctx: HelperContext): GiteaHelper {
	const result = ctx.serviceResults.gitea as GiteaResult | undefined;
	if (!result) {
		throw new Error('Gitea service not found in context');
	}
	return new GiteaHelper(result.container, result.meta);
}

declare module './types' {
	interface ServiceHelpers {
		gitea: GiteaHelper;
	}
}
