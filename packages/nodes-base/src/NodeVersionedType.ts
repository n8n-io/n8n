import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';

export class NodeVersionedType implements IVersionedNodeType {
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
}
