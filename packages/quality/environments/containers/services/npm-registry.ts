import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

const asyncExecFile = promisify(execFile);

// npm ships as a .cmd shim on Windows, which only a shell can launch.
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NPM_EXEC_OPTIONS = { shell: process.platform === 'win32' };

const HOSTNAME = 'npm-registry';
const PORT = 4873;

/**
 * Offline Verdaccio: no uplink, so nothing is proxied from npmjs.org. Every
 * package a test installs has to be published into it first, which is the
 * point: tests control exactly which package versions exist.
 */
const VERDACCIO_CONFIG = `
storage: /verdaccio/storage/data
listen: 0.0.0.0:${PORT}
auth:
  htpasswd:
    file: /verdaccio/storage/htpasswd
    max_users: 100
packages:
  '**':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
log: { type: stdout, format: pretty, level: warn }
`;

export interface NpmRegistryMeta {
	/** URL n8n containers use (Docker network alias). */
	internalUrl: string;
	/** URL the test process uses (host-mapped port). */
	externalUrl: string;
}

export type NpmRegistryResult = ServiceResult<NpmRegistryMeta>;

export const npmRegistry: Service<NpmRegistryResult> = {
	description: 'npm registry (Verdaccio)',

	async start(network: StartedNetwork, projectName: string): Promise<NpmRegistryResult> {
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.verdaccio)
				.withNetwork(network)
				.withNetworkAliases(HOSTNAME)
				.withExposedPorts(PORT)
				.withCopyContentToContainer([
					{ content: VERDACCIO_CONFIG, target: '/verdaccio/conf/config.yaml' },
				])
				.withWaitStrategy(
					Wait.forHttp('/-/ping', PORT).forStatusCode(200).withStartupTimeout(60_000),
				)
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': HOSTNAME,
				})
				.withName(`${projectName}-${HOSTNAME}`)
				.withLogConsumer(consumer)
				.start();

			return {
				container,
				meta: {
					internalUrl: `http://${HOSTNAME}:${PORT}`,
					externalUrl: `http://${container.getHost()}:${container.getMappedPort(PORT)}`,
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},

	env(result: NpmRegistryResult, external?: boolean): Record<string, string> {
		const url = external ? result.meta.externalUrl : result.meta.internalUrl;
		return {
			N8N_COMMUNITY_PACKAGES_REGISTRY: url,
			NPM_CONFIG_REGISTRY: url,
		};
	},
};

export interface PublishedPackage {
	name: string;
	version: string;
}

export class NpmRegistryHelper {
	private token: Promise<string> | undefined;

	constructor(private readonly meta: NpmRegistryMeta) {}

	/** Registry URL as seen from n8n containers. */
	get internalUrl(): string {
		return this.meta.internalUrl;
	}

	/** Registry URL as seen from the test process. */
	get externalUrl(): string {
		return this.meta.externalUrl;
	}

	/**
	 * Publishes a package directory with `npm publish`. Each call publishes one
	 * version; publish the same name again for another version. The newest
	 * publish becomes the `latest` dist-tag, like npm does.
	 */
	async publishDirectory(directory: string): Promise<PublishedPackage> {
		const { name, version } = JSON.parse(
			await readFile(join(directory, 'package.json'), 'utf8'),
		) as PublishedPackage;

		// The token goes through a throwaway npmrc, not argv: a failing npm
		// command quotes its arguments in the error message.
		const configDir = await mkdtemp(join(tmpdir(), 'npm-registry-auth-'));
		const userconfig = join(configDir, '.npmrc');
		try {
			await writeFile(
				userconfig,
				`//${new URL(this.meta.externalUrl).host}/:_authToken=${await this.getToken()}\n`,
			);
			await asyncExecFile(
				NPM,
				[
					'publish',
					directory,
					`--registry=${this.meta.externalUrl}`,
					`--userconfig=${userconfig}`,
					'--ignore-scripts',
					'--quiet',
				],
				NPM_EXEC_OPTIONS,
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(
				`npm registry: publishing ${name}@${version} failed: ${message.replace(/_authToken=\S+/g, '_authToken=*****')}`,
			);
		} finally {
			await rm(configDir, { recursive: true, force: true });
		}
		return { name, version };
	}

	private async getToken(): Promise<string> {
		this.token ??= this.createUser();
		return await this.token;
	}

	/**
	 * npm refuses to publish without a token, and Verdaccio only hands one out
	 * to a user. This is what `npm adduser` sends, minus the prompts.
	 */
	private async createUser(): Promise<string> {
		const username = `e2e-${randomUUID()}`;
		const response = await fetch(
			`${this.meta.externalUrl}/-/user/org.couchdb.user:${encodeURIComponent(username)}`,
			{
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: username,
					password: randomUUID(),
					email: `${username}@n8n.local`,
					type: 'user',
					roles: [],
					date: new Date().toISOString(),
				}),
			},
		);
		if (!response.ok) {
			throw new Error(
				`npm registry: creating a publish user failed: ${response.status} ${await response.text()}`,
			);
		}
		const { token } = (await response.json()) as { token?: string };
		if (!token) throw new Error('npm registry: adduser response carried no token');
		return token;
	}
}

export function createNpmRegistryHelper(ctx: HelperContext): NpmRegistryHelper {
	const result = ctx.serviceResults.npmRegistry as NpmRegistryResult | undefined;
	if (!result) {
		throw new Error('npm registry not running. Add services: ["npmRegistry"] to test.use()');
	}
	return new NpmRegistryHelper(result.meta);
}

declare module './types' {
	interface ServiceHelpers {
		npmRegistry: NpmRegistryHelper;
	}
}
