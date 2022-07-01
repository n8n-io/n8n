import type { INodeType, INodeTypeBaseDescription, INodeVersionedType } from './Interfaces';

export class NodeVersionedType implements INodeVersionedType {
	currentVersion: number;

	nodeVersions: INodeVersionedType['nodeVersions'];

	description: INodeTypeBaseDescription;

	constructor(
		nodeVersions: INodeVersionedType['nodeVersions'],
		description: INodeTypeBaseDescription,
	) {
		this.nodeVersions = nodeVersions;
		this.currentVersion = description.defaultVersion ?? this.getLatestVersion();
		this.description = description;
	}

	getLatestVersion(): number {
		return Math.max(...Object.keys(this.nodeVersions).map(Number));
	}

	getNodeType(version?: number): INodeType {
		if (version) {
			return this.nodeVersions[version];
		}
		return this.nodeVersions[this.currentVersion];
	}
}
