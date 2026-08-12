import { NodeVersionNotFoundError } from './errors';
import type { INodeTypeBaseDescription, IVersionedNodeType, INodeType } from './interfaces';

export class VersionedNodeType implements IVersionedNodeType {
	currentVersion: number;

	nodeVersions: IVersionedNodeType['nodeVersions'];

	description: INodeTypeBaseDescription;

	constructor(
		nodeVersions: IVersionedNodeType['nodeVersions'],
		description: INodeTypeBaseDescription,
	) {
		this.nodeVersions = nodeVersions;
		this.currentVersion = description.defaultVersion ?? this.getLatestVersion();
		this.description = description;
	}

	getLatestVersion() {
		return Math.max(...Object.keys(this.nodeVersions).map(Number));
	}

	getNodeType(version?: number): INodeType {
		const resolvedVersion = version ? version : this.currentVersion;
		const nodeType = this.nodeVersions[resolvedVersion];
		if (nodeType === undefined) {
			throw new NodeVersionNotFoundError(
				this.description.name,
				resolvedVersion,
				Object.keys(this.nodeVersions).map(Number),
			);
		}
		return nodeType;
	}
}
