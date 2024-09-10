import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SlackV1 } from './V1/SlackV1.node';

import { SlackV2 } from './V2/SlackV2.node';

export class Slack extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Slack',
			name: 'slack',
			icon: 'file:slack.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Slack API',
			defaultVersion: 2.2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SlackV1(baseDescription),
			2: new SlackV2(baseDescription),
			2.1: new SlackV2(baseDescription),
			2.2: new SlackV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
