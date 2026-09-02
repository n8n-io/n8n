import { UserError } from './base/user.error';

/**
 * Thrown when a node type is resolved at a `typeVersion` that does not exist in
 * its `nodeVersions` map. Carries the available versions so callers (e.g. the
 * MCP workflow tools) can surface an actionable, self-correctable message.
 */
export class NodeVersionNotFoundError extends UserError {
	readonly nodeType: string;

	readonly version: number;

	readonly availableVersions: number[];

	/** Highest available version, or `undefined` when none are registered. */
	readonly latestVersion?: number;

	constructor(nodeType: string, version: number, availableVersions: number[]) {
		const latestVersion = availableVersions.length ? Math.max(...availableVersions) : undefined;
		super(
			`Node type "${nodeType}" is not available in version ${version}. Available versions: ${availableVersions.join(', ')}` +
				(latestVersion !== undefined ? `. Use the latest version ${latestVersion}.` : ''),
		);
		this.nodeType = nodeType;
		this.version = version;
		this.availableVersions = availableVersions;
		this.latestVersion = latestVersion;
	}
}
