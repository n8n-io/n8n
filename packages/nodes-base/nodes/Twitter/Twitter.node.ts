import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { TwitterV1 } from './V1/TwitterV1.node';

import { TwitterV2 } from './V2/TwitterV2.node';

export class Twitter extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Twitter',
			name: 'twitter',
			icon: 'file:twitter.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Twitter API',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new TwitterV1(baseDescription),
			2: new TwitterV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
