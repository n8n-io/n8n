import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { RetellAiV1 } from './V1/RetellAiV1.node';

export class RetellAi extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Retell AI',
			name: 'retellAi',
			icon: 'file:retellai.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Interact with Retell AI for voice calls, agents, phone numbers, chat, knowledge bases, LLMs, and more',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new RetellAiV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
