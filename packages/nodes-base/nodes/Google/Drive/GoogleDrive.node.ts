import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { GoogleDriveV1 } from './v1/GoogleDriveV1.node';
import { GoogleDriveV2 } from './v2/GoogleDriveV2.node';

export class GoogleDrive extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Google Drive',
			name: 'googleDrive',
			icon: 'file:googleDrive.svg',
			group: ['input'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Access data on Google Drive',
			defaultVersion: 3,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new GoogleDriveV1(baseDescription),
			2: new GoogleDriveV1(baseDescription),
			3: new GoogleDriveV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
