import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { TheHiveTriggerV1 } from './v1/TheHiveTriggerV1.node';

export class TheHiveTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'TheHive Trigger',
			name: 'theHiveTrigger',
			icon: 'file:thehive.svg',
			group: ['trigger'],
			description: 'Starts the workflow when TheHive events occur',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new TheHiveTriggerV1(baseDescription),
			2: new TheHiveTriggerV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
