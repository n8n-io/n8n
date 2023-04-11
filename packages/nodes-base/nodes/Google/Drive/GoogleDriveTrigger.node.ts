import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { GoogleDriveV1 } from './v1/GoogleDriveV1.node';

export class GoogleDriveTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Google Drive Trigger',
			name: 'googleDriveTrigger',
			icon: 'file:googleDrive.svg',
			group: ['trigger'],
			description: 'Starts the workflow when Google Drive events occur',
			subtitle: '={{$parameter["event"]}}',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new GoogleDriveV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
