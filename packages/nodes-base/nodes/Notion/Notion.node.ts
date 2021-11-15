import {
	INodeTypeBaseDescription,
	INodeVersionedType,
} from 'n8n-workflow';

import { 
	NotionV1,
} from './v1/NotionV1.node';

import {
	NodeVersionedType,
} from '../../src/NodeVersionedType';

export class Notion extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Notion (Beta)',
			name: 'notion',
			icon: 'file:notion.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Notion API (Beta)',
			defaultVersion: 1,
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new NotionV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}