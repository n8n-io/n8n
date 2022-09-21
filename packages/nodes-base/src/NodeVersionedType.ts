import type { INodeTypeBaseDescription, INodeVersionedType } from 'n8n-workflow';

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

	getLatestVersion() {
		return Math.max(...Object.keys(this.nodeVersions).map(Number));
	}
}
