import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { TheHiveV1 } from './v1/TheHiveV1.node';
import { TheHiveV2 } from './v2/TheHiveV2.node';

export class TheHive extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'TheHive',
			name: 'theHive',
			icon: 'file:thehive.svg',
			group: ['transform'],
			description: 'Consume TheHive API',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new TheHiveV1(baseDescription),
			2: new TheHiveV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
