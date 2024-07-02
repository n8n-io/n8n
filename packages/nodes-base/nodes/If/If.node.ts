import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { IfV1 } from './V1/IfV1.node';
import { IfV2 } from './V2/IfV2.node';

export class If extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'If',
			name: 'if',
			icon: 'fa:map-signs',
			iconColor: 'green',
			group: ['transform'],
			description: 'Route items to different branches (true/false)',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new IfV1(baseDescription),
			2: new IfV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
