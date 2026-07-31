import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { KafkaV1 } from './v1/KafkaV1.node';

export class Kafka extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Kafka',
			name: 'kafka',
			icon: { light: 'file:kafka.svg', dark: 'file:kafka.dark.svg' },
			group: ['transform'],
			defaultVersion: 1,
			description: 'Sends messages to a Kafka topic',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new KafkaV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
