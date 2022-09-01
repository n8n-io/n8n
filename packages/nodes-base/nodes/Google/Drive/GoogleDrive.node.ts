import { INodeTypeBaseDescription, INodeVersionedType } from 'n8n-workflow';

import { GoogleDriveV1 } from './v1/GoogleDriveV1.node';

import { GoogleDriveV3 } from './v3/GoogleDriveV3.node';

import { NodeVersionedType } from '../../../src/NodeVersionedType';

export class GoogleDrive extends NodeVersionedType {
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

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			// The V1 node is actually both V1 and V2
			1: new GoogleDriveV1(baseDescription),
			2: new GoogleDriveV1(baseDescription),
			3: new GoogleDriveV3(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
