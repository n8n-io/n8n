import { INodeType, INodeTypeBaseDescription, INodeVersionedType, INodeVersions } from 'n8n-workflow';

export class NodeVersionedType implements INodeVersionedType {
	defaultVersion: number;
	nodeVersions: INodeVersions;
	description: INodeTypeBaseDescription;

	constructor(nodeVersions: INodeVersions, description: INodeTypeBaseDescription, defaultVersion?: number) {
		this.nodeVersions = nodeVersions;
		this.defaultVersion = defaultVersion || Math.max(...Object.keys(nodeVersions).map(k => parseInt(k, 10)));
		this.description = description;
	}

	getNodeType(version?: number): INodeType {
		if (version) {
			return this.nodeVersions[version];
		} else {
			return this.nodeVersions[this.defaultVersion];
		}
	}
}