import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { MicrosoftSharePointV1 } from './v1/MicrosoftSharePointV1.node';
import { MicrosoftSharePointV2 } from './v2/MicrosoftSharePointV2.node';

export class MicrosoftSharePoint extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Microsoft SharePoint',
			name: 'microsoftSharePoint',
			icon: {
				light: 'file:microsoftSharePoint.svg',
				dark: 'file:microsoftSharePoint.svg',
			},
			group: ['transform'],
			description: 'Interact with Microsoft SharePoint API',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new MicrosoftSharePointV1(baseDescription),
		};

		// v2 is under construction (ENT-170). The editor and AI builder surface
		// the highest registered version regardless of defaultVersion, so v2
		// stays out of the version map until launch; set
		// N8N_MICROSOFT_SHAREPOINT_V2=true to work on it locally.
		if (process.env.N8N_MICROSOFT_SHAREPOINT_V2 === 'true') {
			nodeVersions[2] = new MicrosoftSharePointV2(baseDescription);
		}

		super(nodeVersions, baseDescription);
	}
}
