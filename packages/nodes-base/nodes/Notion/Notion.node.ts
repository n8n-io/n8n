import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { NotionV1 } from './v1/NotionV1.node';
import { NotionV2 } from './v2/NotionV2.node';

export class Notion extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Notion',
			name: 'notion',
			icon: { light: 'file:notion.svg', dark: 'file:notion.dark.svg' },
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Notion API',
			defaultVersion: 2.2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new NotionV1(baseDescription),
			2: new NotionV2(baseDescription),
			2.1: new NotionV2(baseDescription),
			2.2: new NotionV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
