import type { APIResponse } from '@playwright/test';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export interface InstalledCommunityPackage {
	packageName: string;
	installedVersion: string;
	installedNodes: Array<{ name: string; type: string; latestVersion: number }>;
	updateAvailable?: string;
	failedLoading?: boolean;
}

/** Body of the 400 the node API version guard returns. */
export interface NodesApiVersionRejection {
	message: string;
	meta: {
		requiredNodesApiVersion: number | string | null;
		supportedNodesApiVersion: number | string;
	};
}

/**
 * Installs run `npm pack` and `npm install` in the container and call
 * api.n8n.io for the package status, so they can outlast the default request
 * timeout on a slow network.
 */
const INSTALL_TIMEOUT_MS = 90_000;

export class CommunityPackagesApiHelper {
	constructor(private api: ApiHelpers) {}

	async list(): Promise<InstalledCommunityPackage[]> {
		const response = await this.api.request.get('/rest/community-packages');
		if (!response.ok()) {
			throw new TestError(`Failed to list community packages: ${await response.text()}`);
		}
		const result = await response.json();
		return result.data ?? result;
	}

	async find(packageName: string): Promise<InstalledCommunityPackage | undefined> {
		return (await this.list()).find((pkg) => pkg.packageName === packageName);
	}

	/**
	 * Installs by npm spec (`name` or `name@version`) through the unverified
	 * path, exactly what the settings page sends. Returns the raw response so
	 * a test can assert a rejection.
	 */
	async install(spec: string): Promise<APIResponse> {
		return await this.api.request.post('/rest/community-packages', {
			data: { name: spec },
			timeout: INSTALL_TIMEOUT_MS,
		});
	}

	async update(packageName: string, version?: string): Promise<APIResponse> {
		return await this.api.request.patch('/rest/community-packages', {
			data: { name: packageName, version },
			timeout: INSTALL_TIMEOUT_MS,
		});
	}

	async uninstall(packageName: string): Promise<void> {
		const response = await this.api.request.delete('/rest/community-packages', {
			params: { name: packageName },
		});
		if (!response.ok()) {
			throw new TestError(`Failed to uninstall ${packageName}: ${await response.text()}`);
		}
	}

	async uninstallAll(): Promise<void> {
		for (const pkg of await this.list()) {
			await this.uninstall(pkg.packageName);
		}
	}

	/** Names of every node type the instance currently serves. */
	async nodeTypeNames(): Promise<string[]> {
		const response = await this.api.request.get('/types/nodes.json');
		if (!response.ok()) {
			throw new TestError(`Failed to fetch node types: ${await response.text()}`);
		}
		const types = (await response.json()) as Array<{ name: string }>;
		return types.map((type) => type.name);
	}

	async readRejection(response: APIResponse): Promise<NodesApiVersionRejection> {
		return (await response.json()) as NodesApiVersionRejection;
	}
}
