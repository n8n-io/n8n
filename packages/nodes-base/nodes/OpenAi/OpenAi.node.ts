import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { OpenAiV1 } from './v1/OpenAiV1.node';
import { OpenAiV2 } from './v2/OpenAiV2.node';

export class OpenAi extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'OpenAI',
			name: 'openAi',
			icon: 'file:openAi.svg',
			group: ['transform'],
			description: 'Consume Open AI',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new OpenAiV1(baseDescription),
			2: new OpenAiV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
