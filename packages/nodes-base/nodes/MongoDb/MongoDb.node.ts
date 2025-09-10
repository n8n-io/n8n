import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { MongoDbV1 } from './V1/MongoDbV1.node';
import { MongoDbV2 } from './V2/MongoDbV2.node';

export class MongoDb extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'MongoDB',
			name: 'mongoDb',
			icon: 'file:mongodb.svg',
			group: ['input'],
			description: 'Find, insert and update documents in MongoDB',
			usableAsTool: true,
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new MongoDbV1(baseDescription),
			1.1: new MongoDbV1(baseDescription),
			1.2: new MongoDbV1(baseDescription),
			2: new MongoDbV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
