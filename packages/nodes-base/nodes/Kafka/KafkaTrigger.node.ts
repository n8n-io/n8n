import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { KafkaTriggerV1 } from './v1/KafkaTriggerV1.node';
import { KafkaTriggerV2 } from './v2/KafkaTriggerV2.node';

export class KafkaTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Kafka Trigger',
			name: 'kafkaTrigger',
			icon: { light: 'file:kafka.svg', dark: 'file:kafka.dark.svg' },
			group: ['trigger'],
			description: 'Consume messages from a Kafka topic',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new KafkaTriggerV1(baseDescription),
			1.1: new KafkaTriggerV1(baseDescription),
			2: new KafkaTriggerV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
