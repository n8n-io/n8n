import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { LinearTriggerV1 } from './v1/LinearTriggerV1.node';

export class LinearTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Linear Trigger',
			name: 'linearTrigger',
			icon: 'file:linear.svg',
			group: ['trigger'],
			description: 'Starts the workflow when Linear events occur',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new LinearTriggerV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
