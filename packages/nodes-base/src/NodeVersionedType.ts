import { INodeType, INodeTypeBaseDescription, INodeVersionedType, INodeVersions } from 'n8n-workflow';

export class NodeVersionedType implements INodeVersionedType {
	currentVersion: number;
	nodeVersions: INodeVersions;
	description: INodeTypeBaseDescription;

	constructor(nodeVersions: INodeVersions, description: INodeTypeBaseDescription) {
		this.nodeVersions = nodeVersions;
		this.currentVersion = description.defaultVersion ?? this.getLatestVersion();
		this.description = description;
	}

	getLatestVersion() {
		return Math.max(...Object.keys(this.nodeVersions).map(Number));
	}

	getNodeType(version?: number): INodeType {
		if (version) {
			return this.nodeVersions[version];
		} else {
			return this.nodeVersions[this.currentVersion];
		}
	}
}
