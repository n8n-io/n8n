import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { LinearTriggerV1 } from './v1/LinearTriggerV1.node';
import { LinearTriggerV2 } from './v2/LinearTriggerV2.node';

export class LinearTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Linear Trigger',
			name: 'linearTrigger',
			icon: 'file:linear.svg',
			group: ['trigger'],
			description: 'Starts the workflow when Linear events occur',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new LinearTriggerV1(baseDescription),
			2: new LinearTriggerV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
