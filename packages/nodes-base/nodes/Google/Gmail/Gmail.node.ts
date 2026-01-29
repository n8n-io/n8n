import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { GmailV1 } from './v1/GmailV1.node';
import { GmailV2 } from './v2/GmailV2.node';

export class Gmail extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Gmail',
			name: 'gmail',
			icon: 'file:gmail.svg',
			group: ['transform'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume the Gmail API',
			defaultVersion: 2.2,
			builderHint: {
				message:
					'To fetch emails on a schedule, prefer n8n-nodes-base.gmailTrigger instead of combining scheduleTrigger with Gmail getAll operation.',
				relatedNodes: ['n8n-nodes-base.gmailTrigger'],
			},
			schemaPath: 'Google/Gmail',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new GmailV1(baseDescription),
			2: new GmailV2(baseDescription),
			2.1: new GmailV2(baseDescription),
			2.2: new GmailV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
