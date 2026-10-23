import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { N8nV1 } from './v1/N8nV1.node';
import { N8nV2 } from './v2/N8nV2.node';

export class N8n extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'n8n',
			name: 'n8n',
			icon: 'node:n8n',
			group: ['transform'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Handle events and perform actions on your n8n instance',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new N8nV1(baseDescription),
			2: new N8nV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
