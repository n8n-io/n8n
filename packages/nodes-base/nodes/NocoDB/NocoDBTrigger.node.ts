import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { NocoDBTriggerV1 } from './triggerV1/NocoDBTriggerV1.node';

export class NocoDBTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'NocoDB Trigger',
			name: 'nocodbTrigger',
			icon: 'file:nocodb.svg',
			group: ['trigger'],
			subtitle: '={{$parameter["event"]}}',
			description: 'Starts the workflow when NocoDB events occur',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new NocoDBTriggerV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
