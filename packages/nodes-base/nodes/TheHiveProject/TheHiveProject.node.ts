import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { TheHiveProjectV1 } from './v1/TheHiveProjectV1.node';

export class TheHiveProject extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'TheHive 5',
			name: 'theHiveProject',
			icon: 'file:thehive.svg',
			group: ['transform'],
			description: 'Consume TheHive 5 API',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new TheHiveProjectV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
