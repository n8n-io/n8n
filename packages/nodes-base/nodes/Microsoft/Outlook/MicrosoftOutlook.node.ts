import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { MicrosoftOutlookV1 } from './v1/MicrosoftOutlookV1.node';
import { MicrosoftOutlookV2 } from './v2/MicrosoftOutlookV2.node';

export class MicrosoftOutlook extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Microsoft Outlook',
			name: 'microsoftOutlook',
			group: ['transform'],
			icon: 'file:outlook.svg',
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Microsoft Outlook API',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new MicrosoftOutlookV1(baseDescription),
			2: new MicrosoftOutlookV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
