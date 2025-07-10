import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SeaTableTriggerV1 } from './v1/SeaTableTriggerV1.node';
import { SeaTableTriggerV2 } from './v2/SeaTableTriggerV2.node';

export class SeaTableTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'SeaTable Trigger',
			name: 'seaTableTrigger',
			icon: 'file:seaTable.svg',
			group: ['trigger'],
			defaultVersion: 2,
			description: 'Starts the workflow when SeaTable events occur',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SeaTableTriggerV1(baseDescription),
			2: new SeaTableTriggerV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
