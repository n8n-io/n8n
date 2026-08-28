import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { LinearV1 } from './v1/LinearV1.node';
import { LinearV2 } from './v2/LinearV2.node';

export class Linear extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Linear',
			name: 'linear',
			icon: 'file:linear.svg',
			group: ['output'],
			description: 'Consume Linear API',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new LinearV1(baseDescription),
			1.1: new LinearV1(baseDescription),
			2: new LinearV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
